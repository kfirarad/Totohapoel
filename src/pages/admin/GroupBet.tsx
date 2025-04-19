import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import { BetResult, Column } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn, getDayName } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { BetButtons } from '@/components/BetButtons';
import { Checkbox } from '@/components/ui/checkbox';

type OrderBy = 'game_num' | 'game_time';

export const GroupBet = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orderBy, setOrderBy] = useState<OrderBy>('game_num');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showInfo, setShowInfo] = useState(true);
    
    const [userBet, setUserBet] = useState<Record<number, BetResult[]>>({});
    const [doublesAndTriplesCount, setDoublesAndTriplesCount] = useState({
        filledBets: 0,
        doubles: 0,
        triples: 0,
    });

    const [column, setColumn] = useState<Column | null>(null);

    useEffect(() => {
        const fetchLatestColumn = async () => {
            try {
                // Fetch the latest active column
                const { data: columnData, error: columnError } = await supabase
                    .from('columns')
                    .select('*')
                    .eq('is_active', true)
                    .order('deadline', { ascending: false })
                    .limit(1)
                    .single();

                if (columnError) {
                    toast({
                        title: 'Error',
                        description: 'Failed to load latest column',
                        variant: 'destructive'
                    });
                    return;
                }

                setColumn(columnData);

                // Check if group_bet already exists
                if (columnData.group_bet && columnData.group_bet.length > 0) {
                    const formattedBets: Record<number, BetResult[]> = {};
                    columnData.group_bet.forEach((bet: { game_num: number; value: BetResult[] }) => {
                        formattedBets[bet.game_num] = bet.value;
                    });
                    setUserBet(formattedBets);
                }
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'An error occurred while fetching data',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchLatestColumn();
    }, [toast]);

    useEffect(() => {
        const filledBets = Object.values(userBet).filter(
            (bet) => bet.length > 0
        ).length;
        const doubles = Object.values(userBet).filter(
            (bet) => bet.length === 2
        ).length;
        const triples = Object.values(userBet).filter(
            (bet) => bet.length === 3
        ).length;
        setDoublesAndTriplesCount({ filledBets, doubles, triples });
    }, [userBet]);

    const handlePlaceBet = (gameId: number, value: BetResult) => {
        setUserBet((prevBet) => {
            const newValue = { ...prevBet };
            let bet = newValue[gameId] || [];
            if (bet.includes(value)) {
                bet = bet.filter((v) => v !== value);
            } else {
                bet = [...bet, value];
            }
            newValue[gameId] = bet;
            return newValue;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            if (!column) throw new Error('No column data found');

            // Format the user bet data to match the expected structure
            const groupBet = Object.entries(userBet).map(([game_num, value]) => ({
                game_num: parseInt(game_num),
                value,
            }));

            // Update the column with the group bet data
            const { error } = await supabase
                .from('columns')
                .update({
                    group_bet: groupBet
                })
                .eq('id', column.id);

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Group bet saved successfully',
                variant: 'default'
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error?.message || 'Failed to save group bet',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!column) {
        return <div>No active column found</div>;
    }

    const isDeadlinePassed = new Date(column.deadline) < new Date();

    const sortedGames = column.games.sort((a, b) => {
        if (a[orderBy] === b[orderBy]) {
            return a.game_num - b.game_num;
        }
        if (orderBy === 'game_time') {
            return sortOrder === 'asc'
                ? new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
                : new Date(b.game_time).getTime() - new Date(a.game_time).getTime();
        }
        return sortOrder === 'asc'
            ? a.game_num - b.game_num
            : b.game_num - a.game_num;
    });

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                    Group Bet - {column.name}
                </h1>
                <div className="space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/admin/columns')}
                    >
                        Back to Columns
                    </Button>
                    <Button
                        type="submit"
                        disabled={saving || 
                            doublesAndTriplesCount.filledBets < column.games.length ||
                            doublesAndTriplesCount.doubles > column.max_doubles ||
                            doublesAndTriplesCount.triples > column.max_triples}
                    >
                        {saving ? 'Saving...' : 'Save Group Bet'}
                    </Button>
                </div>
            </div>

            {isDeadlinePassed && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
                    <p className="font-bold">Information</p>
                    <p>The deadline for this column has passed. You can still edit the group bet as an admin.</p>
                </div>
            )}

            <div className="rounded-lg border bg-card">
                {/* Doubles and Triples Counter */}
                <div className="mb-4 sticky top-0 z-20 bg-card p-4 rounded-lg border-b-2">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <div>
                                <span
                                    className={cn([
                                        "font-medium",
                                        doublesAndTriplesCount.filledBets < column.games.length
                                            ? "text-red-500"
                                            : "text-green-500",
                                    ])}
                                >
                                    {doublesAndTriplesCount.filledBets === column.games.length && <>✅</>}{" "}
                                    {doublesAndTriplesCount.filledBets}/{column.games.length}
                                </span>{" "}
                                filled
                            </div>
                            <div>
                                <span
                                    className={cn([
                                        "font-medium",
                                        doublesAndTriplesCount.doubles < column.max_doubles
                                            ? "text-black"
                                            : doublesAndTriplesCount.doubles > column.max_doubles
                                                ? "text-red-500"
                                                : "text-green-500",
                                    ])}
                                >
                                    {" "}
                                    {doublesAndTriplesCount.doubles === column.max_doubles && <>✅</>}
                                    {doublesAndTriplesCount.doubles > column.max_doubles && <>❌</>}{" "}
                                    {doublesAndTriplesCount.doubles}/{column.max_doubles}
                                </span>{" "}
                                doubles
                            </div>
                            <div>
                                <span
                                    className={cn([
                                        "font-medium",
                                        doublesAndTriplesCount.triples < column.max_triples
                                            ? "text-black"
                                            : doublesAndTriplesCount.triples > column.max_triples
                                                ? "text-red-500"
                                                : "text-green-500",
                                    ])}
                                >
                                    {" "}
                                    {doublesAndTriplesCount.triples === column.max_triples && <>✅</>}
                                    {doublesAndTriplesCount.triples > column.max_triples && <>❌</>}{" "}
                                    {doublesAndTriplesCount.triples}/{column.max_triples}
                                </span>{" "}
                                triples
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="showInfo"
                                checked={showInfo}
                                onCheckedChange={() => setShowInfo(!showInfo)}
                            />
                            <label
                                htmlFor="showInfo"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Show Game Details
                            </label>
                        </div>
                    </div>

                    <div className="flex mt-4 gap-4 items-center">
                        <div className="w-1/3">
                            <div className="text-sm text-muted-foreground">Sort by</div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        {orderBy === 'game_num' ? 'Game #' : 'Game Time'}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuRadioGroup value={orderBy} onValueChange={(value) => setOrderBy(value as OrderBy)}>
                                        <DropdownMenuRadioItem value="game_num">Game #</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="game_time">Game Time</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="w-1/3">
                            <div className="text-sm text-muted-foreground">Order</div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                                        <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Games List */}
                <div className="divide-y">
                    {sortedGames.map((game) => (
                        <div key={game.game_num} className="grid grid-cols-1 md:grid-cols-[60px_2fr_2fr_1fr] gap-4 p-4">
                            <div className="text-right md:text-center font-medium">
                                <span className="md:hidden text-muted-foreground text-sm">
                                    #
                                </span>
                                {game.game_num}
                            </div>

                            {showInfo && (
                                <>
                                    {/* Game Info */}
                                    <div className="flex flex-col gap-1">
                                        <div className="font-medium">
                                            {game.home_team} vs {game.away_team}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {getDayName(new Date(game.game_time))}, {format(new Date(game.game_time), "HH:mm")}
                                        </div>
                                        <div className="text-sm text-blue-600">
                                            {game.competition}
                                        </div>
                                    </div>

                                    {/* Result if available */}
                                    <div className="flex items-center">
                                        {game.result && (
                                            <div className="text-sm font-medium">
                                                Result: <span className="text-green-600">{game.result}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {!showInfo && (
                                <div className="md:col-span-3 flex justify-between items-center">
                                    <div className="font-medium">
                                        {game.home_team} vs {game.away_team}
                                    </div>
                                    {game.result && (
                                        <div className="text-sm font-medium">
                                            Result: <span className="text-green-600">{game.result}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bet Buttons */}
                            <div className={cn(showInfo ? "" : "md:col-span-1")}>
                                <BetButtons
                                    gameNum={game.game_num}
                                    userBet={userBet}
                                    result={game.result}
                                    disabled={false}
                                    onBetPlace={handlePlaceBet}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </form>
    );
};