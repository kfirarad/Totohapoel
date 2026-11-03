import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type TeamAlias = { he_name: string; en_name: string | null; scoreaxis_team_id: string | null };

const isValidTeamId = (id: string) => !id || /^[0-9a-f]{24}$/i.test(id);

const fetchAliases = async () => {
    const { data, error } = await supabase.from('team_aliases').select('he_name, en_name, scoreaxis_team_id').order('he_name');
    if (error) throw error;
    return data as TeamAlias[];
};

const TeamRow = ({ team, onSave, onDelete }: {
    team: TeamAlias;
    onSave: (t: TeamAlias) => Promise<void>;
    onDelete: (he: string) => Promise<void>;
}) => {
    const [en, setEn] = useState(team.en_name ?? '');
    const [id, setId] = useState(team.scoreaxis_team_id ?? '');
    const [busy, setBusy] = useState(false);
    const dirty = en !== (team.en_name ?? '') || id !== (team.scoreaxis_team_id ?? '');
    const validId = isValidTeamId(id.trim());

    const run = async (fn: () => Promise<void>) => {
        setBusy(true);
        try { await fn(); } finally { setBusy(false); }
    };

    return (
        <li className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-center">
            <span className="truncate font-medium">{team.he_name}</span>
            <Input dir="ltr" aria-label={`שם באנגלית: ${team.he_name}`} placeholder="English name" value={en} onChange={(e) => setEn(e.target.value)} />
            <Input
                dir="ltr"
                aria-label={`מזהה ScoreAxis: ${team.he_name}`}
                aria-invalid={!validId}
                placeholder="ScoreAxis team id"
                className={validId ? 'font-mono text-xs' : 'font-mono text-xs border-destructive'}
                value={id}
                onChange={(e) => setId(e.target.value)}
            />
            <div className="flex gap-1">
                <Button
                    size="sm"
                    disabled={!dirty || !validId || busy}
                    onClick={() => run(() => onSave({ he_name: team.he_name, en_name: en.trim() || null, scoreaxis_team_id: id.trim() || null }))}
                >
                    שמור
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`מחק ${team.he_name}`}
                    disabled={busy}
                    onClick={() => confirm(`למחוק את "${team.he_name}"?`) && run(() => onDelete(team.he_name))}
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </li>
    );
};

export const TeamsList = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: teams = [], isLoading, error } = useQuery({ queryKey: ['team_aliases'], queryFn: fetchAliases });
    const [search, setSearch] = useState('');
    const [newHe, setNewHe] = useState('');

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['team_aliases'] });
    const fail = (e: unknown) => {
        console.error(e);
        toast({ title: 'שגיאה', description: 'הפעולה נכשלה', variant: 'destructive' });
    };

    const save = useMutation({
        mutationFn: async (t: TeamAlias) => {
            const { error } = await supabase.from('team_aliases').upsert({ ...t, updated_at: new Date().toISOString() });
            if (error) throw error;
        },
        onSuccess: () => { refresh(); toast({ title: 'נשמר' }); },
        onError: fail,
    });
    const remove = useMutation({
        mutationFn: async (he: string) => {
            const { error } = await supabase.from('team_aliases').delete().eq('he_name', he);
            if (error) throw error;
        },
        onSuccess: refresh,
        onError: fail,
    });

    const q = search.trim().toLowerCase();
    const filtered = q
        ? teams.filter((t) => `${t.he_name} ${t.en_name ?? ''} ${t.scoreaxis_team_id ?? ''}`.toLowerCase().includes(q))
        : teams;
    const exists = teams.some((t) => t.he_name === newHe.trim());

    if (isLoading) return <div className="p-4 text-muted-foreground">טוען...</div>;
    if (error) return <div className="p-4">שגיאה בטעינת הקבוצות</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">
                        קבוצות <span className="text-base font-normal text-muted-foreground">({teams.length})</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">שם הקבוצה בווינר ↔ שם ומזהה ב-ScoreAxis, לשיוך אוטומטי של משחקים חיים</p>
                </div>
                <Input
                    type="search"
                    placeholder="חיפוש בעברית, אנגלית או מזהה"
                    aria-label="חיפוש קבוצות"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                />
            </div>

            <form
                className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!newHe.trim() || exists) return;
                    save.mutate({ he_name: newHe.trim(), en_name: null, scoreaxis_team_id: null }, { onSuccess: () => setNewHe('') });
                }}
            >
                <Input
                    placeholder="שם קבוצה כפי שמופיע בווינר"
                    aria-label="קבוצה חדשה"
                    value={newHe}
                    onChange={(e) => setNewHe(e.target.value)}
                    className="max-w-xs"
                />
                <Button type="submit" variant="outline" disabled={!newHe.trim() || exists}>הוסף קבוצה</Button>
                {exists && <span className="text-sm text-muted-foreground">הקבוצה כבר קיימת</span>}
            </form>

            <ul className="divide-y rounded-2xl border bg-card">
                <li className="hidden px-4 py-2 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] md:gap-2">
                    <span>ווינר</span><span>שם באנגלית</span><span>מזהה ScoreAxis</span><span className="w-24" />
                </li>
                {filtered.map((t) => (
                    // key includes saved values so the row resets after a save/refresh
                    <TeamRow
                        key={`${t.he_name}|${t.en_name}|${t.scoreaxis_team_id}`}
                        team={t}
                        onSave={(x) => save.mutateAsync(x)}
                        onDelete={(he) => remove.mutateAsync(he)}
                    />
                ))}
                {!filtered.length && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                        {teams.length ? 'לא נמצאו קבוצות' : 'עוד אין קבוצות — הן נוספות אוטומטית בחיפוש ב-ScoreAxis'}
                    </li>
                )}
            </ul>
        </div>
    );
};
