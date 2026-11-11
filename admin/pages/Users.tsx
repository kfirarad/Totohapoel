import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ok, supabase } from '../lib/supabase';
import { Badge, Button, Card, ErrorText, fmt } from '../ui';

type Row = { id: string; name: string; email: string; avatar_url: string | null; is_system_admin: boolean; created_at: string; last_bet_at: string | null; bets: number; groups: string[] };

export function Users() {
  const [q, setQ] = useState('');
  const qc = useQueryClient();
  const { data = [], error } = useQuery({
    queryKey: ['admin_users', q],
    queryFn: async () => ok(await supabase.rpc('admin_users', { p_q: q })) as Row[],
  });
  const [actionError, setActionError] = useState<unknown>(null);
  const act = async (fn: string, args: Record<string, unknown>) => {
    setActionError(null);
    try { ok(await supabase.rpc(fn, args)); qc.invalidateQueries({ queryKey: ['admin_users'] }); }
    catch (e) { setActionError(e); }
  };
  return (
    <Card title={`Users (${data.length})`} actions={<input placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} />}>
      <ErrorText error={error ?? actionError} />
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Groups</th><th className="text-right">Bets</th><th>Last bet</th><th>Joined</th><th /></tr></thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id}>
              <td className="flex items-center gap-2">
                {u.avatar_url ? <img src={u.avatar_url} className="size-6 rounded-full object-cover" alt="" /> : <span className="size-6 rounded-full bg-zinc-200" />}
                <bdi>{u.name || '—'}</bdi>{u.is_system_admin && <Badge tone="blue">admin</Badge>}
              </td>
              <td className="text-xs">{u.email}</td>
              <td className="text-xs"><bdi>{u.groups.join(', ')}</bdi></td>
              <td className="text-right tabular-nums">{u.bets}</td>
              <td className="text-xs">{fmt(u.last_bet_at)}</td>
              <td className="text-xs">{fmt(u.created_at)}</td>
              <td className="whitespace-nowrap text-right">
                <Button onClick={() => act('admin_set_system_admin', { p_id: u.id, p_on: !u.is_system_admin })}>
                  {u.is_system_admin ? 'Remove admin' : 'Make admin'}
                </Button>{' '}
                <Button kind="danger" onClick={() => confirm(`Delete ${u.name || u.email} and all their bets? This can't be undone.`) && act('admin_delete_user', { p_id: u.id })}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
