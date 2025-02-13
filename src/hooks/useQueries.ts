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

const fetchUserBets = async (columnId: string, user_id: string) => {
    const { data, error } = await supabase
        .from('user_bets')
        .select(`*,
            profiles(id, name)`)
        .eq('column_id', columnId)
        .eq('user_id', user_id)
        .single();
    if (error) throw error;
    return data;
};


type GameBetValue = {
    game_num: Game['game_num'];
    value: BetResult[];
}

type UserBets = {
    user_id: User['id'];
    column_id: Column['id'];
    bet_values: GameBetValue[]
}

type GamesVotesStats =
    Record<string, { total: number; '1': number; 'X': number; '2': number; singles: number, doubles: number, triples: number, totalColumns: number }>;

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
            total: 0,
            totalColumns: 0
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
                    acc[gameBet.game_num][bet]++;
                }
            });
            if (gameBet.value.length === 1) {
                acc[gameBet.game_num].singles++;
            } else if (gameBet.value.length === 2) {
                acc[gameBet.game_num].doubles++;
            } else if (gameBet.value.length === 3) {
                acc[gameBet.game_num].triples++;
            }
            acc[gameBet.game_num].total += gameBet.value.length;
            acc[gameBet.game_num].totalColumns++;
        });

        return acc;
    }, gameVotes);
    return ab;
};

const fetchColumnStats = async (column: Column) => {
    const { games } = column;
    const { data: bets, error: betsError } = await supabase
        .from(`user_bets`)
        .select(`
            bet_values,
            profiles(id, name),
            user_id
            `)
        .eq('column_id', column.id)
        .returns<UserBets[]>();

    if (betsError) throw betsError;

    // Calculate stats for each user
    const userStats = bets.reduce((acc, bet) => {
        const { profiles: { id: userId, name }, bet_values: betValues } = bet;

        if (!acc[userId]) {
            acc[userId] = {
                user: {
                    id: userId,
                    name: name
                },
                totalBets: 0,
                correctBets: 0
            };
        }
        betValues.forEach((gameBet) => {
            const game = games?.find((game) => game.game_num == gameBet.game_num);
            if (game && game.result && gameBet.value.includes(game.result)) {
                acc[userId].correctBets++;
            }
            acc[userId].totalBets++;
        });

        return acc;
    }, {} as Record<string, {
        user: { id: string; name: string };
        totalBets: number;
        correctBets: number;
    }>);
    return Object.values(userStats).sort((a, b) => b.correctBets - a.correctBets);
};

// Query Hooks
export const useColumnQuery = (id?: string) => {
    return useQuery({
        queryKey: queryKeys.column(id),
        queryFn: () => fetchColumn(id),
    });
};

export const useUserBetsQuery = (columnId: string, userId: string) => {
    return useQuery({
        queryKey: queryKeys.user_bets(columnId, userId),
        queryFn: () => fetchUserBets(columnId, userId),
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

export const useColumnStatsQuery = (column: Column) => {
    return useQuery({
        queryKey: queryKeys.columnStats(column?.id || ''),
        queryFn: () => fetchColumnStats(column),
        enabled: !!column?.id,
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
            betValues: {
                game_num: string,
                value: BetResult[]
            };
            userId: string;
            columnId: string;
            betId?: string;
        }) => {
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
            return true;
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