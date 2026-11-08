import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/lib/auth';
import type {
  Column, GameBetValue, Group, GroupBet, GroupMember, Profile, Role, TotoType, UserBet,
} from '@/core/types';
import type { SeasonBet, SeasonColumn } from '@/core/stats';

// Contract with the DB (see supabase/migrations): tables per spec + RPCs
// create_group, join_group, group_preview, approve_member, reject_member, set_member_role,
// remove_member, regenerate_code, leave_group, set_last_group.

const must = <T>({ data, error }: { data: T | null; error: unknown }): T => {
  if (error) throw error;
  return data as T;
};

const rpc = async <T = unknown>(fn: string, args: Record<string, unknown>) =>
  must<T>(await supabase.rpc(fn, args));

export const useProfile = () => {
  const uid = useUserId();
  return useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => must<Profile>(await supabase.from('profiles').select('*').eq('id', uid).single()),
  });
};

export const useUpdateProfile = () => {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => must(await supabase.from('profiles').update(patch).eq('id', uid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
};

export type MyGroup = GroupMember & { groups: Group & { member_count: { count: number }[] } };

export const useMyGroups = () => {
  const uid = useUserId();
  return useQuery({
    queryKey: ['my-groups', uid],
    enabled: !!uid,
    queryFn: async () =>
      must<MyGroup[]>(
        await supabase
          .from('group_members')
          .select('*, groups(*, member_count:group_members(count))')
          .eq('user_id', uid)
          .order('joined_at'),
      ),
  });
};

export const useGroup = (groupId: string) =>
  useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => must<Group>(await supabase.from('groups').select('*').eq('id', groupId).single()),
  });

export const useMembers = (groupId: string) =>
  useQuery({
    queryKey: ['members', groupId],
    queryFn: async () =>
      must<GroupMember[]>(
        await supabase.from('group_members').select('*, profiles(name, avatar_url)').eq('group_id', groupId).order('joined_at'),
      ),
  });

export const useMyRole = (groupId: string): Role | undefined => {
  const uid = useUserId();
  return useMembers(groupId).data?.find((m) => m.user_id === uid && m.status === 'active')?.role;
};

export const useTotoTypes = () =>
  useQuery({
    queryKey: ['toto-types'],
    staleTime: Infinity,
    queryFn: async () => must<TotoType[]>(await supabase.from('toto_types').select('*').order('code')),
  });

export const useGroupTypes = (groupId: string) =>
  useQuery({
    queryKey: ['group-types', groupId],
    queryFn: async () =>
      must<{ toto_type_id: string }[]>(await supabase.from('group_types').select('toto_type_id').eq('group_id', groupId)).map(
        (r) => r.toto_type_id,
      ),
  });

/** All columns the group plays: subscribed toto types + its custom columns. Newest first. */
export const useGroupColumns = (groupId: string) =>
  useQuery({
    queryKey: ['columns', groupId],
    queryFn: async () => {
      const types = must<{ toto_type_id: string }[]>(
        await supabase.from('group_types').select('toto_type_id').eq('group_id', groupId),
      ).map((r) => r.toto_type_id);
      const filter = types.length ? `group_id.eq.${groupId},toto_type_id.in.(${types.join(',')})` : `group_id.eq.${groupId}`;
      return must<Column[]>(await supabase.from('columns').select('*').or(filter).order('deadline', { ascending: false }));
    },
  });

/** Bets of the group's active members on one column. */
export const useColumnBets = (groupId: string, columnId?: string) => {
  const members = useMembers(groupId);
  const ids = members.data?.filter((m) => m.status === 'active').map((m) => m.user_id);
  return useQuery({
    queryKey: ['bets', groupId, columnId, ids],
    enabled: !!columnId && !!ids,
    queryFn: async () =>
      must<UserBet[]>(await supabase.from('user_bets').select('*').eq('column_id', columnId!).in('user_id', ids!)),
  });
};

export const useMyBet = (columnId: string) => {
  const uid = useUserId();
  return useQuery({
    queryKey: ['bets', 'mine', columnId, uid],
    queryFn: async () =>
      must<UserBet | null>(await supabase.from('user_bets').select('*').eq('column_id', columnId).eq('user_id', uid).maybeSingle()),
  });
};

export const useSaveBet = () => {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, values }: { columnId: string; values: GameBetValue[] }) =>
      must(
        await supabase
          .from('user_bets')
          .upsert({ user_id: uid, column_id: columnId, bet_values: values }, { onConflict: 'user_id,column_id' }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bets'] }),
  });
};

export const useGroupBet = (groupId: string, columnId?: string) =>
  useQuery({
    queryKey: ['group-bet', groupId, columnId],
    enabled: !!columnId,
    queryFn: async () =>
      must<GroupBet | null>(
        await supabase.from('group_bets').select('*').eq('group_id', groupId).eq('column_id', columnId!).maybeSingle(),
      ),
  });

export const useSaveGroupBet = (groupId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, values }: { columnId: string; values: GameBetValue[] }) =>
      must(
        await supabase
          .from('group_bets')
          .upsert({ group_id: groupId, column_id: columnId, bet_values: values }, { onConflict: 'group_id,column_id' }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-bet', groupId] }),
  });
};

/** Season data shaped for core/stats: group's columns (with its group bet) + members' bets. */
export const useSeason = (groupId: string) => {
  const columns = useGroupColumns(groupId);
  const members = useMembers(groupId);
  return useQuery({
    queryKey: ['season', groupId, columns.data?.length, members.data?.length],
    enabled: !!columns.data && !!members.data,
    queryFn: async () => {
      const colIds = columns.data!.map((c) => c.id);
      const active = members.data!.filter((m) => m.status === 'active');
      const [bets, gbets] = await Promise.all([
        supabase.from('user_bets').select('*').in('column_id', colIds).in('user_id', active.map((m) => m.user_id)),
        supabase.from('group_bets').select('*').eq('group_id', groupId),
      ]);
      const gb = new Map(must<GroupBet[]>(gbets).map((b) => [b.column_id, b.bet_values]));
      const prof = new Map(active.map((m) => [m.user_id, m.profiles ?? null]));
      const seasonColumns: SeasonColumn[] = columns.data!.map((c) => ({ ...c, group_bet: gb.get(c.id) ?? null }));
      const seasonBets: SeasonBet[] = must<UserBet[]>(bets).map((b) => ({ ...b, profiles: prof.get(b.user_id) ?? null }));
      return { columns: seasonColumns, bets: seasonBets };
    },
  });
};

// --- group management (RPCs) ---

const useInvalidating = <A, R>(fn: (a: A) => Promise<R>, keys: string[][]) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((queryKey) => qc.invalidateQueries({ queryKey })),
  });
};

export const useCreateGroup = () =>
  useInvalidating(
    (a: { name: string; is_open: boolean; toto_type_ids: string[]; avatar_url?: string | null }) =>
      rpc<string>('create_group', { p_name: a.name, p_is_open: a.is_open, p_toto_type_ids: a.toto_type_ids, p_avatar_url: a.avatar_url ?? null }),
    [['my-groups']],
  );

export type GroupPreview = { id: string; name: string; avatar_url: string | null; is_open: boolean; member_count: number; is_member: boolean };
export const useGroupPreview = (code: string) =>
  useQuery({
    queryKey: ['preview', code],
    enabled: code.length === 6,
    retry: false,
    queryFn: async () => (await rpc<GroupPreview[]>('group_preview', { p_code: code }))[0] ?? null,
  });

export const useJoinGroup = () =>
  useInvalidating((code: string) => rpc<'active' | 'pending'>('join_group', { p_code: code }), [['my-groups']]);

export const useMemberAction = (groupId: string) =>
  useInvalidating(
    (a: { fn: 'approve_member' | 'reject_member' | 'remove_member'; userId: string } | { fn: 'set_member_role'; userId: string; role: Role }) =>
      rpc(a.fn, { p_group_id: groupId, p_user_id: a.userId, ...('role' in a ? { p_role: a.role } : {}) }),
    [['members', groupId], ['my-groups']],
  );

export const useRegenerateCode = (groupId: string) =>
  useInvalidating(() => rpc<string>('regenerate_code', { p_group_id: groupId }), [['group', groupId]]);

export const useLeaveGroup = () => useInvalidating((groupId: string) => rpc('leave_group', { p_group_id: groupId }), [['my-groups']]);

export const useUpdateGroup = (groupId: string) =>
  useInvalidating(
    async (patch: Partial<Pick<Group, 'name' | 'is_open' | 'avatar_url'>>) =>
      must(await supabase.from('groups').update(patch).eq('id', groupId)),
    [['group', groupId], ['my-groups']],
  );

export const useSetGroupType = (groupId: string) =>
  useInvalidating(
    async ({ typeId, on }: { typeId: string; on: boolean }) =>
      must(
        on
          ? await supabase.from('group_types').insert({ group_id: groupId, toto_type_id: typeId })
          : await supabase.from('group_types').delete().eq('group_id', groupId).eq('toto_type_id', typeId),
      ),
    [['group-types', groupId], ['columns', groupId]],
  );

export const setLastGroup = (groupId: string) => rpc('set_last_group', { p_group_id: groupId }).catch(() => {});

/** Upload a picked image to the `avatars` bucket; returns its public URL. */
export async function uploadAvatar(path: string, uri: string) {
  const body = await (await fetch(uri)).arrayBuffer();
  must(await supabase.storage.from('avatars').upload(path, body, { contentType: 'image/jpeg', upsert: true }));
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
