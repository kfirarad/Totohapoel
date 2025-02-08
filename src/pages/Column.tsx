import { format } from 'date-fns';
import { cn, getDayName } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { he } from "date-fns/locale";
import { useAuth } from '@/contexts/AuthContext';
import { useColumnQuery, useGamesQuery, useBetsQuery, usePlaceBetMutation, useVoteStatsQuery, useColumnStatsQuery } from '@/hooks/useQueries';
import { VoteStats } from '@/components/VoteStats';
import { ColumnSummary } from '@/components/ColumnSummary';
import { BetResult } from '@/types/database.types';
import { useState } from 'react';

export const Column = () => {
    const { columnId } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [orderBy, setOrderBy] = useState<'game_num' | 'game_time'>('game_num');
    const {
        data: column,
        isLoading: isColumnLoading,
        error: columnError,
        data: { previousColumn, nextColumn } = { previousColumn: null, nextColumn: null }
    } = useColumnQuery(columnId);

    const {
        data: games = [],
        isLoading: isGamesLoading
    } = useGamesQuery(column?.id ?? '');

    const {
        data: betsData = [],
        isLoading: isBetsLoading
    } = useBetsQuery(column?.id ?? '', user?.id ?? '');

    const {
        data: voteStats = {},
        isLoading: isVoteStatsLoading
    } = useVoteStatsQuery(column?.id ?? '');

    const { mutate: placeBet } = usePlaceBetMutation();

    const {
        data: columnStats = [],
        isLoading: isStatsLoading
    } = useColumnStatsQuery(column?.id ?? '');

    // Convert bets array to a map for easier lookup
    const bets = betsData.reduce((acc, bet) => {
        acc[bet.game_id] = bet;
        return acc;
    }, {} as Record<string, { id: string; value: BetResult; }>);

    if (isColumnLoading || isGamesLoading || isBetsLoading || (profile?.is_admin && isVoteStatsLoading) || isStatsLoading) {
        return <div>טוען...</div>;
    }
    if (columnError) return <div>Error: {columnError.message}</div>;
    if (!column) return <div>No active column found</div>;

    const isDeadlinePassed = new Date(column.deadline) < new Date();

    // Calculate correct guesses
    const gamesWithResults = games.filter(game => game.result !== null);
    const correctGuesses = gamesWithResults.filter(game =>
        bets[game.id]?.value === game.result
    ).length;


    const handlePlaceBet = (gameId: string, value: BetResult, betId?: string) => {
        if (!user?.id || isDeadlinePassed) return;

        placeBet({
            gameId,
            value,
            userId: user.id,
            columnId: column.id!,
            betId
        });
    };

    const orderedGames = games.sort((a, b) => {
        if (orderBy === 'game_num') {
            return a.game_num - b.game_num;
        } else {
            return new Date(a.game_time).getTime() - new Date(b.game_time).getTime();
        }
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">{column.name}</h1>
                        <div className="flex gap-2">
                            {previousColumn && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/column/${previousColumn.id}`)}
                                >
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                    טור קודם
                                </Button>
                            )}
                            {nextColumn && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/column/${nextColumn.id}`)}
                                >
                                    טור הבא
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                </Button>
                            )}
                        </div>
                    </div>
                    {columnId && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/column')}
                        >
                            חזור לשבוע נוכחי
                        </Button>
                    )}
                </div>
                <p className="text-gray-600">
                    תאריך אחרון למשלוח: {format(new Date(column.deadline), 'PPpp', {
                        locale: he
                    })}
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_300px]">
                <div className="rounded-lg border bg-card">
                    {/* Header - Only visible on desktop */}
                    <div className="hidden md:grid grid-cols-[60px_1fr_2fr_1fr] gap-4 p-4 bg-muted/50 border-b font-medium text-muted-foreground">
                        <div>#</div>
                        <div></div>
                        <div></div>
                        <div className="flex flex-row gap-2 justify-end items-center">
                            <div className="text-sm text-muted-foreground">סדר לפי</div>
                            <Button size={'sm'} variant={orderBy === 'game_num' ? 'default' : 'outline'} onClick={() => setOrderBy('game_num')}>
                                מס׳
                            </Button>
                            <Button size={'sm'} variant={orderBy === 'game_time' ? 'default' : 'outline'} onClick={() => setOrderBy('game_time')}>
                                זמן משחק
                            </Button>
                        </div>
                    </div>

                    {/* Games List */}
                    <div className="divide-y">
                        {orderedGames.map((game) => (
                            <div key={game.id} className="grid grid-cols-1 md:grid-cols-[60px_1fr_2fr_1fr] gap-4 p-4">
                                <div className="text-left md:text-right font-medium">
                                    <span className="md:hidden text-muted-foreground text-sm">#</span>
                                    {game.game_num}
                                </div>

                                {/* Mobile: Game Details Column */}
                                <div className="md:hidden flex flex-row justify-between">
                                    {/* Game Info */}
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="font-medium">
                                            {game.home_team} - {game.away_team}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {getDayName(new Date(game.game_time))}{", "}
                                            {format(new Date(game.game_time), 'HH:mm')}
                                        </div>
                                        <div className="text-sm text-blue-600">
                                            {game.competition}
                                        </div>
                                    </div>

                                    {/* Bet Buttons */}
                                    <div className="flex flex-row gap-2 ml-4 justify-center items-center">
                                        <div>
                                            {(['1', 'X', '2'] as const).map((value) => (
                                                <button
                                                    key={value}
                                                    onClick={() => handlePlaceBet(game.id, value, bets[game.id]?.id)}
                                                    disabled={isDeadlinePassed}
                                                    className={cn(
                                                        'px-3 py-1 rounded text-sm font-medium transition-colors',
                                                        bets[game.id]?.value === value
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-muted hover:bg-muted/80',
                                                        isDeadlinePassed && 'opacity-50 cursor-not-allowed',
                                                        game.result === value && bets[game.id]?.value === value && 'ring-2 ring-green-500',
                                                        game.result === value && bets[game.id]?.value !== value && 'ring-2 ring-red-500'
                                                    )}
                                                >
                                                    {value}
                                                </button>
                                            ))}
                                        </div>
                                        <div>
                                            {(profile?.is_admin || isDeadlinePassed) && voteStats[game.id] && (
                                                <div className="mt-2">
                                                    <VoteStats stats={voteStats[game.id]} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Desktop: Time & Competition */}
                                <div className="hidden md:block">
                                    <div className="text-sm text-muted-foreground">
                                        {getDayName(new Date(game.game_time))}{", "}
                                        {format(new Date(game.game_time), 'HH:mm')}
                                    </div>
                                    <div className="text-sm text-blue-600">
                                        {game.competition}
                                    </div>
                                </div>

                                {/* Desktop: Teams */}
                                <div className="hidden md:flex items-center gap-2">
                                    <span className="font-medium">{game.home_team}</span>
                                    <span className="text-muted-foreground">vs</span>
                                    <span className="font-medium">{game.away_team}</span>
                                </div>

                                {/* Desktop: Bet Buttons */}
                                <div className="hidden md:flex gap-2 justify-start flex-col">
                                    <div className="flex flex-row gap-2 justify-center items-center">
                                        {(['1', 'X', '2'] as const).map((value) => (
                                            <button
                                                key={value}
                                                onClick={() => handlePlaceBet(game.id, value, bets[game.id]?.id)}
                                                disabled={isDeadlinePassed}
                                                className={cn(
                                                    'px-4 py-2 rounded font-medium transition-colors',
                                                    bets[game.id]?.value === value
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted hover:bg-muted/80',
                                                    isDeadlinePassed && 'opacity-50 cursor-not-allowed',
                                                    game.result === value && bets[game.id]?.value === value && 'ring-2 ring-green-500',
                                                    game.result === value && bets[game.id]?.value !== value && 'ring-2 ring-red-500'
                                                )}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                    {profile?.is_admin && voteStats[game.id] && (
                                        <div className="mt-2">
                                            <VoteStats stats={voteStats[game.id]} />
                                        </div>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    {gamesWithResults.length > 0 && (
                        <div className="p-4 bg-muted/50 border-t">
                            <p className="text-right text-sm font-medium text-muted-foreground">
                                Correct Guesses: {correctGuesses} / {gamesWithResults.length}
                            </p>
                        </div>
                    )}
                </div>

                {/* Column Summary */}
                {isDeadlinePassed && (
                    <div className="order-first md:order-last">
                        <ColumnSummary stats={columnStats as ColumnStats[]} />
                    </div>
                )}
            </div>
        </div>
    );
};
