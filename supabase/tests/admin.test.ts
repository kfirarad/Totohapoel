// Admin RPCs against the local stack: `bunx supabase start`, then `bun test supabase/tests`.
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = JSON.parse(await Bun.$`bunx supabase status -o json`.cwd(`${import.meta.dir}/../..`).quiet().text());
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, opts);
const run = Date.now();

async function user(tag: string): Promise<{ id: string; db: SupabaseClient }> {
  const email = `${tag}-${run}@test.local`;
  const password = `pw-${run}-${tag}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const db = createClient(env.API_URL, env.ANON_KEY, opts);
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, db };
}

let admin: Awaited<ReturnType<typeof user>>;
let player: Awaited<ReturnType<typeof user>>;

beforeAll(async () => {
  [admin, player] = await Promise.all([user('admin'), user('player')]);
  await service.from('profiles').update({ is_system_admin: true }).eq('id', admin.id);
});
afterAll(async () => {
  await Promise.all([admin, player].map((u) => service.auth.admin.deleteUser(u.id)));
});

const RPCS: [string, Record<string, unknown>][] = [
  ['admin_stats', {}], ['admin_column_bets', {}], ['admin_groups', { p_q: '' }], ['admin_users', { p_q: '' }],
  ['admin_delete_group', { p_id: crypto.randomUUID() }], ['admin_delete_user', { p_id: crypto.randomUUID() }],
  ['admin_set_system_admin', { p_id: crypto.randomUUID(), p_on: true }],
];

test('non-admins are refused by every admin RPC', async () => {
  for (const [fn, args] of RPCS) {
    const { error } = await player.db.rpc(fn, args);
    expect(error?.code, fn).toBe('42501');
  }
});

test('anon cannot call admin RPCs', async () => {
  const anon = createClient(env.API_URL, env.ANON_KEY, opts);
  const { error } = await anon.rpc('admin_stats');
  expect(error).not.toBeNull();
});

test('admin gets stats and can search users by email', async () => {
  const { data: stats, error } = await admin.db.rpc('admin_stats');
  expect(error).toBeNull();
  expect(stats.users).toBeGreaterThanOrEqual(2);
  expect(Array.isArray(stats.retention)).toBe(true);
  const { data: users } = await admin.db.rpc('admin_users', { p_q: `player-${run}` });
  expect(users.map((u: { id: string }) => u.id)).toEqual([player.id]);
});

test('admin can grant system admin, delete a user, not delete self', async () => {
  expect((await admin.db.rpc('admin_set_system_admin', { p_id: player.id, p_on: true })).error).toBeNull();
  expect((await service.from('profiles').select('is_system_admin').eq('id', player.id).single()).data?.is_system_admin).toBe(true);
  expect((await admin.db.rpc('admin_delete_user', { p_id: admin.id })).error?.code).toBe('22023');
  const doomed = await user('doomed');
  expect((await admin.db.rpc('admin_delete_user', { p_id: doomed.id })).error).toBeNull();
  expect((await service.auth.admin.getUserById(doomed.id)).data.user).toBeNull();
});
