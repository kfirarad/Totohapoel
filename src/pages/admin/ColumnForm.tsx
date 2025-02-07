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

interface GameFormData {
    id?: string;
    game_num: number;
    home_team: string;
    away_team: string;
    game_time: string;
    competition: string;
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

const parseGameString = (input: string): Partial<GameFormData> => {
    try {
        // Split by spaces and dashes
        const parts = input.split(/\s+/);

        // Extract time
        const time = parts[1]; // e.g., "18:00"

        const competition = parts.slice(2, 4).join(' ');

        // Find the teams (everything after the competition, split by dash)
        const teamsString = parts.slice(2 + 2).join(' ');
        const [homeTeam, awayTeam] = teamsString.split('-').map(t => t.trim());

        // Create a date object for the game time in Israel timezone
        const today = new Date();
        const gameTime = new Date(today);
        const [hours, minutes] = time.split(':').map(Number);

        gameTime.setHours(hours + 2, minutes, 0);

        return {
            competition,
            home_team: homeTeam,
            away_team: awayTeam,
            game_time: format(gameTime, "yyyy-MM-dd'T'HH:mm")
        };
    } catch (error) {
        console.error('Failed to parse game string:', error);
        return {};
    }
};

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
    const [column, setColumn] = useState<Column>({
        id: '',
        name: '',
        deadline: format(
            setHours(setMinutes(nextFriday(new Date()), 0), 8),
            "yyyy-MM-dd'T'HH:mm"
        ),
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: ''
    });
    const [games, setGames] = useState<GameFormData[]>(() =>
        createEmptyGames(column.deadline)
    );

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

                const { data: gamesData, error: gamesError } = await supabase
                    .from('games')
                    .select('*')
                    .eq('column_id', id)
                    .order('game_num');

                if (gamesError) {
                    toast({
                        title: 'Error',
                        description: 'Failed to load games',
                        variant: 'destructive'
                    });
                    return;
                }

                setColumn(columnData);

                // Create a map of existing games by game number
                const existingGames = (gamesData || []).reduce((acc, game) => {
                    acc[game.game_num] = game;
                    return acc;
                }, {} as Record<number, GameFormData>);

                // Merge existing games with empty games to ensure 16 rows
                const mergedGames = createEmptyGames(columnData.deadline).map(emptyGame => ({
                    ...emptyGame,
                    ...(existingGames[emptyGame.game_num] || {})
                }));

                setGames(mergedGames);
            }
            setLoading(false);
        };

        fetchData();
    }, [id]);

    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        if (column.id === "") {
            column.id = undefined;
            column.created_at = undefined;
            column.created_by = user?.id;
        }



        try {
            // Save column
            const { data: savedColumn, error: columnError } = await supabase
                .from('columns')
                .upsert({
                    ...column,
                })
                .select()
                .single();

            if (columnError) throw columnError;

            // Save games
            const validGames = games.filter(game => game.home_team && game.away_team && game.game_time && game.competition);

            // Insert games that don't have an id
            const gamesToInsert = validGames.filter(game => !game.id);
            const { error: gamesInsertError } = await supabase.from('games').insert(
                gamesToInsert.map((game) => ({
                    game_num: game.game_num,
                    home_team: game.home_team,
                    away_team: game.away_team,
                    game_time: game.game_time,
                    competition: game.competition,
                    column_id: savedColumn.id,
                    result: null
                }))
            );

            const { error: gamesError } = await supabase.from('games').upsert(
                validGames.filter(game => game.id).map((game) => ({
                    id: game.id,
                    game_num: game.game_num,
                    home_team: game.home_team,
                    away_team: game.away_team,
                    game_time: game.game_time,
                    competition: game.competition,
                    column_id: savedColumn.id,
                }))
            );

            if (gamesError || gamesInsertError) throw gamesError || gamesInsertError;

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
        const newGames = [...games];
        newGames[index] = {
            ...games[index],
            [field]: value
        };
        setGames(newGames);
    };

    const handleGamePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const parsedGame = parseGameString(pastedText);

        if (Object.keys(parsedGame).length > 0) {
            const newGames = [...games];
            newGames[index] = {
                ...games[index],
                ...parsedGame
            };
            setGames(newGames);

            toast({
                title: 'Game details parsed',
                description: 'The game details have been automatically filled.',
            });
        }
    };

    const handleSetResult = async (game: GameFormData, value: BetResult) => {
        if (!game.id) return;

        const newResult = game.result === value ? null : value;

        const { error } = await supabase
            .from('games')
            .update({ result: newResult })
            .eq('id', game.id);

        if (error) {
            toast({
                title: 'Error',
                description: 'Failed to update game result',
                variant: 'destructive'
            });
            return;
        }

        const newGames = [...games];
        const gameIndex = newGames.findIndex(g => g.id === game.id);
        if (gameIndex !== -1) {
            newGames[gameIndex] = {
                ...game,
                result: newResult
            };
            setGames(newGames);
        }

        toast({
            title: 'Success',
            description: 'Game result updated'
        });
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
                result: null
            }));

            setGames(newGames);

            toast({
                title: 'Success',
                description: 'Games data imported successfully'
            });
        } catch (error) {
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
                <div className="rounded-lg border bg-card">
                    {/* Header - Only visible on desktop */}
                    <div className="hidden md:grid grid-cols-[60px_1fr_1fr_1fr_1fr_auto] gap-4 p-4 bg-muted/50 border-b font-medium text-muted-foreground">
                        <div>#</div>
                        <div>Competition</div>
                        <div>Home Team</div>
                        <div>Away Team</div>
                        <div>Game Time</div>
                        {isDeadlinePassed && <div>Result</div>}
                    </div>

                    {/* Games List */}
                    <div className="divide-y">
                        {games.map((game, index) => (
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
                                        onPaste={(e) => handleGamePaste(index, e)}
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
                                <div className="hidden md:grid grid-cols-[60px_1fr_1fr_1fr_1fr_auto] gap-4 items-center">
                                    <div className="font-medium">{game.game_num}</div>
                                    <div>
                                        <Input
                                            value={game.competition}
                                            onChange={(e) => handleGameChange(index, 'competition', e.target.value)}
                                            onPaste={(e) => handleGamePaste(index, e)}
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
        </form>
    );
}; 