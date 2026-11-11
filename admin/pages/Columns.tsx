import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ok, supabase } from '../lib/supabase';
import { useTotoTypes, type Column } from '../lib/types';
import { Badge, Button, Card, ErrorText, Link, fmt } from '../ui';

const status = (c: Column) => {
  if (!c.is_active) return ['archived', 'zinc'] as const;
  if (new Date(c.deadline) > new Date()) return ['open', 'blue'] as const;
  return c.games.some((g) => !g.result) ? (['awaiting results', 'amber'] as const) : (['done', 'green'] as const);
};

export function Columns() {
  const { data: types = [] } = useTotoTypes();
  const [typeId, setTypeId] = useState('');
  const [show, setShow] = useState<'all' | 'open' | 'awaiting results' | 'done' | 'archived'>('all');
  const qc = useQueryClient();
  const { data: columns = [], error } = useQuery({
    queryKey: ['columns', typeId],
    queryFn: async () => {
      let q = supabase.from('columns').select('*').not('toto_type_id', 'is', null).order('deadline', { ascending: false }).limit(300);
      if (typeId) q = q.eq('toto_type_id', typeId);
      return ok(await q) as Column[];
    },
  });
  const { data: bets = new Map<string, number>() } = useQuery({
    queryKey: ['column_bets'],
    queryFn: async () => new Map((ok(await supabase.rpc('admin_column_bets')) as { column_id: string; bets: number }[]).map((r) => [r.column_id, r.bets])),
  });
  const typeCode = new Map(types.map((t) => [t.id, t.code]));
  const rows = columns.filter((c) => show === 'all' || status(c)[0] === show);

  const setActive = async (c: Column, is_active: boolean) => {
    ok(await supabase.from('columns').update({ is_active }).eq('id', c.id).select('id'));
    qc.invalidateQueries({ queryKey: ['columns'] });
  };

  return (
    <Card
      title="Columns"
      actions={<>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.code}</option>)}
        </select>
        <select value={show} onChange={(e) => setShow(e.target.value as typeof show)}>
          {['all', 'open', 'awaiting results', 'done', 'archived'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <Link to="/columns/new"><Button kind="primary">New column</Button></Link>
      </>}
    >
      <ErrorText error={error} />
      <table>
        <thead><tr><th>Round</th><th>Type</th><th>Deadline</th><th>Status</th><th className="text-right">Bets</th><th /></tr></thead>
        <tbody>
          {rows.map((c) => {
            const [label, tone] = status(c);
            return (
              <tr key={c.id}>
                <td><Link className="underline" to={`/columns/${c.id}`}><bdi>{c.name}</bdi></Link>
                  {c.external_id && <span className="ml-1 text-xs text-zinc-400">#{c.external_id}</span>}</td>
                <td className="font-mono text-xs">{typeCode.get(c.toto_type_id ?? '') ?? '—'}</td>
                <td className="text-xs">{fmt(c.deadline)}</td>
                <td><Badge tone={tone}>{label}</Badge></td>
                <td className="text-right tabular-nums">{bets.get(c.id) ?? 0}</td>
                <td className="text-right">
                  <Button onClick={() => setActive(c, !c.is_active)}>{c.is_active ? 'Archive' : 'Restore'}</Button>
                </td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={6} className="text-zinc-500">No columns.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}
