import { useColumn } from '@/hooks/useColumn';
import { format } from 'date-fns';

export const Column = () => {
    const { column, games, isLoading, error } = useColumn();

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!column) return <div>No active column found</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">{column.name}</h1>
                <p className="text-gray-600">
                    Deadline: {format(new Date(column.deadline), 'PPpp')}
                </p>
            </div>

            <div className="space-y-4">
                {games.map((game) => (
                    <div
                        key={game.id}
                        className="border rounded p-4 flex justify-between items-center"
                    >
                        <div>
                            <p className="text-sm text-gray-600">Game {game.game_num}</p>
                            <p className="font-semibold">
                                {game.home_team} vs {game.away_team}
                            </p>
                            <p className="text-sm text-gray-600">
                                {format(new Date(game.game_time), 'PPpp')}
                            </p>
                        </div>
                        <div className="text-lg font-bold">
                            {game.result || '-'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
