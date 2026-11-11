import { Redirect } from 'expo-router';
import { Loading } from '@/components/ui';
import { useMyGroups, useProfile } from '@/lib/queries';
import { PENDING_JOIN } from '@/lib/auth';



/** Entry: pending invite → join; last active group → its column; else groups home. */
export default function Index() {
  const profile = useProfile();
  const groups = useMyGroups();
  const pending = localStorage.getItem(PENDING_JOIN);
  if (pending) {
    localStorage.removeItem(PENDING_JOIN);
    return <Redirect href={{ pathname: '/join/[code]', params: { code: pending } }} />;
  }
  if (profile.isPending || groups.isPending) return <Loading />;
  const last = profile.data?.last_group_id;
  const ok = groups.data?.some((m) => m.group_id === last && m.status === 'active');
  return ok ? <Redirect href={{ pathname: '/g/[groupId]/column', params: { groupId: last! } }} /> : <Redirect href="/groups" />;
}
