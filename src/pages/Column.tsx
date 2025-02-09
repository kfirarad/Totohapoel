import { format } from 'date-fns';
import { cn, getDayName } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { he } from "date-fns/locale";
import { useAuth } from '@/contexts/AuthContext';
import { useColumnQuery, usePlaceBetMutation, useVoteStatsQuery, useColumnStatsQuery, useUserBetsQuery } from '@/hooks/useQueries';
import { VoteStats } from '@/components/VoteStats';
import { ColumnSummary } from '@/components/ColumnSummary';
import { BetResult } from '@/types/database.types';
import { useEffect, useState } from 'react';
import { BetButtons } from '@/components/BetButtons';

interface UserStats {
    user: {
        id: string;
        name: string;
    };
    totalBets: number;
    correctBets: number;
}

export const Column = () => {
    const { columnId } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [orderBy, setOrderBy] = useState<'game_num' | 'game_time'>('game_num');
    const [userBet, setUserBet] = useState<Record<number, BetResult[]>>({});
    const [doublesAndTriplesCount, setDoublesAndTriplesCount] = useState({ filledBets: 0, doubles: 0, triples: 0 });
    const {
        data: column,
        isLoading: isColumnLoading,
        error: columnError,
        data: { previousColumn, nextColumn } = { previousColumn: null, nextColumn: null }
    } = useColumnQuery(columnId);

    const {
        data: betsData = [],
        isLoading: isBetsLoading
    } = useUserBetsQuery(column?.id ?? '', user?.id ?? '');

    const {
        data: voteStats = {},
        isLoading: isVoteStatsLoading
    } = useVoteStatsQuery(column?.id ?? '');

    const { mutate: placeBet } = usePlaceBetMutation();

    const {
        data: columnStats = [],
        isLoading: isStatsLoading
    } = useColumnStatsQuery(column?.id ?? '');

    const isDeadlinePassed = new Date(column?.deadline) < new Date();

    // Calculate correct guesses
    //@ts-expect-error - games is not always defined
    const gamesWithResults = column?.games?.filter(game => game.result !== null) || [];
    //@ts-expect-error - games is not always defined
    const correctGuesses = gamesWithResults.filter(game =>
        userBet[game.game_num]?.includes(game.result as BetResult)
    ).length;

    const handlePlaceBet = (gameId: number, value: BetResult) => {
        if (!user?.id || isDeadlinePassed) return;

        setUserBet(prevBet => {
            const newValue = { ...prevBet };
            let bet = newValue[gameId] || [];
            if (bet.includes(value)) {
                bet = bet.filter(v => v !== value);
            } else {
                bet = [...bet, value];
            }
            newValue[gameId] = bet;
            return newValue;
        });
    };

    const submitBet = () => {
        if (!user?.id || isDeadlinePassed) return;

        placeBet({
            betId: betsData?.id,
            columnId: column.id,
            userId: user.id,
            betValues: Object.entries(userBet).map(([gameId, bet]) => ({
                game_id: gameId,
                value: bet
            }))
        })

    };

    useEffect(() => {
        // const bets = new Map();
        // if (betsData?.bet_values) {
        //     betsData.bet_values.forEach((bet) => {
        //         bets.set(bet.game_id, { value: bet.value });
        //     });
        //     if (JSON.stringify(Array.from(bets)) !== JSON.stringify(Array.from(userBet))) {
        //         setUserBet(bets);
        //     }
        // }

        const bets = {};
        if (betsData?.bet_values) {
            betsData.bet_values.forEach((bet) => {
                bets[bet.game_id] = bet.value;
            });
            setUserBet(bets);
        }

    }, [betsData]);

    useEffect(() => {
        const filledBets = Object.values(userBet).filter(bet => bet.length > 0).length;
        const doubles = Object.values(userBet).filter(bet => bet.length === 2).length;
        const triples = Object.values(userBet).filter(bet => bet.length === 3).length;
        setDoublesAndTriplesCount({ filledBets, doubles, triples });
    }, [userBet]);

    const orderedGames = column?.games?.sort((a, b) => {
        if (orderBy === 'game_num') {
            return a.game_num - b.game_num;
        } else {
            return new Date(a.game_time).getTime() - new Date(b.game_time).getTime();
        }
    }) || [];

    if (isColumnLoading || isBetsLoading || (profile?.is_admin && isVoteStatsLoading) || isStatsLoading) {
        return <div>טוען...</div>;
    }
    if (columnError) return <div>Error: {columnError.message}</div>;
    if (!column) return <div>לא נמצא טור פעיל</div>;

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

            {/* Doubles & Triples Counter */}
            <div className="grid gap-6 md:grid-cols-[1fr_300px]">
                <div className="rounded-lg border bg-card">
                    <div className="mb-4 sticky top-0 z-10 bg-card p-4 rounded-lg border-b-2">
                        <div className="flex justify-between items-center">
                            {!isDeadlinePassed && (<>

                                <div className="flex gap-4 items-center">
                                    <div>
                                        <span className={cn(["font-medium",
                                            doublesAndTriplesCount.filledBets < column?.games?.length ? 'text-red-500' : 'text-green-500'
                                        ])}>
                                            {doublesAndTriplesCount.filledBets}/{column?.games?.length}</span> מלאים
                                    </div>
                                    <div>
                                        <span className={cn(["font-medium",
                                            doublesAndTriplesCount.doubles > column.max_doubles ? 'text-red-500' : 'text-green-500'
                                        ])}>
                                            {doublesAndTriplesCount.doubles}/{column.max_doubles}
                                        </span> כפולים
                                    </div>
                                    <div>
                                        <span className={cn(["font-medium",
                                            doublesAndTriplesCount.triples > column.max_triples ? 'text-red-500' : 'text-green-500'
                                        ])}
                                        >
                                            {doublesAndTriplesCount.triples}/{column.max_triples}</span> משולשים
                                    </div>
                                </div>
                                <div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={doublesAndTriplesCount.doubles > column.max_doubles || doublesAndTriplesCount.triples > column.max_triples}
                                        onClick={submitBet}
                                    >
                                        שלח טופס
                                    </Button>
                                </div></>)}
                            {
                                isDeadlinePassed && (
                                    <div className="flex gap-4 items-center">
                                        <p className="text-right text-sm font-medium text-muted-foreground">
                                            ניחושים נכונים : {correctGuesses}/{gamesWithResults.length}
                                            {" "}
                                            ({(correctGuesses / gamesWithResults.length * 100)}%)
                                        </p>
                                    </div>
                                )
                            }
                        </div>
                    </div>
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
                            <div key={game.game_num} className="grid grid-cols-1 md:grid-cols-[60px_1fr_2fr_1fr] gap-4 p-4">
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
                                <div className="flex gap-2 justify-start flex-col">
                                    <BetButtons
                                        gameNum={game.game_num}
                                        userBet={userBet}
                                        result={game.result}
                                        isDeadlinePassed={isDeadlinePassed}
                                        onBetPlace={handlePlaceBet}
                                    />
                                    {profile?.is_admin && voteStats[game.game_num] && (
                                        <div className="mt-2">
                                            <VoteStats stats={voteStats[game.game_num]} />
                                        </div>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                </div>

                {/* Column Summary */}
                {isDeadlinePassed && (
                    <div className="order-first md:order-last">
                        <ColumnSummary stats={columnStats as UserStats[]} />
                    </div>
                )}
            </div>
        </div>
    );
};
