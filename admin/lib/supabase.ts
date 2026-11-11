import { createClient } from '@supabase/supabase-js';

// Same public project/key as the apps. Admin powers come from the signed-in user's is_system_admin, enforced in Postgres.
// BUN_PUBLIC_* overrides let `admin-local` (launch.json) run against the local stack.
export const SUPABASE_URL = process.env.BUN_PUBLIC_SUPABASE_URL || 'https://dbeyeyuewbksealxjtxb.supabase.co';
export const isLocal = SUPABASE_URL.includes('127.0.0.1');
export const supabase = createClient(SUPABASE_URL, process.env.BUN_PUBLIC_SUPABASE_KEY || 'sb_publishable_0t6vwZwe1AqhSCviXnNwXg_6tl8UrVF');

export const ok = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
