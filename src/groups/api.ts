import { supabase } from "@/services/supabase";

export type JoinPolicy = "open" | "closed";
export type GroupRole = "admin" | "member";

export type Group = {
  id: string;
  name: string;
  market: string;
  locale: string | null;
  max_doubles: number;
  max_triples: number;
  join_policy: JoinPolicy;
  invite_code: string;
  created_by: string | null;
  created_at: string;
};

export type MyGroup = Group & { role: GroupRole };

export type GroupMember = {
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profiles: { name: string; avatar_url: string | null } | null;
};

export type JoinRequest = {
  user_id: string;
  created_at: string;
  profiles: { name: string; avatar_url: string | null } | null;
};

export type GroupPreview = {
  group_id: string;
  name: string;
  market: string;
  join_policy: JoinPolicy;
  member_count: number;
  my_status: "member" | "pending" | "approved" | "rejected" | null;
};

/** The groups I belong to, with my role in each */
export const fetchMyGroups = async (userId: string): Promise<MyGroup[]> => {
  const { data, error } = await supabase
    .from("group_members")
    .select("role, groups(*)")
    .eq("user_id", userId)
    .returns<{ role: GroupRole; groups: Group }[]>();
  if (error) throw error;
  return (data ?? [])
    .filter((m) => m.groups)
    .map((m) => ({ ...m.groups, role: m.role }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const createGroup = async (input: {
  name: string;
  market: string;
  maxDoubles: number;
  maxTriples: number;
  joinPolicy: JoinPolicy;
}): Promise<Group> => {
  const { data, error } = await supabase.rpc("create_group", {
    p_name: input.name,
    p_market: input.market,
    p_max_doubles: input.maxDoubles,
    p_max_triples: input.maxTriples,
    p_join_policy: input.joinPolicy,
  });
  if (error) throw error;
  return data as Group;
};

export const previewGroup = async (code: string): Promise<GroupPreview | null> => {
  const { data, error } = await supabase.rpc("group_preview", { p_code: code });
  if (error) throw error;
  return ((data as GroupPreview[]) ?? [])[0] ?? null;
};

export const joinGroup = async (code: string) => {
  const { data, error } = await supabase.rpc("join_group", { p_code: code });
  if (error) throw error;
  return data as { group_id: string; status: "member" | "pending" };
};

export const updateGroup = async (
  id: string,
  patch: Partial<Pick<Group, "name" | "max_doubles" | "max_triples" | "join_policy" | "locale">>
) => {
  const { error } = await supabase.from("groups").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteGroup = async (id: string) => {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw error;
};

export const regenerateInviteCode = async (groupId: string) => {
  const { data, error } = await supabase.rpc("regenerate_invite_code", { p_group_id: groupId });
  if (error) throw error;
  return data as string;
};

export const fetchMembers = async (groupId: string): Promise<GroupMember[]> => {
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at, profiles(name, avatar_url)")
    .eq("group_id", groupId)
    .returns<GroupMember[]>();
  if (error) throw error;
  return (data ?? []).sort((a, b) => (a.profiles?.name ?? "").localeCompare(b.profiles?.name ?? ""));
};

export const setMemberRole = async (groupId: string, userId: string, role: GroupRole) => {
  const { error } = await supabase.from("group_members").update({ role }).eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
};

/** Removes a member, or leaves the group when userId is me */
export const removeMember = async (groupId: string, userId: string) => {
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
};

export const fetchJoinRequests = async (groupId: string): Promise<JoinRequest[]> => {
  const { data, error } = await supabase
    .from("group_join_requests")
    .select("user_id, created_at, profiles!group_join_requests_user_id_fkey(name, avatar_url)")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at")
    .returns<JoinRequest[]>();
  if (error) throw error;
  return data ?? [];
};

export const decideJoinRequest = async (groupId: string, userId: string, approve: boolean) => {
  const { error } = await supabase.rpc("decide_join_request", {
    p_group_id: groupId,
    p_user_id: userId,
    p_approve: approve,
  });
  if (error) throw error;
};

export const inviteUrl = (code: string) => `${window.location.origin}/join/${code}`;

// An invite link opened while signed out: remembered across the Google sign-in redirect
const PENDING_INVITE = "pendingInvite";
export const rememberInvite = (code: string) => {
  try { localStorage.setItem(PENDING_INVITE, code); } catch { /* storage unavailable */ }
};
export const takePendingInvite = () => {
  try {
    const code = localStorage.getItem(PENDING_INVITE);
    localStorage.removeItem(PENDING_INVITE);
    return code;
  } catch {
    return null;
  }
};
