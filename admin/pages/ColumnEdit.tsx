import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { decodeDraw, winnerBookmarklet } from '../../src/lib/winner';
import { parsePaste, parseWinner, type Draft } from '../lib/import';
import { ok, supabase } from '../lib/supabase';
import { isoToZoned, zonedToIso } from '../lib/time';
import { useTotoTypes, type Column, type Game, type TotoType } from '../lib/types';
import { Badge, Button, Card, ErrorText, Field, navigate } from '../ui';

const OUTCOMES = ['1', 'X', '2'] as const;
const emptyGame = (n: number): Game => ({ game_num: n, home_team: '', away_team: '', competition: '', game_time: '', result: null });

type Form = Omit<Column, 'id' | 'created_at' | 'group_id'> & { id?: string };

export function ColumnEdit({ id }: { id?: string }) {
  const { data: types = [] } = useTotoTypes();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const type: TotoType | undefined = types.find((t) => t.id === form?.toto_type_id);
  const tz = type?.timezone ?? 'Asia/Jerusalem';

  // Load the column, or start a new one for the first active type (prefilled from the Winner bookmarklet if present).
  useEffect(() => {
    if (form || !types.length) return;
    (async () => {
      if (id) return setForm(ok(await supabase.from('columns').select('*').eq('id', id).single()) as Column);
      const fromBookmarklet = location.hash.match(/winner=([^&]+)/)?.[1];
      const draw = fromBookmarklet ? decodeDraw(decodeURIComponent(fromBookmarklet)) : null;
      const t = (draw && types.find((x) => x.adapter === 'winner')) || types.find((x) => x.is_active) || types[0];
      const blank = newForm(t);
      setForm(draw ? applyDraft(blank, parseWinner(draw)!) : blank);
    })().catch(setError);
  }, [id, types, form]);

  const games = form?.games ?? [];
  const counts = useMemo(() => ({ filled: games.filter((g) => g.home_team && g.away_team).length, results: games.filter((g) => g.result).length }), [games]);
  if (!form) return <ErrorText error={error} />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });
  const setGame = (i: number, patch: Partial<Game>) => set('games', games.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const changeType = (t: TotoType) => setForm({
    ...form, toto_type_id: t.id, max_doubles: t.default_max_doubles, max_triples: t.default_max_triples,
    games: resize(form.games, t.games_count ?? form.games.length),
  });

  const importPaste = () => {
    setError(null);
    try { setForm(applyDraft(form, parsePaste(paste, tz))); setPaste(''); } catch (e) { setError(e); }
  };

  const save = async () => {
    setError(null);
    const missing = games.findIndex((g) => !g.home_team || !g.away_team || !g.game_time);
    if (!form.name || !form.deadline) return setError('Name and deadline are required');
    if (missing >= 0) return setError(`Game ${games[missing].game_num} needs both teams and a kickoff`);
    setSaving(true);
    try {
      const { id: colId, ...fields } = form;
      const row = { ...fields, external_id: fields.external_id || null, source: fields.source || 'manual' };
      const saved = ok(colId
        ? await supabase.from('columns').update(row).eq('id', colId).select('id').single()
        : await supabase.from('columns').insert(row).select('id').single()) as { id: string };
      await qc.invalidateQueries({ queryKey: ['columns'] });
      if (!colId) navigate(`/columns/${saved.id}`);
      setForm({ ...form, id: saved.id });
    } catch (e) { setError(e); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <Card
        title={form.id ? 'Edit column' : 'New column'}
        actions={<>
          {form.id && <Badge tone={form.is_active ? 'green' : 'zinc'}>{form.is_active ? 'active' : 'archived'}</Badge>}
          <Badge>{counts.filled}/{games.length} games · {counts.results} results</Badge>
        </>}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Toto type">
            <select value={form.toto_type_id ?? ''} disabled={!!form.id} onChange={(e) => changeType(types.find((t) => t.id === e.target.value)!)}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name_en}</option>)}
            </select>
          </Field>
          <Field label="Name"><input dir="auto" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label={`Deadline (${tz})`}>
            <input type="datetime-local" value={isoToZoned(form.deadline, tz)} onChange={(e) => set('deadline', e.target.value ? zonedToIso(e.target.value, tz) : '')} />
          </Field>
          <Field label="Operator draw id"><input value={form.external_id ?? ''} onChange={(e) => set('external_id', e.target.value)} /></Field>
          <Field label="Max doubles"><input type="number" min={0} value={form.max_doubles} onChange={(e) => set('max_doubles', Number(e.target.value))} /></Field>
          <Field label="Max triples"><input type="number" min={0} value={form.max_triples} onChange={(e) => set('max_triples', Number(e.target.value))} /></Field>
          <Field label="Games">
            <input type="number" min={1} max={30} value={games.length} onChange={(e) => set('games', resize(games, Number(e.target.value)))} />
          </Field>
          <Field label="Active (untick to archive)">
            <input type="checkbox" className="size-4" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          </Field>
        </div>
      </Card>

      <Card title="Import">
        <textarea
          className="h-24 w-full font-mono text-xs" value={paste} onChange={(e) => setPaste(e.target.value)}
          placeholder={'Paste Winner JSON, or CSV/TSV rows:\n1, Arsenal, Chelsea, Premier League, 2026-11-14 16:00   (kickoff in ' + tz + ')'}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <Button onClick={importPaste} disabled={!paste.trim()}>Fill from paste</Button>
          {type?.adapter === 'winner' && (
            <span>Winner: drag <a className="rounded border px-1.5 py-0.5 underline" href={winnerBookmarklet(location.origin)}>Winner → Group Bet</a> to the bookmarks bar, then click it on winner.co.il.</span>
          )}
        </div>
      </Card>

      <Card title="Games and results">
        <table>
          <thead><tr><th>#</th><th>Home</th><th>Away</th><th>Competition</th><th>Kickoff ({tz})</th><th>Result</th></tr></thead>
          <tbody>
            {games.map((g, i) => (
              <tr key={i}>
                <td className="tabular-nums">{g.game_num}</td>
                <td><input dir="auto" className="w-full" value={g.home_team} onChange={(e) => setGame(i, { home_team: e.target.value })} /></td>
                <td><input dir="auto" className="w-full" value={g.away_team} onChange={(e) => setGame(i, { away_team: e.target.value })} /></td>
                <td><input dir="auto" className="w-full" value={g.competition} onChange={(e) => setGame(i, { competition: e.target.value })} /></td>
                <td><input type="datetime-local" value={isoToZoned(g.game_time, tz)} onChange={(e) => setGame(i, { game_time: e.target.value ? zonedToIso(e.target.value, tz) : '' })} /></td>
                <td>
                  <div className="flex gap-1">
                    {OUTCOMES.map((o) => (
                      <button key={o} type="button" onClick={() => setGame(i, { result: g.result === o ? null : o })}
                        className={`h-7 w-8 rounded text-xs font-semibold ${g.result === o ? 'bg-zinc-900 text-white' : 'bg-zinc-100 hover:bg-zinc-200'}`}>{o}</button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-zinc-500">Saving results rescores every bet on this column automatically.</p>
      </Card>

      <ErrorText error={error} />
      <div className="flex gap-2">
        <Button kind="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button onClick={() => navigate('/columns')}>Back</Button>
      </div>
    </div>
  );
}

function newForm(t: TotoType | undefined): Form {
  return {
    toto_type_id: t?.id ?? null, name: '', deadline: '', is_active: true,
    max_doubles: t?.default_max_doubles ?? 0, max_triples: t?.default_max_triples ?? 0,
    games: resize([], t?.games_count ?? 16), source: 'manual', external_id: null,
  };
}

/** Keep existing games (and any extra keys like live_tracker_id), pad or trim to n rows. */
function resize(games: Game[], n: number): Game[] {
  return Array.from({ length: Math.max(1, n) }, (_, i) => games[i] ?? emptyGame(i + 1));
}

function applyDraft(form: Form, d: Draft): Form {
  return {
    ...form,
    name: d.name ?? form.name, deadline: d.deadline ?? form.deadline,
    external_id: d.external_id ?? form.external_id, source: d.source,
    // pasted rows replace the first rows; a shorter paste keeps the type's row count
    games: resize(form.games, Math.max(form.games.length, d.games.length)).map((g, i) => (d.games[i] ? { ...g, ...d.games[i] } : g)),
  };
}
