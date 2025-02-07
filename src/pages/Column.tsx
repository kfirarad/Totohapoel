import { useColumn } from '@/hooks/useColumn';
import { useBets } from '@/hooks/useBets';
import { format } from 'date-fns';
import { cn, getDayName } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Column = () => {
    const { columnId } = useParams();
    const navigate = useNavigate();
    const { column, games, isLoading, error, previousColumn, nextColumn } = useColumn(columnId);
    const { bets, placeBet } = useBets(column?.id ?? '');

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!column) return <div>No active column found</div>;

    const isDeadlinePassed = column ? new Date(column.deadline) < new Date() : false;

    // Calculate correct guesses
    const gamesWithResults = games.filter(game => game.result !== null);
    const correctGuesses = gamesWithResults.filter(game =>
        bets[game.id]?.value === game.result
    ).length;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        {previousColumn && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/column/${previousColumn.id}`)}
                                className="flex items-center gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous Week
                            </Button>
                        )}
                        <h1 className="text-2xl font-bold">{column.name}</h1>
                        {nextColumn && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/column/${nextColumn.id}`)}
                                className="flex items-center gap-2"
                            >
                                Next Week
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {columnId && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/column')}
                        >
                            Back to Current Week
                        </Button>
                    )}
                </div>
                <p className="text-gray-600">
                    Deadline: {format(new Date(column.deadline), 'PPpp')}
                </p>
            </div>

            <div className="rounded-lg border bg-card">
                {/* Header - Only visible on desktop */}
                <div className="hidden md:grid grid-cols-[60px_1fr_2fr_1fr] gap-4 p-4 bg-muted/50 border-b font-medium text-muted-foreground">
                    <div>#</div>
                    <div>Time & Competition</div>
                    <div>Teams</div>
                    <div>Your Bet</div>
                </div>

                {/* Games List */}
                <div className="divide-y">
                    {games.map((game) => (
                        <div key={game.id} className="grid grid-cols-1 md:grid-cols-[60px_1fr_2fr_1fr] gap-4 p-4">
                            {/* Game Number - Top Right on Mobile */}
                            <div className="text-right md:text-left font-medium">
                                <span className="md:hidden text-muted-foreground text-sm">Game </span>
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
                                <div className="flex flex-col gap-2 ml-4">
                                    {(['1', 'X', '2'] as const).map((value) => (
                                        <button
                                            key={value}
                                            onClick={() => placeBet(game.id, value, bets[game.id]?.id)}
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
                            </div>

                            {/* Desktop: Time & Competition */}
                            <div className="hidden md:block">
                                <div className="text-sm text-muted-foreground">
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
                            <div className="hidden md:flex gap-2 justify-start">
                                {(['1', 'X', '2'] as const).map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => placeBet(game.id, value, bets[game.id]?.id)}
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
        </div>
    );
};
