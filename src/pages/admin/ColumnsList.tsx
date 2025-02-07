import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import { Column } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export const ColumnsList = () => {
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchColumns = async () => {
            const { data, error } = await supabase
                .from('columns')
                .select('*')
                .order('deadline', { ascending: false });

            if (!error && data) {
                setColumns(data);
            }
            setLoading(false);
        };

        fetchColumns();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Columns</h1>
                <Link to="/admin/columns/new">
                    <Button>Add New Column</Button>
                </Link>
            </div>
            <div className="grid gap-4">
                {columns.map((column) => (
                    <Link
                        key={column.id}
                        to={`/admin/columns/${column.id}`}
                        className="block p-4 bg-card rounded-lg shadow hover:shadow-md transition-shadow"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold">{column.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Deadline: {format(new Date(column.deadline), 'PPpp')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-sm ${column.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {column.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}; 