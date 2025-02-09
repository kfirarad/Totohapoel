import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { BetResult, Column, Game } from '@/types/database.types';
import { User } from '@supabase/supabase-js';

// Query keys
export const queryKeys = {
    columns: ['columns'] as const,
    column: (id?: string) => ['column', id] as const,
    user_bets: (columnId: string, userId: string) => ['user_bets', columnId, userId] as const,
    voteStats: (columnId: string) => ['voteStats', columnId] as const,
    columnStats: (columnId: string) => ['columnStats', columnId] as const,
};

// Fetch functions
const fetchColumn = async (id?: string) => {
    let currentColumn;

    if (id) {
        const { data, error } = await supabase
            .from('columns')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        currentColumn = data;
    } else {
        const { data, error } = await supabase
            .from('columns')
            .select('*')
            .eq('is_active', true)
            .order('deadline', { ascending: false })
            .limit(1)
            .single();
        if (error) throw error;
        currentColumn = data;
    }

    // Fetch previous column
    const { data: previousColumn } = await supabase
        .from('columns')
        .select('*')
        .lt('deadline', currentColumn.deadline)
        .order('deadline', { ascending: false })
        .limit(1)
        .single();

    // Fetch next column
    const { data: nextColumn } = await supabase
        .from('columns')
        .select('*')
        .gt('deadline', currentColumn.deadline)
        .order('deadline', { ascending: true })
        .limit(1)
        .single();

    return {
        ...currentColumn,
        previousColumn,
        nextColumn
    };
};

const fetchUserBets = async (columnId: string) => {
    const { data, error } = await supabase
        .from('user_bets')
        .select('*')
        .eq('column_id', columnId)
        .single();
    if (error) throw error;
    return data;
};


type GameBetValue = {
    game_id: Game['id'];
    value: BetResult[];
}

type UserBets = {
    user_id: User['id'];
    column_id: Column['id'];
    bet_values: GameBetValue[]
}

type GamesVotesStats =
    Record<string, { total: number; '1': number; 'X': number; '2': number; singles: number, doubles: number, triples: number }>

const fetchVoteStats = async (columnId: string) => {
    const { data: column, error: gamesError } = await supabase
        .from('columns')
        .select('games')
        .eq('id', columnId)
        .returns<Column[]>()
        .single();

    if (gamesError) throw gamesError;

    const { games = [] } = column;

    const gameVotes: GamesVotesStats = games.reduce((acc, game) => {
        acc[game.game_num] = {
            '1': 0,
            'X': 0,
            '2': 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            total: 0
        };
        return acc;
    }, {} as GamesVotesStats);

    const { data: userBets, error } = await supabase
        .from('user_bets')
        .select('*')
        .eq('column_id', columnId)
        .order('created_at', { ascending: false })
        .returns<UserBets[]>()

    if (error) throw error;

    const ab = userBets.reduce((acc, userBet) => {
        userBet.bet_values.forEach((gameBet) => {
            gameBet.value.forEach((bet) => {
                if (bet === '1' || bet === 'X' || bet === '2') {
                    acc[gameBet.game_id][bet]++;
                }
            });
            if (gameBet.value.length === 1) {
                acc[gameBet.game_id].singles++;
            } else if (gameBet.value.length === 2) {
                acc[gameBet.game_id].doubles++;
            } else if (gameBet.value.length === 3) {
                acc[gameBet.game_id].triples++;
            }
            acc[gameBet.game_id].total++;
        });

        return acc;
    }, gameVotes);

    console.log('ab', ab);
    return ab;
};

const fetchColumnStats = async (columnId: string) => {
    const { data: bets, error: betsError } = await supabase
        .from(`user_bets`)
        .select(`
            bet_values,
            profiles(id, name),
            user_id
            `)
        .eq('column_id', columnId);

    if (betsError) throw betsError;

    // Calculate stats for each user
    const userStats = bets.reduce((acc, bet) => {
        const userId = bet.user_id;
        if (!acc[userId]) {
            acc[userId] = {
                user: {
                    id: userId,
                    name: ''
                },
                totalBets: 0,
                correctBets: 0
            };
        }

        acc[userId].totalBets++;
        // @ts-expect-error - games is not always defined
        if (bet.games?.result && bet.value === bet.games.result) {
            acc[userId].correctBets++;
        }

        return acc;
    }, {} as Record<string, {
        user: { id: string; name: string };
        totalBets: number;
        correctBets: number;
    }>);

    // Get names from user_id
    const { data: userNames } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', Object.keys(userStats));

    // Add names to userStats
    Object.keys(userStats).forEach((key) => {
        const user = userNames?.find((user) => user.id === key);
        if (user) {
            userStats[key].user.name = user.name;
        }
    });

    return Object.values(userStats).sort((a, b) => b.correctBets - a.correctBets);
};

// Query Hooks
export const useColumnQuery = (id?: string) => {
    return useQuery({
        queryKey: queryKeys.column(id),
        queryFn: () => fetchColumn(id),
    });
};

// export const useGamesQuery = (columnId: string) => {
//     return useQuery({
//         queryKey: queryKeys.games(columnId),
//         queryFn: () => fetchGames(columnId),
//         enabled: !!columnId,
//     });
// };

export const useUserBetsQuery = (columnId: string, userId: string) => {
    return useQuery({
        queryKey: queryKeys.user_bets(columnId, userId),
        queryFn: () => fetchUserBets(columnId),
        enabled: !!columnId && !!userId,
    });
};

export const useVoteStatsQuery = (columnId: string) => {
    return useQuery({
        queryKey: queryKeys.voteStats(columnId),
        queryFn: () => fetchVoteStats(columnId),
        enabled: !!columnId,
    });
};

export const useColumnStatsQuery = (columnId: string) => {
    return useQuery({
        queryKey: queryKeys.columnStats(columnId),
        queryFn: () => fetchColumnStats(columnId),
        enabled: !!columnId,
    });
};

// Mutation Hooks
export const usePlaceBetMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            betValues,
            userId,
            columnId,
            betId
        }: {
            betValues: UserBets['bet_values'];
            userId: string;
            columnId: string;
            betId?: string;
        }) => {

            console.log(betValues, userId, columnId, betId);

            if (betId) {
                const { error } = await supabase
                    .from('user_bets')
                    .update({ bet_values: betValues })
                    .eq('id', betId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('user_bets')
                    .insert([{ bet_values: betValues, user_id: userId, column_id: columnId }]);
                if (error) throw error;
            }
        },
        onSuccess: (_, { columnId, userId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.voteStats(columnId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.columnStats(columnId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.user_bets(columnId, userId) });
        },
    });
};

export const useSetResultMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            gameId,
            value,
            columnId
        }: {
            gameId: string;
            value: BetResult;
            columnId: string;
        }) => {
            const { error } = await supabase
                .from('games')
                .update({ result: value })
                .eq('id', gameId);
            if (error) throw error;

            // Return columnId for use in onSuccess
            return { columnId };
        },
        onSuccess: ({ columnId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.columnStats(columnId) });
        },
    });
}; 