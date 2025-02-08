import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Column } from '@/types/database.types';

const fetchColumns = async () => {
    const { data, error } = await supabase
        .from('columns')
        .select('*')
        .order('deadline', { ascending: false });

    if (error) throw error;
    return data;
};

export const ColumnsList = () => {
    const {
        data: columns = [],
        isLoading,
        error
    } = useQuery({
        queryKey: ['columns'],
        queryFn: fetchColumns
    });

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error loading columns</div>;
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
                {columns.map((column: Column) => (
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
                                <span
                                    className={`px-2 py-1 rounded text-sm ${column.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}
                                >
                                    {column.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span
                                    className={`px-2 py-1 rounded text-sm ${new Date(column.deadline) < new Date()
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                >
                                    {new Date(column.deadline) < new Date() ? 'Past' : 'Upcoming'}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}; 