// Local mock data for the app: players, two groups, past rounds with results and everyone's bets.
// Run against the local stack (after `bunx supabase start`): `bun supabase/dev-seed.ts`
// Re-runnable: it replaces its own groups/rounds each time. Never point this at production.
import { createClient } from '@supabase/supabase-js';
import { autoFillGroupBet, formVotes } from '../mobile/src/core/stats';

const root = `${import.meta.dir}/..`;
const env = JSON.parse(await Bun.$`bunx supabase status -o json`.cwd(root).quiet().text());
if (!String(env.API_URL).includes('127.0.0.1')) throw new Error('dev-seed only runs against the local stack');
const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const devPassword = (await Bun.file(`${root}/mobile/.env`).text()).match(/EXPO_PUBLIC_DEV_PASSWORD=(\S+)/)?.[1];
if (!devPassword) throw new Error('EXPO_PUBLIC_DEV_PASSWORD missing in mobile/.env');

const ok = <T>(r: { data: T; error: unknown }) => {
  if (r.error) throw r.error;
  return r.data;
};
const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(xs: T[]) => xs[rnd(xs.length)];
const shuffle = <T>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
const OUT = ['1', 'X', '2'] as const;
type O = (typeof OUT)[number];
const WEEK = 7 * 864e5;

// --- users ---------------------------------------------------------------
const PEOPLE = [
  ['dev-a', 'Dana Dev'], ['dev-b', 'Ben Dev'],
  ['mock-1', 'רון כהן'], ['mock-2', 'נועה לוי'], ['mock-3', 'עמית מזרחי'], ['mock-4', 'שירן פרץ'],
  ['mock-5', 'יואב ביטון'], ['mock-6', 'מיכל אברהם'], ['mock-7', 'אורי פרידמן'], ['mock-8', 'טל שפירא'],
  ['mock-9', 'גיל דהן'], ['mock-10', 'הדר אזולאי'],
] as const;

const existing = ok(await db.auth.admin.listUsers({ perPage: 1000 })).users;
const ids: Record<string, string> = {};
for (const [tag, name] of PEOPLE) {
  const email = `${tag}@groupbet.test`;
  const found = existing.find((u) => u.email === email);
  ids[tag] = found
    ? found.id
    : ok(await db.auth.admin.createUser({
        email, email_confirm: true, user_metadata: { full_name: name },
        password: tag.startsWith('dev') ? devPassword : crypto.randomUUID(),
      })).user.id;
  await db.from('profiles').update({ name }).eq('id', ids[tag]);
}
// Hit rate per player, so stats/leaderboards have a spread.
const skill: Record<string, number> = Object.fromEntries(PEOPLE.map(([tag]) => [tag, 0.35 + Math.random() * 0.35]));

// --- groups --------------------------------------------------------------
const GROUPS = [
  { name: "חבר'ה מהעבודה", is_open: true, admins: ['dev-a', 'mock-1'], members: ['dev-b', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6', 'mock-7'], pending: [] },
  { name: 'משפחה', is_open: false, admins: ['dev-b'], members: ['dev-a', 'mock-8', 'mock-9'], pending: ['mock-10'] },
];
const toto = ok(await db.from('toto_types').select('id, default_max_doubles, default_max_triples').eq('code', 'TOTO16').single());

await db.from('groups').delete().in('name', GROUPS.map((g) => g.name));
await db.from('columns').delete().like('name', 'מחזור %');

const groups: { id: string; members: string[] }[] = [];
for (const g of GROUPS) {
  const id = ok(await db.from('groups').insert({ name: g.name, is_open: g.is_open, created_by: ids[g.admins[0]] }).select('id').single()).id;
  const rows = [
    ...g.admins.map((t) => ({ user_id: ids[t], role: 'admin', status: 'active' })),
    ...g.members.map((t) => ({ user_id: ids[t], role: 'member', status: 'active' })),
    ...g.pending.map((t) => ({ user_id: ids[t], role: 'member', status: 'pending' })),
  ].map((r, i) => ({ ...r, group_id: id, joined_at: new Date(Date.now() - (12 - i) * WEEK).toISOString() }));
  ok(await db.from('group_members').insert(rows));
  ok(await db.from('group_types').insert({ group_id: id, toto_type_id: toto.id }));
  groups.push({ id, members: [...g.admins, ...g.members] });
}
await db.from('profiles').update({ last_group_id: groups[0].id }).eq('id', ids['dev-a']);

// --- rounds --------------------------------------------------------------
const teams = ok(await db.from('team_aliases').select('he_name')).map((t) => t.he_name as string);
const COMPS = ['ליגת העל', 'ליגה לאומית', 'פרמייר ליג', 'לה ליגה', 'סרייה א', 'בונדסליגה'];
const result = (): O => { const r = Math.random(); return r < 0.45 ? '1' : r < 0.72 ? 'X' : '2'; };

function games(kickoff: Date, results: (O | null)[]) {
  const t = shuffle(teams);
  return results.map((r, i) => ({
    game_num: i + 1, home_team: t[2 * i], away_team: t[2 * i + 1], competition: pick(COMPS),
    game_time: new Date(+kickoff + rnd(6) * 30 * 6e4).toISOString(), result: r,
  }));
}

/** One player's column: mostly singles leaning on the true result, within the double/triple budget. */
function betFor(tag: string, truth: O[]) {
  const doubles = new Set(shuffle([...truth.keys()]).slice(0, rnd(toto.default_max_doubles + 1)));
  const triples = new Set(shuffle([...truth.keys()].filter((i) => !doubles.has(i))).slice(0, rnd(toto.default_max_triples + 1)));
  return truth.map((r, i) => {
    if (triples.has(i)) return { game_num: i + 1, value: [...OUT] };
    const first = Math.random() < skill[tag] ? r : pick(OUT.filter((o) => o !== r));
    const value = doubles.has(i) ? [first, pick(OUT.filter((o) => o !== first))] : [first];
    return { game_num: i + 1, value };
  });
}

/** Create a round open, collect bets (triggers only accept them before the deadline), then close + grade it. */
async function round(name: string, deadline: Date, graded: number, betRate: number) {
  const truth = Array.from({ length: 16 }, result);
  const g = games(new Date(+deadline + 36e5), Array(16).fill(null));
  const col = ok(await db.from('columns').insert({
    toto_type_id: toto.id, name, deadline: new Date(Date.now() + 36e5).toISOString(),
    max_doubles: toto.default_max_doubles, max_triples: toto.default_max_triples, games: g,
  }).select('id').single()).id;

  const players = PEOPLE.map(([tag]) => tag).filter((t) => Math.random() < betRate);
  const bets = players.map((t) => ({ user_id: ids[t], column_id: col, bet_values: betFor(t, truth) }));
  if (bets.length) ok(await db.from('user_bets').insert(bets));

  for (const grp of groups) {
    // A few members' votes and a tight budget — a full consensus would beat everyone every week.
    const own = shuffle(bets.filter((b) => grp.members.some((t) => ids[t] === b.user_id))).slice(0, 3).map((b) => ({ ...b, profiles: null }));
    if (own.length < 2) continue;
    const filled = autoFillGroupBet(g.map((x) => x.game_num), formVotes(own, () => 1), 2, 1);
    const bet_values = Object.entries(filled).map(([game_num, value]) => ({ game_num: Number(game_num), value }));
    ok(await db.from('group_bets').insert({ group_id: grp.id, column_id: col, bet_values }));
  }

  if (+deadline > Date.now()) {
    ok(await db.from('columns').update({ deadline: deadline.toISOString() }).eq('id', col));
  } else {
    const done = g.map((x, i) => ({ ...x, result: i < graded ? truth[i] : null }));
    ok(await db.from('columns').update({ deadline: deadline.toISOString(), games: done }).eq('id', col));
  }
  return bets.length;
}

const now = Date.now();
let total = 0;
for (let i = 0; i < 10; i++) total += await round(`מחזור ${31 + i}`, new Date(now - (11 - i) * WEEK), 16, 0.85);
total += await round('מחזור 41', new Date(now - 864e5), 9, 0.9); // closed yesterday, results coming in
total += await round('מחזור 42', new Date(now + 3 * 864e5), 0, 0.5); // open: some friends already submitted

// Dev A/B leave the open round to you; drop their bets there so you can submit from the app.
const open = ok(await db.from('columns').select('id').eq('name', 'מחזור 42').single()).id;
await db.from('user_bets').delete().eq('column_id', open).in('user_id', [ids['dev-a'], ids['dev-b']]);

console.log(`Seeded ${PEOPLE.length} players, ${groups.length} groups, 12 rounds, ${total} bets.`);
console.log('Sign in with "Dev A" (admin of חבר\'ה מהעבודה) or "Dev B" (admin of משפחה, 1 pending request).');
