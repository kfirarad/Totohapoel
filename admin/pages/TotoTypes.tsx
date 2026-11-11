import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ok, supabase } from '../lib/supabase';
import { useTotoTypes, type TotoType } from '../lib/types';
import { Badge, Button, Card, ErrorText, Field } from '../ui';

const EMPTY: Omit<TotoType, 'id'> = {
  code: '', name_he: '', name_en: '', country: '', default_max_doubles: 0, default_max_triples: 0,
  games_count: 13, timezone: 'Europe/Stockholm', adapter: 'csv', is_active: true,
};

export function TotoTypes() {
  const { data: types = [], error } = useTotoTypes();
  const [editing, setEditing] = useState<Partial<TotoType> | null>(null);
  return (
    <div className="space-y-4">
      <Card title="Toto types" actions={<Button kind="primary" onClick={() => setEditing({ ...EMPTY })}>New type</Button>}>
        <ErrorText error={error} />
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Country</th><th>Games</th><th>Doubles / triples</th><th>Timezone</th><th>Import</th><th /></tr></thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td className="font-mono">{t.code} {!t.is_active && <Badge>inactive</Badge>}</td>
                <td>{t.name_en}<div className="text-xs text-zinc-500" dir="auto">{t.name_he}</div></td>
                <td>{t.country}</td>
                <td>{t.games_count ?? '—'}</td>
                <td>{t.default_max_doubles} / {t.default_max_triples}</td>
                <td className="text-xs">{t.timezone}</td>
                <td className="text-xs">{t.adapter ?? 'manual'}</td>
                <td className="text-right"><Button onClick={() => setEditing(t)}>Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {editing && <TypeForm initial={editing} onDone={() => setEditing(null)} />}
    </div>
  );
}

function TypeForm({ initial, onDone }: { initial: Partial<TotoType>; onDone: () => void }) {
  const [t, setT] = useState(initial);
  const [error, setError] = useState<unknown>(null);
  const qc = useQueryClient();
  const set = (k: keyof TotoType) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setT({ ...t, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });
  const save = async () => {
    setError(null);
    try {
      const { id, ...fields } = t;
      ok(id ? await supabase.from('toto_types').update(fields).eq('id', id).select('id')
            : await supabase.from('toto_types').insert({ ...fields, code: fields.code?.toUpperCase() }).select('id'));
      await qc.invalidateQueries({ queryKey: ['toto_types'] });
      onDone();
    } catch (e) { setError(e); }
  };
  return (
    <Card title={t.id ? `Edit ${t.code}` : 'New toto type'}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Code (e.g. STRYKTIPSET)"><input value={t.code ?? ''} onChange={set('code')} disabled={!!t.id} /></Field>
        <Field label="Name (English)"><input value={t.name_en ?? ''} onChange={set('name_en')} /></Field>
        <Field label="Name (Hebrew)"><input dir="rtl" value={t.name_he ?? ''} onChange={set('name_he')} /></Field>
        <Field label="Country (ISO-2)"><input value={t.country ?? ''} onChange={set('country')} maxLength={2} /></Field>
        <Field label="Games per round"><input type="number" min={1} max={30} value={t.games_count ?? ''} onChange={set('games_count')} /></Field>
        <Field label="Default max doubles"><input type="number" min={0} value={t.default_max_doubles ?? 0} onChange={set('default_max_doubles')} /></Field>
        <Field label="Default max triples"><input type="number" min={0} value={t.default_max_triples ?? 0} onChange={set('default_max_triples')} /></Field>
        <Field label="Timezone (IANA)"><input value={t.timezone ?? ''} onChange={set('timezone')} placeholder="Europe/Stockholm" /></Field>
        <Field label="Import">
          <select value={t.adapter ?? ''} onChange={set('adapter')}>
            <option value="">manual</option><option value="csv">CSV paste</option><option value="winner">Winner</option>
          </select>
        </Field>
        <Field label="Active"><input type="checkbox" className="size-4" checked={t.is_active ?? true} onChange={set('is_active')} /></Field>
      </div>
      <p className="mt-2 text-xs text-zinc-500">The name fields are what players see when choosing toto types for a group.</p>
      <ErrorText error={error} />
      <div className="mt-3 flex gap-2"><Button kind="primary" onClick={save}>Save</Button><Button onClick={onDone}>Cancel</Button></div>
    </Card>
  );
}
