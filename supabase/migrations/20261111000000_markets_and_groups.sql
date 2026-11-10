-- Phase 0: markets + groups.  See docs/markets-plan.md §3.4–3.5.
--
-- * columns   = an operator's draw, shared by every group in its market. max_doubles/max_triples
--               on a column now mean "the most the operator allows".
-- * groups    = players. Each group has one market, its own limits, invite link, open/closed joining.
-- * group_columns = a column as seen by one group: limits override, active/archived, the group bet.
-- * user_bets = one bet per (group, column, user).
-- * Scoring moves into the database (triggers), so results can arrive without a browser.
-- * Row-level security is REPLACED on profiles/columns/user_bets: every existing policy on those
--   three tables is dropped and recreated group-aware. Anonymous access is removed.
--
-- Existing data is moved into one group, "טוטו הפועל" (market 'il', closed): every profile becomes a
-- member, current admins become group admins. Legacy duplicate bets (same user+column) are moved to
-- user_bets_legacy_duplicates, keeping the newest one, which is the one the app already shows.
--
-- Run once, before deploying the matching frontend. Idempotency is not attempted; it runs in one
-- transaction, so a failure leaves the database unchanged.

begin;

-- ---------------------------------------------------------------- markets on columns / profiles
alter table public.columns
  add column market text not null default 'il',
  add column external_draw_id text,
  add column source_status text check (source_status in ('open', 'closed', 'final')),
  add column synced_at timestamptz,
  add constraint columns_market_draw_uniq unique (market, external_draw_id);
comment on column public.columns.max_doubles is 'Operator maximum for this draw; groups can only go lower';
comment on column public.columns.max_triples is 'Operator maximum for this draw; groups can only go lower';

alter table public.profiles add column locale text;

-- ---------------------------------------------------------------- groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  market text not null,
  locale text,
  max_doubles int not null default 5 check (max_doubles >= 0),
  max_triples int not null default 4 check (max_triples >= 0),
  join_policy text not null default 'open' check (join_policy in ('open', 'closed')),
  invite_code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.group_join_requests (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  primary key (group_id, user_id)
);

create table public.group_columns (
  group_id uuid not null references public.groups(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete cascade,
  max_doubles int check (max_doubles >= 0),          -- null = the group's default
  max_triples int check (max_triples >= 0),
  is_active boolean not null default true,
  is_archived boolean not null default false,
  group_bet jsonb,
  group_bet_max_doubles int check (group_bet_max_doubles >= 0),  -- null = the players' limit
  group_bet_max_triples int check (group_bet_max_triples >= 0),
  group_bet_correct_guesses int,
  primary key (group_id, column_id)
);
create index group_columns_column_idx on public.group_columns (column_id);

create function public.new_invite_code() returns text language sql volatile as
  $$ select substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) $$;

-- ---------------------------------------------------------------- permission helpers
-- security definer so they can be used inside RLS policies without recursing into them
create function public.is_super_admin() returns boolean
  language sql stable security definer set search_path = public as
  $$ select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;

create function public.is_group_member(gid uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from group_members where group_id = gid and user_id = auth.uid()) $$;

create function public.is_group_admin(gid uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from group_members where group_id = gid and user_id = auth.uid() and role = 'admin') $$;

create function public.shares_group_with(other uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from group_members a join group_members b using (group_id)
                    where a.user_id = auth.uid() and b.user_id = other) $$;

-- the limit a player gets: the group's value, capped at the operator's maximum
create function public.effective_limits(gid uuid, cid uuid, out max_doubles int, out max_triples int)
  language sql stable security definer set search_path = public as $$
  select least(coalesce(gc.max_doubles, g.max_doubles), c.max_doubles),
         least(coalesce(gc.max_triples, g.max_triples), c.max_triples)
  from groups g join columns c on c.id = cid
  left join group_columns gc on gc.group_id = g.id and gc.column_id = c.id
  where g.id = gid $$;

-- ---------------------------------------------------------------- scoring
-- bet_values / group_bet: [{game_num, value: ['1','X',...]}]; games: [{game_num, result}]
-- game_num is compared as text (both numbers and strings exist in stored data)
create function public.score_bet(bets jsonb, games jsonb) returns int
  language sql immutable as $$
  select count(*)::int
  from jsonb_array_elements(coalesce(bets, '[]')) b
  join jsonb_array_elements(coalesce(games, '[]')) g on g->>'game_num' = b->>'game_num'
  where g->>'result' is not null and coalesce(b->'value', '[]') ? (g->>'result') $$;

create function public.score_column(cid uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  -- the before-triggers below recompute the scores from the column's current games
  update user_bets set correct_guesses = null where column_id = cid;
  update group_columns set group_bet_correct_guesses = null where column_id = cid;
end $$;
revoke execute on function public.score_column(uuid) from public, anon, authenticated;

create function public.columns_after_games_change() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  perform score_column(new.id);
  return null;
end $$;
create trigger columns_rescore after update of games on public.columns
  for each row when (old.games is distinct from new.games) execute function public.columns_after_games_change();

-- ---------------------------------------------------------------- columns -> groups
-- a new draw is offered to every group in its market
create function public.columns_after_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into group_columns (group_id, column_id)
  select id, new.id from groups where market = new.market
  on conflict do nothing;
  return null;
end $$;
create trigger columns_offer_to_groups after insert on public.columns
  for each row execute function public.columns_after_insert();

-- ---------------------------------------------------------------- group_columns rules
create function public.group_columns_before_write() returns trigger
  language plpgsql security definer set search_path = public as $$
declare c columns;
begin
  select * into c from columns where id = new.column_id;
  if new.max_doubles > c.max_doubles or new.max_triples > c.max_triples
     or new.group_bet_max_doubles > c.max_doubles or new.group_bet_max_triples > c.max_triples then
    raise exception 'limit above the operator maximum (% doubles, % triples)', c.max_doubles, c.max_triples
      using errcode = 'check_violation';
  end if;
  new.group_bet_correct_guesses := case
    when exists (select 1 from jsonb_array_elements(coalesce(new.group_bet, '[]')) b
                 where jsonb_array_length(coalesce(b->'value', '[]')) > 0)
    then score_bet(new.group_bet, c.games) end;
  return new;
end $$;
create trigger group_columns_validate before insert or update on public.group_columns
  for each row execute function public.group_columns_before_write();

-- ---------------------------------------------------------------- the last admin can't leave
create function public.group_members_keep_an_admin() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and exists (select 1 from groups where id = old.group_id)  -- not a cascade from deleting the group
     and not exists (select 1 from group_members
                     where group_id = old.group_id and role = 'admin' and user_id <> old.user_id) then
    raise exception 'a group needs at least one admin; promote someone else first'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;
create trigger group_members_keep_an_admin before update or delete on public.group_members
  for each row execute function public.group_members_keep_an_admin();

-- ---------------------------------------------------------------- profiles: only a super-admin grants super-admin
create function public.profiles_protect_is_admin() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.is_admin is distinct from
       (case when tg_op = 'UPDATE' then old.is_admin else false end)
     and not is_super_admin() then
    raise exception 'only a super-admin can change is_admin' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create trigger profiles_protect_is_admin before insert or update on public.profiles
  for each row execute function public.profiles_protect_is_admin();

-- ---------------------------------------------------------------- existing data -> one group
create table public.user_bets_legacy_duplicates (like public.user_bets including all);
alter table public.user_bets_legacy_duplicates enable row level security;  -- no policies: admins via SQL only

with ranked as (
  select id, row_number() over (partition by user_id, column_id order by created_at desc, id desc) as rn
  from public.user_bets
), moved as (
  delete from public.user_bets b using ranked r where b.id = r.id and r.rn > 1 returning b.*
)
insert into public.user_bets_legacy_duplicates select * from moved;

alter table public.user_bets add column group_id uuid references public.groups(id) on delete cascade;

do $$
declare gid uuid;
declare has_archived boolean := exists (select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'columns' and column_name = 'is_archived');
begin
  if not exists (select 1 from public.profiles) and not exists (select 1 from public.columns) then
    return;  -- empty database: nothing to migrate
  end if;

  insert into public.groups (name, market, locale, join_policy, invite_code, created_by)
  values ('טוטו הפועל', 'il', 'he', 'closed', public.new_invite_code(),
          (select id from public.profiles where is_admin order by id limit 1))
  returning id into gid;

  insert into public.group_members (group_id, user_id, role)
  select gid, id, case when is_admin then 'admin' else 'member' end from public.profiles;

  -- remember the players' limits before raising the operator maximum below
  create temp table players_limits on commit drop as select id, max_doubles, max_triples from public.columns;

  -- the operator maximum must cover everything used so far, including the group bet's own budget
  update public.columns
     set max_doubles = case when max_doubles is not null then greatest(max_doubles, group_max_doubles) end,
         max_triples = case when max_triples is not null then greatest(max_triples, group_max_triples) end;

  -- the players' limits so far were set per column; keep them as this group's overrides
  execute format($q$
    insert into public.group_columns (group_id, column_id, max_doubles, max_triples, is_active, is_archived,
                                      group_bet, group_bet_max_doubles, group_bet_max_triples)
    select %L, c.id, pl.max_doubles, pl.max_triples, c.is_active, %s,
           c.group_bet, c.group_max_doubles, c.group_max_triples
    from public.columns c join players_limits pl using (id) $q$, gid, case when has_archived then 'coalesce(c.is_archived, false)' else 'false' end);

  update public.user_bets set group_id = gid;
end $$;

alter table public.user_bets
  alter column group_id set not null,
  add constraint user_bets_one_per_group unique (group_id, column_id, user_id);

-- ---------------------------------------------------------------- user_bets rules + scoring
create function public.user_bets_before_write() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  c columns;
  lim record;
  doubles int; triples int;
begin
  select * into c from columns where id = new.column_id;

  -- validate player writes (skipped for service_role / SQL, where auth.uid() is null)
  if auth.uid() is not null and (tg_op = 'INSERT' or new.bet_values is distinct from old.bet_values
                                 or new.group_id <> old.group_id or new.column_id <> old.column_id) then
    if new.user_id <> auth.uid() then
      raise exception 'you can only save your own bet' using errcode = 'insufficient_privilege';
    end if;
    if not is_group_member(new.group_id) then
      raise exception 'not a member of this group' using errcode = 'insufficient_privilege';
    end if;
    if not exists (select 1 from group_columns where group_id = new.group_id and column_id = new.column_id) then
      raise exception 'this column is not open in this group' using errcode = 'check_violation';
    end if;
    if now() >= c.deadline and not is_group_admin(new.group_id) then
      raise exception 'the column is closed' using errcode = 'check_violation';
    end if;
    select * into lim from effective_limits(new.group_id, new.column_id);
    select count(*) filter (where jsonb_array_length(coalesce(b->'value', '[]')) = 2),
           count(*) filter (where jsonb_array_length(coalesce(b->'value', '[]')) = 3)
      into doubles, triples
      from jsonb_array_elements(coalesce(new.bet_values, '[]')) b;
    if doubles > lim.max_doubles or triples > lim.max_triples then
      raise exception 'too many doubles/triples (max % / %)', lim.max_doubles, lim.max_triples
        using errcode = 'check_violation';
    end if;
  end if;

  new.correct_guesses := score_bet(new.bet_values, c.games);
  return new;
end $$;
create trigger user_bets_validate before insert or update on public.user_bets
  for each row execute function public.user_bets_before_write();

-- score everything once, now that the triggers exist
update public.user_bets set correct_guesses = null;
update public.group_columns set group_bet_correct_guesses = null;

-- ---------------------------------------------------------------- RPCs for groups
create function public.create_group(p_name text, p_market text, p_max_doubles int default 5,
                                    p_max_triples int default 4, p_join_policy text default 'open')
  returns public.groups language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = 'insufficient_privilege'; end if;
  insert into groups (name, market, max_doubles, max_triples, join_policy, invite_code, created_by)
  values (trim(p_name), p_market, p_max_doubles, p_max_triples, p_join_policy, new_invite_code(), auth.uid())
  returning * into g;
  insert into group_members (group_id, user_id, role) values (g.id, auth.uid(), 'admin');
  -- open draws of the market; past draws have no bets in a new group
  insert into group_columns (group_id, column_id)
  select g.id, id from columns where market = g.market and deadline > now();
  return g;
end $$;

-- what the /join/<code> page shows before joining
create function public.group_preview(p_code text)
  returns table (group_id uuid, name text, market text, join_policy text, member_count int, my_status text)
  language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.market, g.join_policy,
         (select count(*)::int from group_members m where m.group_id = g.id),
         case when exists (select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid())
              then 'member'
              else (select r.status from group_join_requests r where r.group_id = g.id and r.user_id = auth.uid()) end
  from groups g where g.invite_code = p_code $$;

-- returns 'member' (joined or already in), 'pending' (closed group: request sent)
create function public.join_group(p_code text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = 'insufficient_privilege'; end if;
  select * into g from groups where invite_code = p_code;
  if not found then raise exception 'invite link is invalid or was replaced' using errcode = 'no_data_found'; end if;
  if exists (select 1 from group_members where group_id = g.id and user_id = auth.uid()) then
    return jsonb_build_object('group_id', g.id, 'status', 'member');
  end if;
  if g.join_policy = 'open' then
    insert into group_members (group_id, user_id) values (g.id, auth.uid());
    delete from group_join_requests where group_id = g.id and user_id = auth.uid();
    return jsonb_build_object('group_id', g.id, 'status', 'member');
  end if;
  insert into group_join_requests (group_id, user_id) values (g.id, auth.uid())
  on conflict (group_id, user_id) do update
    set status = 'pending', created_at = now(), decided_by = null, decided_at = null;
  return jsonb_build_object('group_id', g.id, 'status', 'pending');
end $$;

create function public.decide_join_request(p_group_id uuid, p_user_id uuid, p_approve boolean) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not is_group_admin(p_group_id) then
    raise exception 'only a group admin can do this' using errcode = 'insufficient_privilege';
  end if;
  update group_join_requests
     set status = case when p_approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now()
   where group_id = p_group_id and user_id = p_user_id and status = 'pending';
  if not found then raise exception 'no pending request' using errcode = 'no_data_found'; end if;
  if p_approve then
    insert into group_members (group_id, user_id) values (p_group_id, p_user_id) on conflict do nothing;
  end if;
end $$;

create function public.regenerate_invite_code(p_group_id uuid) returns text
  language plpgsql security definer set search_path = public as $$
declare code text := new_invite_code();
begin
  if not is_group_admin(p_group_id) then
    raise exception 'only a group admin can do this' using errcode = 'insufficient_privilege';
  end if;
  update groups set invite_code = code where id = p_group_id;
  return code;
end $$;

-- ---------------------------------------------------------------- row-level security
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('profiles', 'columns', 'user_bets') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.columns enable row level security;
alter table public.user_bets enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_join_requests enable row level security;
alter table public.group_columns enable row level security;

revoke all on public.profiles, public.columns, public.user_bets, public.groups, public.group_members,
              public.group_join_requests, public.group_columns, public.user_bets_legacy_duplicates from anon;

-- profiles: yourself, people in your groups, people asking to join a group you run
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or is_super_admin() or shares_group_with(id)
  or exists (select 1 from group_join_requests r where r.user_id = profiles.id and is_group_admin(r.group_id)));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or is_super_admin()) with check (id = auth.uid() or is_super_admin());

-- columns (operator draws) are public to signed-in users; only super-admins import/edit them
create policy columns_select on public.columns for select to authenticated using (true);
create policy columns_write on public.columns for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- groups
create policy groups_select on public.groups for select to authenticated
  using (is_group_member(id) or is_super_admin());
create policy groups_update on public.groups for update to authenticated
  using (is_group_admin(id)) with check (is_group_admin(id));
create policy groups_delete on public.groups for delete to authenticated using (is_group_admin(id));

-- members: visible to the group; admins change roles / remove; anyone can leave
create policy group_members_select on public.group_members for select to authenticated
  using (is_group_member(group_id) or is_super_admin());
create policy group_members_update on public.group_members for update to authenticated
  using (is_group_admin(group_id)) with check (is_group_admin(group_id));
create policy group_members_delete on public.group_members for delete to authenticated
  using (user_id = auth.uid() or is_group_admin(group_id));

-- join requests: the requester and the group's admins (writes go through the RPCs)
create policy group_join_requests_select on public.group_join_requests for select to authenticated
  using (user_id = auth.uid() or is_group_admin(group_id));
create policy group_join_requests_delete on public.group_join_requests for delete to authenticated
  using (user_id = auth.uid() or is_group_admin(group_id));

-- a group's view of its columns
create policy group_columns_select on public.group_columns for select to authenticated
  using (is_group_member(group_id) or is_super_admin());
create policy group_columns_write on public.group_columns for all to authenticated
  using (is_group_admin(group_id)) with check (is_group_admin(group_id));

-- bets: your own always; the group's after the deadline (admins: any time, as today)
create policy user_bets_select on public.user_bets for select to authenticated using (
  user_id = auth.uid()
  or is_group_admin(group_id)
  or (is_group_member(group_id) and now() >= (select deadline from columns where id = column_id)));
create policy user_bets_insert on public.user_bets for insert to authenticated
  with check (user_id = auth.uid());  -- the trigger checks membership, deadline and limits
create policy user_bets_update on public.user_bets for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_bets_delete on public.user_bets for delete to authenticated
  using (user_id = auth.uid() and now() < (select deadline from columns where id = column_id));

grant execute on function public.create_group(text, text, int, int, text), public.group_preview(text),
  public.join_group(text), public.decide_join_request(uuid, uuid, boolean),
  public.regenerate_invite_code(uuid) to authenticated;
revoke execute on function public.create_group(text, text, int, int, text), public.group_preview(text),
  public.join_group(text), public.decide_join_request(uuid, uuid, boolean),
  public.regenerate_invite_code(uuid) from anon;

commit;
