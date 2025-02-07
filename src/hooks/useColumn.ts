import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Column, Game } from '@/types/database.types';

export const useColumn = (columnId?: string) => {
    const [column, setColumn] = useState<Column | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [previousColumn, setPreviousColumn] = useState<Column | null>(null);
    const [nextColumn, setNextColumn] = useState<Column | null>(null);

    useEffect(() => {
        const fetchColumn = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let columnQuery;

                if (columnId) {
                    // Fetch specific column by ID
                    const { data, error } = await supabase
                        .from('columns')
                        .select('*')
                        .eq('id', columnId)
                        .single();

                    if (error) throw error;
                    columnQuery = data;
                } else {
                    // Fetch latest active column
                    const { data, error } = await supabase
                        .from('columns')
                        .select('*')
                        .eq('is_active', true)
                        .order('deadline', { ascending: false })
                        .limit(1)
                        .single();

                    if (error && error.code !== 'PGRST116') throw error;
                    columnQuery = data;
                }

                if (columnQuery) {
                    setColumn(columnQuery);

                    // Fetch previous column
                    const { data: prevData } = await supabase
                        .from('columns')
                        .select('*')
                        .lt('deadline', columnQuery.deadline)
                        .order('deadline', { ascending: false })
                        .limit(1)
                        .single();

                    setPreviousColumn(prevData);

                    // Fetch next column
                    const { data: nextData } = await supabase
                        .from('columns')
                        .select('*')
                        .gt('deadline', columnQuery.deadline)
                        .order('deadline', { ascending: true })
                        .limit(1)
                        .single();

                    setNextColumn(nextData);

                    // Fetch games for the current column
                    const { data: gamesData, error: gamesError } = await supabase
                        .from('games')
                        .select('*')
                        .eq('column_id', columnQuery.id)
                        .order('game_num');

                    if (gamesError) throw gamesError;
                    setGames(gamesData || []);
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('An error occurred'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchColumn();
    }, [columnId]);

    return {
        column,
        games,
        isLoading,
        error,
        previousColumn,
        nextColumn
    };
};
