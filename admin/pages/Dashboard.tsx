import { useQuery } from '@tanstack/react-query';
import { ok, supabase } from '../lib/supabase';
import { Card, ErrorText, Link, fmt } from '../ui';

type Stats = {
  users: number; users_7d: number; users_30d: number; wau: number; mau: number;
  groups: number; groups_active: number; group_sizes: Record<string, number>; bets: number;
  recent_columns: { id: string; name: string; deadline: string; code: string | null; is_active: boolean; bets: number }[];
  by_type: { code: string; country: string; users: number; bets: number }[];
  retention: { wk: string; size: number; w1: number; w2: number; w4: number }[];
  alerts: { missing_results: { id: string; name: string }[]; types_without_open_column: string[] };
};

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

export function Dashboard() {
  const { data: s, error } = useQuery({ queryKey: ['stats'], queryFn: async () => ok(await supabase.rpc('admin_stats')) as Stats });
  if (error) return <ErrorText error={error} />;
  if (!s) return null;
  const tiles: [string, number | string, string?][] = [
    ['Users', s.users, `+${s.users_7d} this week · +${s.users_30d} in 30 days`],
    ['Weekly active', s.wau, 'placed or edited a bet in 7 days'],
    ['Monthly active', s.mau],
    ['Groups', s.groups, `${s.groups_active} active in 14 days`],
    ['Bets', s.bets],
  ];
  const sizes = Object.entries(s.group_sizes).map(([n, c]) => [Number(n), c] as const).sort((a, b) => a[0] - b[0]);
  const maxSize = Math.max(1, ...sizes.map(([, c]) => c));
  const alerts = s.alerts.missing_results.length + s.alerts.types_without_open_column.length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(([label, n, sub]) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="text-2xl font-semibold tabular-nums">{n}</div>
            {sub && <div className="text-xs text-zinc-500">{sub}</div>}
          </div>
        ))}
      </div>

      {alerts > 0 && (
        <Card title={`Needs attention (${alerts})`}>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {s.alerts.missing_results.map((c) => (
              <li key={c.id}>Results missing: <Link className="underline" to={`/columns/${c.id}`}>{c.name}</Link></li>
            ))}
            {s.alerts.types_without_open_column.map((code) => <li key={code}>No open round for <b>{code}</b></li>)}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Recent rounds">
          <table>
            <thead><tr><th>Round</th><th>Type</th><th>Deadline</th><th className="text-right">Bets</th></tr></thead>
            <tbody>
              {s.recent_columns.map((c) => (
                <tr key={c.id} className={c.is_active ? '' : 'text-zinc-400'}>
                  <td><Link className="underline" to={`/columns/${c.id}`}><bdi>{c.name}</bdi></Link></td>
                  <td className="text-xs">{c.code ?? 'custom'}</td>
                  <td className="text-xs">{fmt(c.deadline)}</td>
                  <td className="text-right tabular-nums">{c.bets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-4">
          <Card title="Retention (by week of first bet)">
            <table>
              <thead><tr><th>Week</th><th className="text-right">Users</th><th className="text-right">+1 wk</th><th className="text-right">+2 wk</th><th className="text-right">+4 wk</th></tr></thead>
              <tbody>
                {s.retention.map((r) => (
                  <tr key={r.wk}>
                    <td className="text-xs">{r.wk.slice(0, 10)}</td>
                    <td className="text-right tabular-nums">{r.size}</td>
                    <td className="text-right tabular-nums">{pct(r.w1, r.size)}</td>
                    <td className="text-right tabular-nums">{pct(r.w2, r.size)}</td>
                    <td className="text-right tabular-nums">{pct(r.w4, r.size)}</td>
                  </tr>
                ))}
                {!s.retention.length && <tr><td colSpan={5} className="text-zinc-500">No first bets in the last 12 weeks.</td></tr>}
              </tbody>
            </table>
          </Card>

          <Card title="By toto type">
            <table>
              <thead><tr><th>Type</th><th>Country</th><th className="text-right">Players</th><th className="text-right">Bets</th></tr></thead>
              <tbody>
                {s.by_type.map((t) => (
                  <tr key={t.code}><td className="font-mono text-xs">{t.code}</td><td>{t.country}</td>
                    <td className="text-right tabular-nums">{t.users}</td><td className="text-right tabular-nums">{t.bets}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Group sizes (active members)">
            <div className="space-y-1">
              {sizes.map(([n, c]) => (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-right tabular-nums">{n}</span>
                  <div className="h-3 rounded bg-zinc-800" style={{ width: `${(c / maxSize) * 100}%`, minWidth: 4 }} />
                  <span className="tabular-nums">{c}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
