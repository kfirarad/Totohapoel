import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ok, supabase } from '../lib/supabase';
import { Badge, Button, Card, ErrorText, fmt } from '../ui';

type Row = { id: string; name: string; join_code: string; is_open: boolean; created_at: string; creator: string | null; members: number; pending: number; types: string[] };

export function Groups() {
  const [q, setQ] = useState('');
  const qc = useQueryClient();
  const { data = [], error } = useQuery({
    queryKey: ['admin_groups', q],
    queryFn: async () => ok(await supabase.rpc('admin_groups', { p_q: q })) as Row[],
  });
  const [actionError, setActionError] = useState<unknown>(null);
  const remove = async (g: Row) => {
    if (!confirm(`Delete group "${g.name}" with ${g.members} members? Its group bets go too. Players' own bets stay.`)) return;
    setActionError(null);
    try { ok(await supabase.rpc('admin_delete_group', { p_id: g.id })); qc.invalidateQueries({ queryKey: ['admin_groups'] }); }
    catch (e) { setActionError(e); }
  };
  return (
    <Card title={`Groups (${data.length})`} actions={<input placeholder="Name or join code" value={q} onChange={(e) => setQ(e.target.value)} />}>
      <ErrorText error={error ?? actionError} />
      <table>
        <thead><tr><th>Name</th><th>Code</th><th>Types</th><th className="text-right">Members</th><th>Creator</th><th>Created</th><th /></tr></thead>
        <tbody>
          {data.map((g) => (
            <tr key={g.id}>
              <td><bdi>{g.name}</bdi> <Badge tone={g.is_open ? 'green' : 'zinc'}>{g.is_open ? 'open' : 'closed'}</Badge></td>
              <td className="font-mono text-xs">{g.join_code}</td>
              <td className="text-xs">{g.types.join(', ')}</td>
              <td className="text-right tabular-nums">{g.members}{g.pending > 0 && <span className="text-amber-700"> +{g.pending}</span>}</td>
              <td><bdi>{g.creator ?? '—'}</bdi></td>
              <td className="text-xs">{fmt(g.created_at)}</td>
              <td className="text-right"><Button kind="danger" onClick={() => remove(g)}>Delete</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
