import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Column } from '@/types/database.types';

const fetchColumns = async () => {
    const { data, error } = await supabase
        .from('columns')
        // user_bets(count): players who sent a bet for each column, counted in the same request
        .select('*, user_bets(count)')
        .order('deadline', { ascending: false });

    if (error) throw error;
    return data as (Column & { user_bets: { count: number }[] })[];
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
        return <div>טוען...</div>;
    }

    if (error) {
        return <div>שגיאה בטעינת הטורים</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">טורים</h1>
                <Link to="/admin/columns/new">
                    <Button>טור חדש</Button>
                </Link>
            </div>
            <div className="grid gap-4">
                {columns.map((column) => (
                    <div
                        key={column.id}
                        className="relative block p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <div>
                                {/* stretched link: the whole card opens the column editor */}
                                <Link to={`/admin/columns/${column.id}`} className="after:absolute after:inset-0">
                                    <h3 className="text-lg font-semibold">{column.name}</h3>
                                </Link>
                                <p className="text-sm text-muted-foreground">
                                    מועד סגירה: {format(new Date(column.deadline), 'PPpp')}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    to={`/admin/group-bet/${column.id}`}
                                    className="relative z-10 rounded px-2 py-1 text-sm font-medium bg-brand/10 hover:bg-brand/20"
                                >
                                    טופס משותף
                                </Link>
                                <span className="px-2 py-1 rounded text-sm bg-muted tabular-nums">
                                    {column.user_bets?.[0]?.count ?? 0} שיחקו
                                </span>
                                <span
                                    className={`px-2 py-1 rounded text-sm ${column.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}
                                >
                                    {column.is_active ? 'פעיל' : 'לא פעיל'}
                                </span>
                                <span
                                    className={`px-2 py-1 rounded text-sm ${new Date(column.deadline) < new Date()
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                >
                                    {new Date(column.deadline) < new Date() ? 'נסגר' : 'פתוח'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 