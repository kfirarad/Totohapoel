import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Column, Game } from '@/types/database.types';

interface UseColumnReturn {
    column: Column | null;
    games: Game[];
    isLoading: boolean;
    error: Error | null;
}

export const useColumn = () => {
    const [data, setData] = useState<UseColumnReturn>({
        column: null,
        games: [],
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        const fetchColumn = async () => {
            try {
                // Fetch the latest active column
                const { data: column, error: columnError } = await supabase
                    .from('columns')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (columnError) throw columnError;

                // Fetch games for this column
                const { data: games, error: gamesError } = await supabase
                    .from('games')
                    .select('*')
                    .eq('column_id', column.id)
                    .order('game_num', { ascending: true });

                if (gamesError) throw gamesError;

                setData({
                    column,
                    games,
                    isLoading: false,
                    error: null,
                });
            } catch (error) {
                setData(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error as Error,
                }));
            }
        };

        fetchColumn();
    }, []);

    return data;
};
