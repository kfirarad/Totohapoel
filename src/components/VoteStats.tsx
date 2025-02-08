import { BetResult } from '@/types/database.types';
import { cn } from '@/lib/utils';

interface VoteStatsProps {
    stats: {
        total: number;
        '1': number;
        'X': number;
        '2': number;
    };
}

const colors = {
    '1': 'bg-blue-500',
    'X': 'bg-green-500',
    '2': 'bg-red-500'
} as const;

export const VoteStats = ({ stats }: VoteStatsProps) => {
    const keys = ['1', 'X', '2'];
    if (!stats) return null;

    return (
        <div className="space-y-1">
            <div className="flex bg-gray-100 rounded-full overflow-hidden">
                {keys.map((key, index) => (
                    stats[key] > 0 && (
                        <div
                            key={index}
                            className={cn(
                                'transition-all duration-300',
                                colors[key],
                            )}
                            style={{ width: `${stats[key] / stats['total'] * 100}%` }}
                        >
                            <div className="w-full flex items-center justify-center text-[8px] text-white font-bold text-center">
                                {key}
                                <br />
                                {stats[key] / stats['total'] * 100}%
                            </div>
                        </div>
                    )))}
            </div>
        </div>
    );
}; 