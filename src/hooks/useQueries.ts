import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { BetResult } from '@/types/database.types';

// Query keys
export const queryKeys = {
    columns: ['columns'] as const,
    column: (id?: string) => ['column', id] as const,
    games: (columnId: string) => ['games', columnId] as const,
    bets: (columnId: string) => ['bets', columnId] as const,
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

const fetchGames = async (columnId: string) => {
    const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('column_id', columnId)
        .order('game_num');
    if (error) throw error;
    return data;
};

const fetchBets = async (columnId: string) => {
    const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('column_id', columnId)
    if (error) throw error;
    return data;
};

const fetchVoteStats = async (columnId: string) => {
    const { data: bets, error } = await supabase
        .from('bets')
        .select('game_id, value')
        .eq('column_id', columnId);

    if (error) throw error;

    // Calculate stats for each game
    const stats = bets.reduce((acc, bet) => {
        if (bet.game_id && !acc[bet.game_id]) {
            acc[bet.game_id] = {
                total: 0,
                '1': 0,
                'X': 0,
                '2': 0
            };
        }
        if (bet.game_id && bet.value) {
            acc[bet.game_id].total++;
            acc[bet.game_id][bet.value as '1' | 'X' | '2']++;
        }
        return acc;
    }, {} as Record<string, { total: number; '1': number; 'X': number; '2': number; }>);

    return stats;
};

const fetchColumnStats = async (columnId: string) => {
    // Fetch all bets with user info and game results
    const { data: bets, error: betsError } = await supabase
        .from('bets')
        .select(`
             user_id,
             value,
             games!inner (
                result
             )
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

export const useGamesQuery = (columnId: string) => {
    return useQuery({
        queryKey: queryKeys.games(columnId),
        queryFn: () => fetchGames(columnId),
        enabled: !!columnId,
    });
};

export const useBetsQuery = (columnId: string, userId: string) => {
    return useQuery({
        queryKey: queryKeys.bets(columnId),
        queryFn: () => fetchBets(columnId),
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
            gameId,
            value,
            userId,
            columnId,
            betId
        }: {
            gameId: string;
            value: BetResult;
            userId: string;
            columnId: string;
            betId?: string;
        }) => {
            if (betId) {
                const { error } = await supabase
                    .from('bets')
                    .update({ value })
                    .eq('id', betId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('bets')
                    .insert([{ game_id: gameId, value, user_id: userId, column_id: columnId }]);
                if (error) throw error;
            }
        },
        onSuccess: (_, { columnId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bets(columnId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.voteStats(columnId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.columnStats(columnId) });
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
            queryClient.invalidateQueries({ queryKey: queryKeys.games(columnId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.columnStats(columnId) });
        },
    });
}; 