import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import { Column, BetResult } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addDays, format, nextFriday, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { useSetResultMutation, useRecalculateCorrectGuessesMutation } from '@/hooks/useQueries';
import { decodeDraw, drawToColumn, parseScoreAxisId, pickTotoDraw, winnerBookmarklet, type WinnerDraw } from '@/lib/winner';
import { SCOREAXIS_MESSAGE, SCOREAXIS_ORIGIN, scoreAxisBookmarklet, scoreAxisUrl, type ScoreAxisResult } from '@/lib/scoreaxis';

type TeamAlias = { he_name: string; en_name: string | null; scoreaxis_team_id: string | null };

interface GameFormData {
    game_num: number;
    home_team: string;
    away_team: string;
    game_time: string;
    competition: string;
    live_tracker_id: number;
    result: BetResult;
    bet_radar_id?: string | null;
}


const createEmptyGames = (deadline: string): GameFormData[] => {
    return Array.from({ length: 16 }, (_, i) => ({
        game_num: i + 1,
        home_team: '',
        away_team: '',
        competition: '',
        game_time: format(
            addDays(new Date(deadline), 1),
            "yyyy-MM-dd'T'HH:mm"
        ),
        result: null
    }));
};

export const ColumnForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [orderBy, setOrderBy] = useState<'game_num' | 'game_time' | 'result'>('game_num');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [column, setColumn] = useState<Column>({
        id: '',
        name: '',
        deadline: format(
            setHours(setMinutes(nextFriday(new Date()), 0), 8),
            "yyyy-MM-dd'T'HH:mm"
        ),
        is_active: true,
        is_archived: false,
        created_at: new Date().toISOString(),
        created_by: '',
        max_doubles: 5,
        max_triples: 4,
        games: []

    });

    const setGames = (games: GameFormData[]) => {
        setColumn(prev => ({
            ...prev,
            games
        }));
    }



    useEffect(() => {
        const fetchData = async () => {
            if (id) {
                const { data: columnData, error: columnError } = await supabase
                    .from('columns')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (columnError) {
                    toast({
                        title: 'שגיאה',
                        description: 'טעינת הטור נכשלה',
                        variant: 'destructive'
                    });
                    return;
                }

                setColumn(columnData);

                // Create a map of existing games by game number
                const existingGames = (columnData?.games || []).reduce((acc: { [x: string]: GameFormData; }, game: { game_num: string | number; }) => {
                    acc[game.game_num] = game as GameFormData;
                    return acc;
                }, {} as Record<number, GameFormData>);

                // Merge existing games with empty games to ensure 16 rows
                const mergedGames = createEmptyGames(columnData.deadline).map(emptyGame => ({
                    ...emptyGame,
                    ...existingGames[emptyGame.game_num]
                }));

                setGames(mergedGames);
            }
            setLoading(false);
        };

        fetchData();
    }, [id]);

    // ScoreAxis lookup: teams we can't resolve yet need an English name once (remembered in team_aliases)
    const [missingTeams, setMissingTeams] = useState<{ he: string; en: string }[] | null>(null);
    const [aliases, setAliases] = useState<Map<string, TeamAlias>>(new Map());
    const [scoreAxisStatus, setScoreAxisStatus] = useState('');

    const openScoreAxis = (map: Map<string, TeamAlias>) => {
        const side = (he: string) => ({ he, id: map.get(he)?.scoreaxis_team_id ?? null, en: map.get(he)?.en_name ?? null });
        const games = (column.games ?? []).filter((g) => g.home_team && g.away_team);
        window.open(
            scoreAxisUrl({
                origin: window.location.origin,
                games: games.map((g) => ({ n: g.game_num, t: new Date(g.game_time).toISOString(), home: side(g.home_team), away: side(g.away_team) })),
            }),
            'scoreaxis'
        );
        setScoreAxisStatus('בטאב של ScoreAxis שנפתח, לחץ על הסימניה "ScoreAxis ← טוטו הפועל"');
    };

    const startScoreAxis = async () => {
        const names = [...new Set((column.games ?? []).flatMap((g) => [g.home_team, g.away_team]).filter(Boolean))];
        if (!names.length) return;
        const { data, error } = await supabase.from('team_aliases').select('*').in('he_name', names);
        if (error) {
            toast({ title: 'שגיאה', description: 'טעינת שמות הקבוצות נכשלה', variant: 'destructive' });
            return;
        }
        const map = new Map((data as TeamAlias[]).map((a) => [a.he_name, a]));
        setAliases(map);
        const missing = names.filter((n) => !map.get(n)?.scoreaxis_team_id && !map.get(n)?.en_name);
        if (missing.length) setMissingTeams(missing.map((he) => ({ he, en: '' })));
        else openScoreAxis(map);
    };

    const continueWithNames = async () => {
        const named = (missingTeams ?? []).filter((t) => t.en.trim());
        if (named.length) {
            const { error } = await supabase
                .from('team_aliases')
                .upsert(named.map((t) => ({ he_name: t.he, en_name: t.en.trim(), updated_at: new Date().toISOString() })));
            if (error) console.error(error);
        }
        const map = new Map(aliases);
        named.forEach((t) => map.set(t.he, { he_name: t.he, en_name: t.en.trim(), scoreaxis_team_id: null }));
        setAliases(map);
        setMissingTeams(null);
        openScoreAxis(map);
    };

    // results posted back by the ScoreAxis bookmarklet
    useEffect(() => {
        const onMessage = async (e: MessageEvent) => {
            if (e.origin !== SCOREAXIS_ORIGIN || e.data?.type !== SCOREAXIS_MESSAGE) return;
            const results = e.data.results as ScoreAxisResult[];
            setColumn((prev) => ({
                ...prev,
                games: prev.games?.map((g) => {
                    const r = results.find((x) => x.n === g.game_num);
                    return r?.matchId ? { ...g, live_tracker_id: r.matchId as unknown as number } : g;
                }),
            }));
            // remember resolved team ids so next rounds need no search
            const learned = new Map<string, string>();
            results.forEach((r) => {
                if (r.homeId) learned.set(r.home, r.homeId);
                if (r.awayId) learned.set(r.away, r.awayId);
            });
            if (learned.size) {
                const { error } = await supabase.from('team_aliases').upsert(
                    [...learned].map(([he_name, scoreaxis_team_id]) => ({ he_name, scoreaxis_team_id, updated_at: new Date().toISOString() }))
                );
                if (error) console.error(error);
            }
            const found = results.filter((r) => r.matchId).length;
            setScoreAxisStatus(`נמצאו ${found} מתוך ${results.length} משחקים${found < results.length ? ' · את השאר אפשר להשלים ידנית' : ''} · לחץ שמור`);
            toast({ title: 'ScoreAxis', description: `נמצאו ${found} מתוך ${results.length} משחקים` });
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyDraw = (draw: WinnerDraw) => {
        const imported = drawToColumn(draw);
        // imported rows have no ScoreAxis id yet (null), which Game types as a number
        setColumn(prev => ({ ...prev, name: imported.name, deadline: imported.deadline, games: imported.games as unknown as Column['games'] }));
        toast({ title: 'יובא מווינר', description: `${imported.games.length} משחקים · ${imported.name}` });
    };

    // the Winner bookmarklet opens /admin/columns/new#winner=<draw>
    useEffect(() => {
        if (loading || id) return;
        const encoded = window.location.hash.match(/^#winner=(.+)$/)?.[1];
        if (!encoded) return;
        const draw = decodeDraw(encoded);
        history.replaceState(null, '', window.location.pathname);
        if (draw) applyDraw(draw);
        else toast({ title: 'שגיאה', description: 'נתוני הייבוא מווינר לא תקינים', variant: 'destructive' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, id]);

    const { user } = useAuth();
    const { mutateAsync: calculateCorrectGuessesAsync } = useRecalculateCorrectGuessesMutation();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        if (column.id === "") {
            column.id = undefined;
            column.created_at = undefined;
            column.created_by = user?.id;
        }



        try {

            const { error: columnError } = await supabase
                .from('columns')
                .upsert({
                    ...column,
                })
                .select()
                .single();


            calculateCorrectGuessesAsync(column.id);

            if (columnError) throw columnError;

            toast({
                title: 'הצלחה',
                description: 'הטור נשמר'
            });

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'שמירת הטור נכשלה';
            toast({
                title: 'שגיאה',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleGameChange = (index: number, field: string, value: string) => {
        const games = [...column?.games || []];
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        games[index] = {
            ...column.games?.[index],
            game_num: column.games?.[index]?.game_num || index + 1,
            [field]: value
        };

        setGames(games);
    };

    const handleSetResult = async (game: GameFormData, value: BetResult) => {
        try {
            // Optimistically update the local state
            setColumn(prev => {
                const { games = [] } = prev;
                const updatedGames = games.map(g => {
                    if (g.game_num === game.game_num) {
                        return { ...g, result: value };
                    }
                    return g;
                });
                return { ...prev, games: updatedGames };
            });

            toast({
                title: 'הצלחה',
                description: 'התוצאה עודכנה'
            });
        } catch (error: any) {
            toast({
                title: 'שגיאה',
                description: error?.message || 'עדכון התוצאה נכשל',
                variant: 'destructive'
            });
        }
    };

    const handlePasteJson = async () => {
        try {
            // accepts Winner's full GetTotoDraws response or just the Toto 16 draw
            const draw = pickTotoDraw(JSON.parse(await navigator.clipboard.readText()));
            if (!draw) throw new Error('no Toto 16 draw in clipboard');
            applyDraw(draw);
        } catch (e) {
            console.error('Failed to parse JSON data:', e);
            toast({
                title: 'שגיאה',
                description: 'לא נמצא טוטו 16 בתוכן שהודבק',
                variant: 'destructive'
            });
        }
    };

    if (loading) {
        return <div>טוען...</div>;
    }

    const isDeadlinePassed = new Date(column.deadline) < new Date();


    const sortedGames = column?.games?.sort((a, b) => {
        if (!a[orderBy] || !b[orderBy]) return 0;
        if(a[orderBy] === b[orderBy]) {
            return a.game_num - b.game_num;
        };
        if (sortOrder === 'asc') {
            return a[orderBy] > b[orderBy] ? 1 : -1;
        } else {
            return a[orderBy] < b[orderBy] ? 1 : -1;
        }
    }) || [];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                    {id ? 'עריכת טור' : 'טור חדש'}
                </h1>
                <div className="space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/admin/columns')}
                    >
                        ביטול
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'שומר...' : 'שמור'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">
                        שם הטור
                    </label>
                    <Input
                        id="name"
                        value={column.name}
                        onChange={(e) =>
                            setColumn({ ...column, name: e.target.value })
                        }
                    />
                </div>

                <div className="grid gap-2">
                    <label htmlFor="deadline" className="text-sm font-medium">
                        מועד סגירה
                    </label>
                    <Input
                        id="deadline"
                        type="datetime-local"
                        value={format(new Date(column.deadline), "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) =>
                            setColumn({ ...column, deadline: new Date(e.target.value).toISOString() })
                        }
                    />
                </div>

                <div className="flex gap-2 flex-column">
                    <div>
                        <label htmlFor="deadline" className="text-sm font-medium">
                            מס׳ כפולים
                        </label>
                        <Input
                            id="max-doubles"
                            type="number"
                            value={column.max_doubles}
                            onChange={(e) =>
                                setColumn({ ...column, max_doubles: parseInt(e.target.value) })
                            }
                        />
                    </div>

                    <div>
                        <label htmlFor="deadline" className="text-sm font-medium">
                            מס׳ משולשים
                        </label>
                        <Input
                            id="max-triples"
                            type="number"
                            value={column.max_triples}
                            onChange={(e) =>
                                setColumn({ ...column, max_triples: parseInt(e.target.value) })
                            }
                        />
                    </div>

                </div>


                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={column.is_active}
                        onChange={(e) =>
                            setColumn({ ...column, is_active: e.target.checked })
                        }
                    />
                    <label htmlFor="is_active" className="text-sm font-medium">
                        פעיל
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_archived"
                        checked={!!column.is_archived}
                        onChange={(e) =>
                            setColumn({ ...column, is_archived: e.target.checked })
                        }
                    />
                    <label htmlFor="is_archived" className="text-sm font-medium">
                        בארכיון (מוסתר מהשחקנים ומהסטטיסטיקות)
                    </label>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">משחקים</h2>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePasteJson}
                    >
                        הדבק JSON
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 text-sm">
                    {/* React blocks javascript: hrefs, so the bookmarklet href is set on the DOM node */}
                    <a
                        ref={(el) => el?.setAttribute('href', winnerBookmarklet(window.location.origin))}
                        onClick={(e) => e.preventDefault()}
                        className="cursor-grab rounded-lg bg-brand px-3 py-1.5 font-semibold text-brand-foreground"
                        title="גרור לסרגל הסימניות"
                    >
                        ייבוא לטוטו הפועל
                    </a>
                    <span className="text-muted-foreground">
                        גרור את הכפתור לסרגל הסימניות. אחר כך היכנס ל-winner.co.il ולחץ עליו — הטור ייפתח כאן ממולא.
                    </span>
                </div>

                <div className="space-y-3 rounded-xl border border-dashed p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <a
                            ref={(el) => el?.setAttribute('href', scoreAxisBookmarklet())}
                            onClick={(e) => e.preventDefault()}
                            className="cursor-grab rounded-lg bg-brand px-3 py-1.5 font-semibold text-brand-foreground"
                            title="גרור לסרגל הסימניות"
                        >
                            ScoreAxis ← טוטו הפועל
                        </a>
                        <Button type="button" variant="outline" disabled={!column.games?.some((g) => g.home_team)} onClick={startScoreAxis}>
                            מצא משחקים ב-ScoreAxis
                        </Button>
                        <span className="text-muted-foreground">
                            {scoreAxisStatus || 'גרור את הסימניה לסרגל (פעם אחת), ואז לחץ "מצא משחקים" — מזהי המעקב החי יתמלאו אוטומטית.'}
                        </span>
                    </div>

                    {missingTeams && (
                        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                            <p className="font-medium">
                                קבוצות חדשות — כתוב את השם באנגלית כפי שמופיע ב-ScoreAxis (פעם אחת בלבד, נשמר להבא):
                            </p>
                            <div className="grid gap-2 md:grid-cols-2">
                                {missingTeams.map((t, i) => (
                                    <label key={t.he} className="flex items-center gap-2">
                                        <span className="w-36 shrink-0 truncate">{t.he}</span>
                                        <Input
                                            dir="ltr"
                                            placeholder="e.g. Petah Tikva"
                                            value={t.en}
                                            onChange={(e) =>
                                                setMissingTeams(missingTeams.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)))
                                            }
                                        />
                                    </label>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" onClick={continueWithNames}>המשך ל-ScoreAxis</Button>
                                <Button type="button" variant="ghost" onClick={() => setMissingTeams(null)}>ביטול</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">שדה ריק = המשחק יידלג ותוכל להזין אותו ידנית.</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 items-center space-between">
                    <div className="w-1/3">
                        <div className="text-sm text-muted-foreground">סדר לפי</div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    {orderBy === 'game_num' ? 'מס׳' : orderBy === 'game_time' ? 'זמן משחק' : 'תוצאה'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuRadioGroup value={orderBy} onValueChange={(value) => setOrderBy(value as OrderBy)}>
                                    <DropdownMenuRadioItem value="game_num">מס׳</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="game_time">זמן משחק</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="result">תוצאה</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="w-1/3">
                        <div className="text-sm text-muted-foreground">סדר</div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    {sortOrder === 'asc' ? 'עולה' : 'יורד'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                                    <DropdownMenuRadioItem value="asc">עולה</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="desc">יורד</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>



                </div>


                <div className="rounded-lg border bg-card">
                    {/* Header - Only visible on desktop */}
                    <div className="hidden md:grid grid-cols-[60px_1fr_1fr_1fr_1fr_auto] gap-4 p-4 bg-muted/50 border-b font-medium text-muted-foreground">
                        <div>#</div>
                        <div>מסגרת</div>
                        <div>בית</div>
                        <div>חוץ</div>
                        <div>זמן משחק</div>
                        <div>מזהה מעקב חי</div>
                        {isDeadlinePassed && <div>תוצאה</div>}
                    </div>

                    {/* Games List */}
                    <div className="divide-y">
                        {sortedGames.map((game, index) => (
                            <div key={game.game_num} className="grid gap-4 p-4">
                                {/* Mobile Layout */}
                                <div className="md:hidden space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">משחק {game.game_num}</span>
                                        {isDeadlinePassed && (
                                            <div className="flex gap-2">
                                                {(['1', 'X', '2'] as const).map((value) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => handleSetResult(game, value)}
                                                        className={cn(
                                                            'px-3 py-1 rounded text-sm font-medium transition-colors',
                                                            game.result === value
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted hover:bg-muted/80'
                                                        )}
                                                    >
                                                        {value}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Input
                                        value={game.competition}
                                        onChange={(e) => handleGameChange(index, 'competition', e.target.value)}
                                        placeholder="מסגרת (או הדבקת פרטי משחק)..."
                                        className="mb-2"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={game.home_team}
                                            onChange={(e) => handleGameChange(index, 'home_team', e.target.value)}
                                            placeholder="קבוצת בית"
                                        />
                                        <Input
                                            value={game.away_team}
                                            onChange={(e) => handleGameChange(index, 'away_team', e.target.value)}
                                            placeholder="קבוצת חוץ"
                                        />
                                    </div>
                                    <Input
                                        type="datetime-local"
                                        value={format(new Date(game.game_time), "yyyy-MM-dd'T'HH:mm")}
                                        onChange={(e) => handleGameChange(index, 'game_time', new Date(e.target.value).toISOString())}
                                    />
                                </div>

                                {/* Desktop Layout */}
                                <div className="hidden md:grid grid-cols-[20px_1fr_1fr_1fr_1fr_0.5fr_auto] gap-4 items-center">
                                    <div className="font-medium">{game.game_num}</div>
                                    <div>
                                        <Input
                                            value={game.competition}
                                            onChange={(e) => handleGameChange(index, 'competition', e.target.value)}
                                            placeholder="מסגרת (או הדבקת פרטי משחק)..."
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            value={game.home_team}
                                            onChange={(e) => handleGameChange(index, 'home_team', e.target.value)}
                                            placeholder="קבוצת בית"
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            value={game.away_team}
                                            onChange={(e) => handleGameChange(index, 'away_team', e.target.value)}
                                            placeholder="קבוצת חוץ"
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            type="datetime-local"
                                            value={format(new Date(game.game_time), "yyyy-MM-dd'T'HH:mm")}
                                            onChange={(e) => handleGameChange(index, 'game_time', new Date(e.target.value).toISOString())}
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            value={game.live_tracker_id}
                                            onChange={(e) => handleGameChange(index, 'live_tracker_id', parseScoreAxisId(e.target.value) ?? e.target.value)}
                                            placeholder="מזהה / קוד הטמעה של ScoreAxis"
                                        />
                                    </div>
                                    {isDeadlinePassed && (
                                        <div className="flex gap-2">
                                            {(['1', 'X', '2'] as const).map((value) => (
                                                <button
                                                    key={value}
                                                    onClick={() => handleSetResult(game, value)}
                                                    className={cn(
                                                        'px-3 py-1 rounded text-sm font-medium transition-colors',
                                                        game.result === value
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-muted hover:bg-muted/80'
                                                    )}
                                                >
                                                    {value}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </form >
    );
};