import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Bet, BetValue } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';

export const useBets = (columnId: string) => {
    const [bets, setBets] = useState<Record<string, Bet>>({});
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchBets = async () => {
            if (!user || !columnId) return;

            const { data, error } = await supabase
                .from('bets')
                .select('*')
                .eq('column_id', columnId)
                .eq('user_id', user.id);

            if (!error && data) {
                const betsMap = data.reduce((acc, bet: Bet) => ({
                    ...acc,
                    [bet.game_id]: bet
                }), {});
                setBets(betsMap);
            }
            setLoading(false);
        };

        fetchBets();
    }, [columnId, user]);

    const placeBet = async (gameId: string, value: BetValue, betId: Bet['id']) => {
        if (!user || !columnId) return;

        const { error } = await supabase
            .from('bets')
            .upsert({
                id: betId,
                user_id: user.id,
                column_id: columnId,
                game_id: gameId,
                value
            });

        if (!error) {
            const bet = {
                ...bets[gameId],
                value
            }

            setBets(prev => ({
                ...prev,
                [gameId]: bet
            }));
        }
    };

    return { bets, loading, placeBet };
};
