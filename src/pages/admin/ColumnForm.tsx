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

interface GameFormData {
    game_num: number;
    home_team: string;
    away_team: string;
    game_time: string;
    competition: string;
    live_tracker_id: number;
    result: BetResult;
}

interface WinnerGameData {
    gameType: number;
    drawNumber: number;
    drawId: number;
    closeDateTime: string;
    stake: number;
    rows: {
        rowNumber: number;
        day: string;
        time: string;
        eventStartTime: string;
        league: string;
        teamA: string;
        teamB: string;
        period: string;
        betRadarId: string;
        status: string;
    }[];
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
                        title: 'Error',
                        description: 'Failed to load column',
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
                title: 'Success',
                description: 'Column saved successfully'
            });

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save column';
            toast({
                title: 'Error',
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
                title: 'Success',
                description: 'Game result updated successfully'
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error?.message || 'Failed to set result',
                variant: 'destructive'
            });
        }
    };

    const handlePasteJson = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const jsonData: WinnerGameData = JSON.parse(clipboardText);

            // Update column deadline from closeDateTime
            setColumn(prev => ({
                ...prev,
                deadline: jsonData.closeDateTime,
                name: `מחזור ${jsonData.drawNumber}`
            }));

            // Map the JSON data to our game format
            const newGames = jsonData.rows.map(row => ({
                game_num: row.rowNumber,
                home_team: row.teamA,
                away_team: row.teamB,
                competition: row.league,
                game_time: row.eventStartTime,
                result: null,
                live_tracker_id: null,
            }));

            setColumn({
                ...column,
                games: newGames
            });

            toast({
                title: 'Success',
                description: 'Games data imported successfully'
            });
        } catch (e) {
            console.error('Failed to parse JSON data:', e);
            toast({
                title: 'Error',
                description: 'Failed to parse JSON data',
                variant: 'destructive'
            });
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    const isDeadlinePassed = new Date(column.deadline) < new Date();


    const sortedGames = column?.games?.sort((a, b) => {
        if (!a[orderBy] || !b[orderBy]) return 0;
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
                    {id ? 'Edit Column' : 'New Column'}
                </h1>
                <div className="space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/admin/columns')}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">
                        Column Name
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
                        Deadline
                    </label>
                    <Input
                        id="deadline"
                        type="datetime-local"
                        value={column.deadline.slice(0, 16)}
                        onChange={(e) =>
                            setColumn({ ...column, deadline: e.target.value })
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
                        Active
                    </label>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Games</h2>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePasteJson}
                    >
                        Paste JSON Data
                    </Button>
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
                        <div>Competition</div>
                        <div>Home Team</div>
                        <div>Away Team</div>
                        <div>Game Time</div>
                        <div>Live Tracker ID</div>
                        {isDeadlinePassed && <div>Result</div>}
                    </div>

                    {/* Games List */}
                    <div className="divide-y">
                        {sortedGames.map((game, index) => (
                            <div key={game.game_num} className="grid gap-4 p-4">
                                {/* Mobile Layout */}
                                <div className="md:hidden space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Game {game.game_num}</span>
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
                                        placeholder="Paste game details or enter competition..."
                                        className="mb-2"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={game.home_team}
                                            onChange={(e) => handleGameChange(index, 'home_team', e.target.value)}
                                            placeholder="Home Team"
                                        />
                                        <Input
                                            value={game.away_team}
                                            onChange={(e) => handleGameChange(index, 'away_team', e.target.value)}
                                            placeholder="Away Team"
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
                                            placeholder="Paste game details or enter competition..."
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            value={game.home_team}
                                            onChange={(e) => handleGameChange(index, 'home_team', e.target.value)}
                                            placeholder="Home Team"
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            value={game.away_team}
                                            onChange={(e) => handleGameChange(index, 'away_team', e.target.value)}
                                            placeholder="Away Team"
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
                                            onChange={(e) => handleGameChange(index, 'live_tracker_id', e.target.value)}
                                            placeholder="live_tracker_id"
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