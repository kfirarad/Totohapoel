// One-off (re-runnable) import of the old web app ("Toto Hapoel" project) into Group Bet production.
// Users keep their ids (Google identity sub carries over), except ones whose email already exists in
// the new project — those are remapped to the existing user. Everything lands in one group.
// Run: `bun supabase/import-legacy.ts` (needs `bunx supabase login`). Add `--dry` to roll back at the end.
const OLD = 'tabpznqluszwzreclwrb';
const NEW = 'dbeyeyuewbksealxjtxb';
const GROUP = 'טוטו הפועל';
const SKIP_COLUMNS = ['מבוטל'];
const dry = Bun.argv.includes('--dry');

const token = (await Bun.$`security find-generic-password -s "Supabase CLI" -w`.quiet().text()).trim();
async function sql<T = any>(ref: string, query: string, read_only = false): Promise<T[]> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, read_only }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`${ref}: ${JSON.stringify(body)}`);
  return body;
}

// ---- export (read-only) ----
const [dump] = await sql(OLD, `select jsonb_build_object(
  'users', (select jsonb_agg(to_jsonb(u)) from (select id, email, encrypted_password, email_confirmed_at,
             raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at from auth.users) u),
  'identities', (select jsonb_agg(to_jsonb(i)) from (select id, user_id, provider_id, provider, identity_data,
             last_sign_in_at, created_at, updated_at from auth.identities) i),
  'profiles', (select jsonb_agg(to_jsonb(p)) from (select id, name, avatar_url, is_admin, created_at from profiles) p),
  'columns', (select jsonb_agg(to_jsonb(c)) from (select id, name, deadline, is_active, created_at, max_doubles,
             max_triples, games::jsonb games, group_bet from columns) c),
  'bets', (select jsonb_agg(to_jsonb(b)) from (select distinct on (user_id, column_id) user_id, column_id,
             bet_values::jsonb bet_values, created_at from user_bets order by user_id, column_id, created_at desc) b),
  'aliases', (select jsonb_agg(to_jsonb(a)) from team_aliases a)
) d`, true);
const d = dump.d;
console.log(`old: ${d.users.length} users, ${d.columns.length} columns, ${d.bets.length} bets (deduped), ${d.aliases.length} aliases`);

// ---- import (one transaction) ----
const json = (x: unknown) => `$json$${JSON.stringify(x)}$json$::jsonb`;
const report = await sql(NEW, `
begin;
create temp table src on commit drop as select ${json(d)} d;

-- old user id → new user id (existing account with same email wins)
create temp table idmap on commit drop as
select (u->>'id')::uuid old_id, coalesce(e.id, (u->>'id')::uuid) new_id, e.id is null is_new, u
from src, jsonb_array_elements(d->'users') u
left join auth.users e on lower(e.email) = lower(u->>'email');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token)
select '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', u->>'email',
  u->>'encrypted_password', (u->>'email_confirmed_at')::timestamptz, u->'raw_app_meta_data', u->'raw_user_meta_data',
  (u->>'created_at')::timestamptz, (u->>'updated_at')::timestamptz, (u->>'last_sign_in_at')::timestamptz,
  '', '', '', '', '', ''
from idmap where is_new
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select (i->>'id')::uuid, m.new_id, i->>'provider_id', i->>'provider', i->'identity_data',
  (i->>'last_sign_in_at')::timestamptz, (i->>'created_at')::timestamptz, (i->>'updated_at')::timestamptz
from src, jsonb_array_elements(d->'identities') i join idmap m on m.old_id = (i->>'user_id')::uuid
where m.is_new
on conflict do nothing;

-- profiles exist via on_auth_user_created; fill name/avatar for imported users only
update profiles p set name = coalesce(nullif(o->>'name', ''), p.name), avatar_url = coalesce(o->>'avatar_url', p.avatar_url)
from src, jsonb_array_elements(d->'profiles') o join idmap m on m.old_id = (o->>'id')::uuid
where p.id = m.new_id and m.is_new;

-- group
insert into groups (name, is_open, created_by)
select '${GROUP}', false, m.new_id from idmap m
where (m.u->>'email') = 'the.kfir@gmail.com' and not exists (select 1 from groups where name = '${GROUP}');
create temp table g on commit drop as select id from groups where name = '${GROUP}';
insert into group_types (group_id, toto_type_id) select g.id, t.id from g, toto_types t where t.code = 'TOTO16'
on conflict do nothing;
insert into group_members (group_id, user_id, role, status, joined_at)
select g.id, m.new_id, case when (o->>'is_admin')::boolean then 'admin' else 'member' end, 'active', (o->>'created_at')::timestamptz
from g, src, jsonb_array_elements(d->'profiles') o join idmap m on m.old_id = (o->>'id')::uuid
on conflict (group_id, user_id) do update set role = excluded.role, status = 'active';
update profiles set last_group_id = (select id from g) where id in (select new_id from idmap);
update profiles set is_system_admin = true where id in (select new_id from idmap where u->>'email' = 'the.kfir@gmail.com');

-- columns (global TOTO16, old ids kept); drop the seed demo column
delete from columns where name = 'Demo column' and not exists (select 1 from user_bets where column_id = columns.id);
insert into columns (id, toto_type_id, name, deadline, is_active, max_doubles, max_triples, games, created_at)
select (c->>'id')::uuid, (select id from toto_types where code = 'TOTO16'), trim(c->>'name'), (c->>'deadline')::timestamptz,
  (c->>'is_active')::boolean, (c->>'max_doubles')::int, (c->>'max_triples')::int, c->'games', (c->>'created_at')::timestamptz
from src, jsonb_array_elements(d->'columns') c
where trim(c->>'name') <> all (array[${SKIP_COLUMNS.map((s) => `'${s}'`).join(',')}])
on conflict (id) do update set name = excluded.name, deadline = excluded.deadline, is_active = excluded.is_active,
  max_doubles = excluded.max_doubles, max_triples = excluded.max_triples, games = excluded.games;

-- bets: past deadlines, so bypass the submit checks for this transaction only; score server-side
alter table user_bets disable trigger check_user_bet;
alter table group_bets disable trigger check_group_bet;

insert into user_bets (user_id, column_id, bet_values, correct_guesses, updated_at)
select m.new_id, col.id,
  (select jsonb_agg(jsonb_build_object('game_num', (v->>'game_num')::int, 'value', v->'value')) from jsonb_array_elements(b->'bet_values') v),
  null, (b->>'created_at')::timestamptz
from src, jsonb_array_elements(d->'bets') b
join idmap m on m.old_id = (b->>'user_id')::uuid
join columns col on col.id = (b->>'column_id')::uuid
on conflict (user_id, column_id) do update set bet_values = excluded.bet_values, updated_at = excluded.updated_at;

insert into group_bets (group_id, column_id, bet_values, updated_at)
select g.id, col.id,
  (select jsonb_agg(jsonb_build_object('game_num', (v->>'game_num')::int, 'value', v->'value')) from jsonb_array_elements(c->'group_bet') v),
  now()
from g, src, jsonb_array_elements(d->'columns') c join columns col on col.id = (c->>'id')::uuid
where jsonb_typeof(c->'group_bet') = 'array'
on conflict (group_id, column_id) do update set bet_values = excluded.bet_values;

alter table user_bets enable trigger check_user_bet;
alter table group_bets enable trigger check_group_bet;

update user_bets b set correct_guesses = score_bet(b.bet_values, c.games) from columns c where c.id = b.column_id;
update group_bets b set correct_guesses = score_bet(b.bet_values, c.games) from columns c where c.id = b.column_id;

insert into team_aliases (he_name, en_name, scoreaxis_team_id, updated_at)
select a->>'he_name', a->>'en_name', a->>'scoreaxis_team_id', coalesce((a->>'updated_at')::timestamptz, now())
from src, jsonb_array_elements(d->'aliases') a
on conflict (he_name) do update set en_name = coalesce(excluded.en_name, team_aliases.en_name),
  scoreaxis_team_id = coalesce(excluded.scoreaxis_team_id, team_aliases.scoreaxis_team_id);

create temp table report on commit drop as select
  (select count(*) from idmap where is_new) new_users, (select count(*) from idmap where not is_new) remapped_users,
  (select count(*) from group_members where group_id = (select id from g)) members,
  (select count(*) from columns) columns, (select count(*) from user_bets) user_bets,
  (select count(*) from group_bets) group_bets, (select count(*) from team_aliases) aliases,
  (select sum(correct_guesses) from user_bets) total_hits;
${dry ? 'select * from report; rollback;' : 'commit;'}
`);
console.log(dry ? 'DRY RUN (rolled back):' : 'committed', report);
