-- Operator admin (gb-admin.kfir.app): per-type settings, import keys, and system-admin-only RPCs.
-- Everything is additive: the mobile app and hapoel-toto keep working unchanged.

alter table public.toto_types
  add column games_count int check (games_count between 1 and 30),
  add column timezone text not null default 'Asia/Jerusalem',
  add column adapter text,
  add column is_active boolean not null default true;

update public.toto_types set games_count = 16, adapter = 'winner' where code = 'TOTO16';

alter table public.columns
  add column source text,
  add column external_id text,
  add constraint columns_type_external_id_key unique (toto_type_id, external_id);

create index if not exists user_bets_updated_at_idx on public.user_bets (updated_at);
create index if not exists profiles_created_at_idx on public.profiles (created_at);

-- ───────────────────────── admin RPCs ─────────────────────────
-- security definer so they see past RLS; each one refuses non-admins first.

create function public.require_system_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_system_admin() then
    raise exception 'system admin only' using errcode = '42501';
  end if;
end $$;

-- All dashboard numbers in one round trip. Activity = placing or editing a bet.
create function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  perform require_system_admin();
  with
  firsts as (select user_id, date_trunc('week', min(updated_at)) wk from user_bets group by 1),
  weeks as (select distinct user_id, date_trunc('week', updated_at) wk from user_bets),
  cohorts as (
    select f.wk, count(*) size,
      count(*) filter (where exists (select 1 from weeks w where w.user_id = f.user_id and w.wk = f.wk + interval '1 week')) w1,
      count(*) filter (where exists (select 1 from weeks w where w.user_id = f.user_id and w.wk = f.wk + interval '2 weeks')) w2,
      count(*) filter (where exists (select 1 from weeks w where w.user_id = f.user_id and w.wk = f.wk + interval '4 weeks')) w4
    from firsts f where f.wk > now() - interval '12 weeks' group by 1),
  sizes as (select g.id, count(m.user_id) n from groups g
            left join group_members m on m.group_id = g.id and m.status = 'active' group by 1),
  recent as (
    select c.id, c.name, c.deadline, t.code, c.is_active,
      (select count(*) from user_bets b where b.column_id = c.id) bets
    from columns c left join toto_types t on t.id = c.toto_type_id
    order by c.deadline desc limit 12)
  select jsonb_build_object(
    'users', (select count(*) from profiles),
    'users_7d', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'users_30d', (select count(*) from profiles where created_at > now() - interval '30 days'),
    'wau', (select count(distinct user_id) from user_bets where updated_at > now() - interval '7 days'),
    'mau', (select count(distinct user_id) from user_bets where updated_at > now() - interval '30 days'),
    'groups', (select count(*) from groups),
    'groups_active', (select count(distinct m.group_id) from group_members m join user_bets b using (user_id)
                      where m.status = 'active' and b.updated_at > now() - interval '14 days'),
    'group_sizes', (select coalesce(jsonb_object_agg(n, c), '{}') from (select n, count(*) c from sizes group by n) s),
    'bets', (select count(*) from user_bets),
    'recent_columns', (select coalesce(jsonb_agg(r order by r.deadline desc), '[]') from recent r),
    'by_type', (select coalesce(jsonb_agg(x), '[]') from (
        select t.code, t.country, count(distinct b.user_id) users, count(b.*) bets
        from toto_types t left join columns c on c.toto_type_id = t.id left join user_bets b on b.column_id = c.id
        group by t.code, t.country) x),
    'retention', (select coalesce(jsonb_agg(c order by c.wk desc), '[]') from cohorts c),
    'alerts', jsonb_build_object(
      'missing_results', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)), '[]')
        from columns c where c.is_active and exists (
          select 1 from jsonb_array_elements(c.games) g
          where g->>'result' is null and (g->>'game_time')::timestamptz < now() - interval '3 hours')),
      'types_without_open_column', (select coalesce(jsonb_agg(t.code), '[]') from toto_types t
        where t.is_active and not exists (select 1 from columns c where c.toto_type_id = t.id and c.is_active and c.deadline > now())))
  ) into v;
  return v;
end $$;

-- Bets per column (RLS hides other people's bets from the admin's own queries).
create function public.admin_column_bets() returns table (column_id uuid, bets int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_system_admin();
  return query select b.column_id, count(*)::int from user_bets b group by 1;
end $$;

create function public.admin_groups(p_q text default '')
returns table (id uuid, name text, join_code text, is_open boolean, created_at timestamptz,
               creator text, members int, pending int, types text[])
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_system_admin();
  return query
  select g.id, g.name, g.join_code, g.is_open, g.created_at, p.name,
    (select count(*)::int from group_members m where m.group_id = g.id and m.status = 'active'),
    (select count(*)::int from group_members m where m.group_id = g.id and m.status = 'pending'),
    array(select t.code from group_types gt join toto_types t on t.id = gt.toto_type_id where gt.group_id = g.id)
  from groups g left join profiles p on p.id = g.created_by
  where coalesce(p_q, '') = '' or g.name ilike '%' || p_q || '%' or g.join_code = upper(trim(p_q))
  order by g.created_at desc limit 200;
end $$;

create function public.admin_delete_group(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_system_admin();
  delete from groups where id = p_id;
  if not found then raise exception 'group not found' using errcode = 'P0002'; end if;
end $$;

create function public.admin_users(p_q text default '')
returns table (id uuid, name text, email text, avatar_url text, is_system_admin boolean, created_at timestamptz,
               last_bet_at timestamptz, bets int, groups text[])
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_system_admin();
  return query
  select p.id, p.name, u.email::text, p.avatar_url, p.is_system_admin, p.created_at,
    (select max(b.updated_at) from user_bets b where b.user_id = p.id),
    (select count(*)::int from user_bets b where b.user_id = p.id),
    array(select g.name from group_members m join groups g on g.id = m.group_id where m.user_id = p.id and m.status = 'active')
  from profiles p join auth.users u on u.id = p.id
  where coalesce(p_q, '') = '' or p.name ilike '%' || p_q || '%' or u.email ilike '%' || p_q || '%'
  order by p.created_at desc limit 200;
end $$;

create function public.admin_delete_user(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_system_admin();
  if p_id = auth.uid() then raise exception 'can''t delete yourself here' using errcode = '22023'; end if;
  delete from auth.users where id = p_id;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
end $$;

create function public.admin_set_system_admin(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_system_admin();
  if p_id = auth.uid() and not p_on then raise exception 'can''t remove your own admin' using errcode = '22023'; end if;
  update profiles set is_system_admin = p_on where id = p_id;
end $$;

revoke execute on function public.require_system_admin(), public.admin_stats(), public.admin_column_bets(),
  public.admin_groups(text), public.admin_delete_group(uuid), public.admin_users(text),
  public.admin_delete_user(uuid), public.admin_set_system_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_stats(), public.admin_column_bets(), public.admin_groups(text),
  public.admin_delete_group(uuid), public.admin_users(text), public.admin_delete_user(uuid),
  public.admin_set_system_admin(uuid, boolean) to authenticated;
