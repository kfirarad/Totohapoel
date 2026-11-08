-- טוטו חברים: initial schema. Contract: mobile/src/lib/queries.ts + mobile/src/core/types.ts.

-- ───────────────────────── tables ─────────────────────────

create table public.toto_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_he text not null,
  name_en text not null,
  country text not null default 'IL',
  default_max_doubles int not null default 0,
  default_max_triples int not null default 0
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  avatar_url text,
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  is_open boolean not null default true,
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  avatar_url text,
  locale text not null default 'he' check (locale in ('he', 'en')),
  last_group_id uuid references public.groups on delete set null,
  is_system_admin boolean not null default false,
  notify jsonb not null default '{"deadline": true, "results": true, "join_requests": true}',
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);

create table public.group_types (
  group_id uuid not null references public.groups on delete cascade,
  toto_type_id uuid not null references public.toto_types on delete cascade,
  primary key (group_id, toto_type_id)
);

create table public.columns (
  id uuid primary key default gen_random_uuid(),
  toto_type_id uuid references public.toto_types on delete cascade,
  group_id uuid references public.groups on delete cascade,
  name text not null,
  deadline timestamptz not null,
  is_active boolean not null default true,
  max_doubles int not null default 0 check (max_doubles >= 0),
  max_triples int not null default 0 check (max_triples >= 0),
  games jsonb not null default '[]' check (jsonb_typeof(games) = 'array'),
  created_at timestamptz not null default now(),
  check ((toto_type_id is null) <> (group_id is null))
);
create index on public.columns (toto_type_id, deadline);
create index on public.columns (group_id, deadline);

create table public.user_bets (
  user_id uuid not null references public.profiles on delete cascade,
  column_id uuid not null references public.columns on delete cascade,
  bet_values jsonb not null,
  correct_guesses int,
  updated_at timestamptz not null default now(),
  primary key (user_id, column_id)
);
create index on public.user_bets (column_id);

create table public.group_bets (
  group_id uuid not null references public.groups on delete cascade,
  column_id uuid not null references public.columns on delete cascade,
  bet_values jsonb not null,
  correct_guesses int,
  updated_at timestamptz not null default now(),
  primary key (group_id, column_id)
);

create table public.push_tokens (
  user_id uuid not null references public.profiles on delete cascade,
  token text not null,
  platform text,
  primary key (user_id, token)
);

create table public.team_aliases (
  he_name text primary key,
  en_name text,
  scoreaxis_team_id text,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── helpers (security definer: no RLS recursion) ─────────────────────────

create function public.is_member(p_group_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members
                 where group_id = p_group_id and user_id = auth.uid() and status = 'active')
$$;

create function public.is_group_admin(p_group_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members
                 where group_id = p_group_id and user_id = auth.uid() and status = 'active' and role = 'admin')
$$;

create function public.is_system_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_system_admin from profiles where id = auth.uid()), false)
$$;

-- I'm active in a group where p_user_id is active.
create function public.shares_group(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members me join group_members them using (group_id)
                 where me.user_id = auth.uid() and me.status = 'active'
                   and them.user_id = p_user_id and them.status = 'active')
$$;

-- I'm active in a group where p_user_id has any row (admins see pending requesters' names).
create function public.can_see_profile(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user_id = auth.uid() or exists (
    select 1 from group_members me join group_members them using (group_id)
    where me.user_id = auth.uid() and me.status = 'active' and them.user_id = p_user_id)
$$;

-- Points = graded games whose pick includes the result. game_num may be string or number.
create function public.score_bet(p_bet jsonb, p_games jsonb) returns int
language sql immutable as $$
  select count(*)::int from jsonb_array_elements(p_games) g
  where g->>'result' is not null and exists (
    select 1 from jsonb_array_elements(coalesce(p_bet, '[]')) b
    where b->>'game_num' = g->>'game_num' and b->'value' ? (g->>'result'))
$$;

create function public.gen_join_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  v text;
begin
  loop
    select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 1 + floor(random() * 36)::int, 1), '')
      into v from generate_series(1, 6);
    exit when not exists (select 1 from groups where join_code = v);
  end loop;
  return v;
end $$;

alter table public.groups alter column join_code set default public.gen_join_code();

-- ───────────────────────── triggers ─────────────────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, avatar_url) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- user_bets: column visible, before deadline, complete, within limits. Server owns correct_guesses.
create function public.check_user_bet() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c columns;
  v_missing int; v_doubles int; v_triples int;
begin
  if tg_op = 'UPDATE' and (new.column_id, new.user_id) <> (old.column_id, old.user_id) then
    raise exception 'cannot move a bet' using errcode = '22023';
  end if;
  select * into c from columns where id = new.column_id;
  if c.group_id is not null and not is_member(c.group_id) then
    raise exception 'not a member of this column''s group' using errcode = '42501';
  end if;
  if now() >= c.deadline then
    raise exception 'deadline passed' using errcode = 'P0001';
  end if;
  select count(*) filter (where n = 0), count(*) filter (where n = 2), count(*) filter (where n = 3)
    into v_missing, v_doubles, v_triples
  from (
    select (select count(distinct v) from jsonb_array_elements(new.bet_values) b,
                   jsonb_array_elements_text(b->'value') v
            where b->>'game_num' = g->>'game_num' and v in ('1', 'X', '2')) n
    from jsonb_array_elements(c.games) g
  ) picks;
  if v_missing > 0 then
    raise exception 'incomplete bet: % games without a pick', v_missing using errcode = 'P0001';
  end if;
  if v_doubles > c.max_doubles or v_triples > c.max_triples then
    raise exception 'over limit: % doubles (max %), % triples (max %)',
      v_doubles, c.max_doubles, v_triples, c.max_triples using errcode = 'P0001';
  end if;
  new.correct_guesses := score_bet(new.bet_values, c.games);
  new.updated_at := now();
  return new;
end $$;

create trigger check_user_bet before insert or update of bet_values, column_id, user_id on public.user_bets
  for each row execute function public.check_user_bet();

-- group_bets: column belongs to the group, before deadline. Budget is the group admins' call.
create function public.check_group_bet() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c columns;
begin
  if tg_op = 'UPDATE' and (new.column_id, new.group_id) <> (old.column_id, old.group_id) then
    raise exception 'cannot move a bet' using errcode = '22023';
  end if;
  select * into c from columns where id = new.column_id;
  if not (c.group_id = new.group_id
          or exists (select 1 from group_types where group_id = new.group_id and toto_type_id = c.toto_type_id)) then
    raise exception 'column is not played by this group' using errcode = '42501';
  end if;
  if now() >= c.deadline then
    raise exception 'deadline passed' using errcode = 'P0001';
  end if;
  new.correct_guesses := score_bet(new.bet_values, c.games);
  new.updated_at := now();
  return new;
end $$;

create trigger check_group_bet before insert or update of bet_values, column_id, group_id on public.group_bets
  for each row execute function public.check_group_bet();

-- Results changed → rescore every bet on the column (only correct_guesses, so bet triggers don't fire).
create function public.rescore_column() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update user_bets set correct_guesses = score_bet(bet_values, new.games) where column_id = new.id;
  update group_bets set correct_guesses = score_bet(bet_values, new.games) where column_id = new.id;
  return null;
end $$;

create trigger rescore_column after update of games on public.columns
  for each row when (old.games is distinct from new.games) execute function public.rescore_column();

-- ───────────────────────── RLS ─────────────────────────

alter table public.profiles enable row level security;
alter table public.toto_types enable row level security;
alter table public.columns enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_types enable row level security;
alter table public.user_bets enable row level security;
alter table public.group_bets enable row level security;
alter table public.push_tokens enable row level security;
alter table public.team_aliases enable row level security;

-- Column-level grants: clients can't touch server-owned columns.
revoke insert, update on public.profiles, public.groups, public.user_bets, public.group_bets from anon, authenticated;
grant update (name, avatar_url, locale, notify, last_group_id) on public.profiles to authenticated;
grant update (name, avatar_url, is_open) on public.groups to authenticated;
grant insert (user_id, column_id, bet_values), update (user_id, column_id, bet_values) on public.user_bets to authenticated;
grant insert (group_id, column_id, bet_values), update (group_id, column_id, bet_values) on public.group_bets to authenticated;

create policy "read visible" on public.profiles for select to authenticated using (can_see_profile(id));
create policy "update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "read all" on public.toto_types for select to authenticated using (true);
create policy "sysadmin writes" on public.toto_types for all to authenticated using (is_system_admin()) with check (is_system_admin());

create policy "read all" on public.team_aliases for select to authenticated using (true);
create policy "sysadmin writes" on public.team_aliases for all to authenticated using (is_system_admin()) with check (is_system_admin());

-- Global columns are public toto data; custom columns only for their group's members.
create policy "read" on public.columns for select to authenticated
  using (toto_type_id is not null or is_member(group_id));
create policy "write" on public.columns for all to authenticated
  using (case when group_id is null then is_system_admin() else is_group_admin(group_id) end)
  with check (case when group_id is null then is_system_admin() else is_group_admin(group_id) end);

-- Pending members can see the group they asked to join (my-groups list).
create policy "read" on public.groups for select to authenticated
  using (exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid()));
create policy "admin updates" on public.groups for update to authenticated
  using (is_group_admin(id)) with check (is_group_admin(id));

-- Membership changes go through RPCs only.
create policy "read" on public.group_members for select to authenticated
  using (user_id = auth.uid() or is_member(group_id));

create policy "read" on public.group_types for select to authenticated using (is_member(group_id));
create policy "admin inserts" on public.group_types for insert to authenticated with check (is_group_admin(group_id));
create policy "admin deletes" on public.group_types for delete to authenticated using (is_group_admin(group_id));

create policy "read" on public.user_bets for select to authenticated
  using (user_id = auth.uid() or shares_group(user_id));
create policy "insert own" on public.user_bets for insert to authenticated with check (user_id = auth.uid());
create policy "update own" on public.user_bets for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read" on public.group_bets for select to authenticated using (is_member(group_id));
create policy "admin inserts" on public.group_bets for insert to authenticated with check (is_group_admin(group_id));
create policy "admin updates" on public.group_bets for update to authenticated
  using (is_group_admin(group_id)) with check (is_group_admin(group_id));

create policy "own" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────── RPCs ─────────────────────────

create function public.require_admin(p_group_id uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_group_admin(p_group_id) then
    raise exception 'group admin only' using errcode = '42501';
  end if;
end $$;

create function public.create_group(p_name text, p_is_open boolean, p_toto_type_ids uuid[], p_avatar_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into groups (name, is_open, avatar_url) values (p_name, p_is_open, p_avatar_url) returning id into v_id;
  insert into group_members (group_id, user_id, role, status) values (v_id, auth.uid(), 'admin', 'active');
  insert into group_types (group_id, toto_type_id) select v_id, t from unnest(coalesce(p_toto_type_ids, '{}')) t;
  update profiles set last_group_id = v_id where id = auth.uid();
  return v_id;
end $$;

create function public.group_preview(p_code text)
returns table (id uuid, name text, avatar_url text, is_open boolean, member_count int, is_member boolean)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.avatar_url, g.is_open,
         (select count(*)::int from group_members m where m.group_id = g.id and m.status = 'active'),
         is_member(g.id)
  from groups g where g.join_code = upper(trim(p_code)) and auth.uid() is not null
$$;

create function public.join_group(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  g groups;
  v_status text;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into g from groups where join_code = upper(trim(p_code));
  if not found then raise exception 'group not found' using errcode = 'P0002'; end if;
  insert into group_members (group_id, user_id, status)
    values (g.id, auth.uid(), case when g.is_open then 'active' else 'pending' end)
    on conflict (group_id, user_id) do nothing;
  select status into v_status from group_members where group_id = g.id and user_id = auth.uid();
  return v_status;
end $$;

create function public.approve_member(p_group_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin(p_group_id);
  update group_members set status = 'active', joined_at = now()
    where group_id = p_group_id and user_id = p_user_id and status = 'pending';
  if not found then raise exception 'no pending request' using errcode = 'P0002'; end if;
end $$;

create function public.reject_member(p_group_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin(p_group_id);
  delete from group_members where group_id = p_group_id and user_id = p_user_id and status = 'pending';
  if not found then raise exception 'no pending request' using errcode = 'P0002'; end if;
end $$;

create function public.remove_member(p_group_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin(p_group_id);
  if p_user_id = auth.uid() then raise exception 'use leave_group' using errcode = '22023'; end if;
  delete from group_members where group_id = p_group_id and user_id = p_user_id;
  if not found then raise exception 'not a member' using errcode = 'P0002'; end if;
  update profiles set last_group_id = null where id = p_user_id and last_group_id = p_group_id;
end $$;

create function public.set_member_role(p_group_id uuid, p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin(p_group_id);
  if p_role not in ('admin', 'member') then raise exception 'bad role' using errcode = '22023'; end if;
  if p_role = 'member' and (select count(*) from group_members
       where group_id = p_group_id and role = 'admin' and status = 'active' and user_id <> p_user_id) = 0 then
    raise exception 'group needs at least one admin' using errcode = 'P0001';
  end if;
  update group_members set role = p_role where group_id = p_group_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'not an active member' using errcode = 'P0002'; end if;
end $$;

create function public.regenerate_code(p_group_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v text := gen_join_code();
begin
  perform require_admin(p_group_id);
  update groups set join_code = v where id = p_group_id;
  return v;
end $$;

-- Leave (or cancel a pending request). Last admin can't leave while others remain; alone → group is deleted.
create function public.leave_group(p_group_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m group_members;
begin
  select * into m from group_members where group_id = p_group_id and user_id = auth.uid();
  if not found then raise exception 'not a member' using errcode = 'P0002'; end if;
  if m.role = 'admin' and m.status = 'active' and not exists (
       select 1 from group_members where group_id = p_group_id and user_id <> auth.uid()
         and role = 'admin' and status = 'active') then
    if exists (select 1 from group_members where group_id = p_group_id and user_id <> auth.uid() and status = 'active') then
      raise exception 'last admin can''t leave: promote someone first' using errcode = 'P0001';
    end if;
    delete from groups where id = p_group_id;
  else
    delete from group_members where group_id = p_group_id and user_id = auth.uid();
  end if;
  update profiles set last_group_id = null where id = auth.uid() and last_group_id = p_group_id;
end $$;

create function public.set_last_group(p_group_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_member(p_group_id) then raise exception 'not a member' using errcode = '42501'; end if;
  update profiles set last_group_id = p_group_id where id = auth.uid();
end $$;

-- ponytail: groups where the user is the last admin are left admin-less; auto-promote if that bites.
create function public.delete_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Internal helpers aren't API.
revoke execute on function public.require_admin(uuid), public.gen_join_code(), public.handle_new_user(),
  public.check_user_bet(), public.check_group_bet(), public.rescore_column() from public, anon, authenticated;

-- ───────────────────────── storage ─────────────────────────

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy "avatars read" on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "avatars insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (name = 'users/' || auth.uid() || '.jpg' or name like 'groups/%'));
create policy "avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (name = 'users/' || auth.uid() || '.jpg' or name like 'groups/%'))
  with check (bucket_id = 'avatars' and (name = 'users/' || auth.uid() || '.jpg' or name like 'groups/%'));
