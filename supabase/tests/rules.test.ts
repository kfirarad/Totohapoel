// Server-side rules against the local stack: `bunx supabase start`, then `bun test supabase/tests`.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = JSON.parse(await Bun.$`bunx supabase status -o json`.cwd(`${import.meta.dir}/../..`).quiet().text());
const URL: string = env.API_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(URL, env.SERVICE_ROLE_KEY, opts);

const run = Date.now();
const games = (results: (string | null)[] = [null, null, null, null]) =>
  results.map((result, i) => ({
    game_num: i + 1, home_team: `H${i}`, away_team: `A${i}`, game_time: new Date().toISOString(), competition: 'T', result,
  }));
// game_num deliberately mixes string/number, as the app sends both.
const bet = (...picks: string[][]) => picks.map((value, i) => ({ game_num: i % 2 ? String(i + 1) : i + 1, value }));

async function user(tag: string): Promise<{ id: string; db: SupabaseClient }> {
  const email = `${tag}-${run}@test.local`;
  const password = `pw-${run}-${tag}`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `User ${tag}` },
  });
  if (error) throw error;
  const db = createClient(URL, env.ANON_KEY, opts);
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, db };
}

const ok = <T>(r: { data: T; error: unknown }) => {
  if (r.error) throw r.error;
  return r.data;
};

let a: Awaited<ReturnType<typeof user>>;
let b: Awaited<ReturnType<typeof user>>;
let typeId: string;
let openCol: string;
let closedCol: string;

// Leave the local dev DB as we found it.
afterAll(async () => {
  await service.from('columns').delete().like('name', `%${run}%`);
  await service.from('groups').delete().in('created_by', [a.id, b.id]);
  await Promise.all([a, b].map((u) => service.auth.admin.deleteUser(u.id)));
});

beforeAll(async () => {
  [a, b] = await Promise.all([user('a'), user('b')]);
  typeId = ok(await service.from('toto_types').select('id').eq('code', 'TOTO16').single()).id;
  const mk = (deadline: Date) =>
    service.from('columns')
      .insert({ toto_type_id: typeId, name: `test ${run}`, deadline: deadline.toISOString(), max_doubles: 1, max_triples: 0, games: games() })
      .select('id').single();
  openCol = ok(await mk(new Date(Date.now() + 86400e3))).id;
  closedCol = ok(await mk(new Date(Date.now() - 60e3))).id;
});

const saveBet = (db: SupabaseClient, uid: string, column_id: string, bet_values: unknown) =>
  db.from('user_bets').upsert({ user_id: uid, column_id, bet_values }, { onConflict: 'user_id,column_id' });

describe('user_bets', () => {
  test('profile created from auth metadata', async () => {
    expect(ok(await a.db.from('profiles').select('name').eq('id', a.id).single()).name).toBe('User a');
  });

  test('bet after deadline rejected', async () => {
    const { error } = await saveBet(a.db, a.id, closedCol, bet(['1'], ['X'], ['2'], ['1']));
    expect(error?.message).toContain('deadline passed');
  });

  test('over-limit rejected', async () => {
    const { error } = await saveBet(a.db, a.id, openCol, bet(['1', 'X'], ['X', '2'], ['2'], ['1']));
    expect(error?.message).toContain('over limit');
  });

  test('incomplete rejected', async () => {
    const { error } = await saveBet(a.db, a.id, openCol, bet(['1'], ['X'], ['2']));
    expect(error?.message).toContain('incomplete');
  });

  test("can't write someone else's bet or correct_guesses", async () => {
    expect((await saveBet(b.db, a.id, openCol, bet(['1'], ['X'], ['2'], ['1']))).error).toBeTruthy();
    expect((await a.db.from('user_bets').upsert({ user_id: a.id, column_id: openCol, bet_values: [], correct_guesses: 16 })).error)
      .toBeTruthy();
  });

  test('valid bet saved', async () => {
    ok(await saveBet(a.db, a.id, openCol, bet(['1', 'X'], ['X'], ['2'], ['1'])));
    ok(await saveBet(b.db, b.id, openCol, bet(['2'], ['2'], ['2'], ['2'])));
  });
});

describe('groups', () => {
  let closedGroup: string;
  let code: string;

  test('closed join = pending; non-member sees no group/bets; approve = active', async () => {
    closedGroup = ok(await a.db.rpc('create_group', { p_name: 'Closed', p_is_open: false, p_toto_type_ids: [typeId], p_avatar_url: null }));
    code = ok(await a.db.from('groups').select('join_code').eq('id', closedGroup).single()).join_code;
    ok(await a.db.from('group_bets').upsert({ group_id: closedGroup, column_id: openCol, bet_values: bet(['1'], ['1'], ['1'], ['1']) }));

    const preview = ok(await b.db.rpc('group_preview', { p_code: code.toLowerCase() }));
    expect(preview).toMatchObject([{ id: closedGroup, is_open: false, member_count: 1, is_member: false }]);

    expect(ok(await b.db.rpc('join_group', { p_code: code }))).toBe('pending');
    expect(ok(await b.db.from('group_bets').select('*').eq('group_id', closedGroup))).toHaveLength(0);
    expect(ok(await b.db.from('user_bets').select('*').eq('user_id', a.id))).toHaveLength(0);
    expect(ok(await b.db.from('group_types').select('*').eq('group_id', closedGroup))).toHaveLength(0);
    // pending member can't write the group bet
    expect((await b.db.from('group_bets').upsert({ group_id: closedGroup, column_id: openCol, bet_values: [] })).error).toBeTruthy();
    // admin sees the request
    const members = ok(await a.db.from('group_members').select('user_id, status, profiles(name)').eq('group_id', closedGroup));
    expect(members).toContainEqual({ user_id: b.id, status: 'pending', profiles: { name: 'User b' } });

    // only admins approve
    expect((await b.db.rpc('approve_member', { p_group_id: closedGroup, p_user_id: b.id })).error).toBeTruthy();
    ok(await a.db.rpc('approve_member', { p_group_id: closedGroup, p_user_id: b.id }));
    expect(ok(await b.db.from('group_members').select('status').eq('group_id', closedGroup).eq('user_id', b.id).single()).status)
      .toBe('active');
    expect(ok(await b.db.from('group_bets').select('*').eq('group_id', closedGroup))).toHaveLength(1);
    expect(ok(await b.db.from('user_bets').select('*').eq('user_id', a.id).eq('column_id', openCol))).toHaveLength(1);
  });

  test('open join = active', async () => {
    const id = ok(await a.db.rpc('create_group', { p_name: 'Open', p_is_open: true, p_toto_type_ids: [typeId] }));
    const c = ok(await a.db.from('groups').select('join_code').eq('id', id).single()).join_code;
    expect(c).toMatch(/^[A-Z0-9]{6}$/);
    expect(ok(await b.db.rpc('join_group', { p_code: c }))).toBe('active');
  });

  test("last admin can't leave or demote self; member can leave", async () => {
    expect((await a.db.rpc('leave_group', { p_group_id: closedGroup })).error?.message).toContain('last admin');
    expect((await a.db.rpc('set_member_role', { p_group_id: closedGroup, p_user_id: a.id, p_role: 'member' })).error?.message)
      .toContain('at least one admin');
    ok(await a.db.rpc('set_member_role', { p_group_id: closedGroup, p_user_id: b.id, p_role: 'admin' }));
    ok(await a.db.rpc('leave_group', { p_group_id: closedGroup }));
    expect(ok(await a.db.from('groups').select('id').eq('id', closedGroup))).toHaveLength(0);
  });
});

test('avatars: own user path + groups/* writable, others not', async () => {
  const img = new Uint8Array([0xff, 0xd8, 0xff]);
  const up = (path: string) => a.db.storage.from('avatars').upload(path, img, { contentType: 'image/jpeg', upsert: true });
  ok(await up(`users/${a.id}.jpg`));
  ok(await up(`users/${a.id}.jpg`)); // upsert overwrite
  ok(await up(`groups/${run}.jpg`));
  expect((await up(`users/${b.id}.jpg`)).error).toBeTruthy();
  expect((await up(`other/${run}.jpg`)).error).toBeTruthy();
});

describe('results', () => {
  test('updating column results recomputes user + group scores', async () => {
    const gid = ok(await a.db.rpc('create_group', { p_name: 'Scores', p_is_open: true, p_toto_type_ids: [typeId] }));
    ok(await a.db.from('group_bets').upsert({ group_id: gid, column_id: openCol, bet_values: bet(['X'], ['X'], ['X'], ['1']) }));

    ok(await service.from('columns').update({ games: games(['X', 'X', '1', null]) }).eq('id', openCol));

    // a: ['1','X'] ['X'] ['2'] ['1'] → games 1,2 hit = 2. b: all '2' → 0. group: X X X 1 → 2.
    const scores = ok(await service.from('user_bets').select('user_id, correct_guesses').eq('column_id', openCol));
    expect(scores).toContainEqual({ user_id: a.id, correct_guesses: 2 });
    expect(scores).toContainEqual({ user_id: b.id, correct_guesses: 0 });
    expect(ok(await service.from('group_bets').select('correct_guesses').eq('group_id', gid).single()).correct_guesses).toBe(2);
  });

  test("non-sysadmin can't edit global columns", async () => {
    const { data } = await a.db.from('columns').update({ games: games(['1', '1', '1', '1']) }).eq('id', openCol).select();
    expect(data).toHaveLength(0);
  });
});
