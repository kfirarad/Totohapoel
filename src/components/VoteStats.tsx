import { cn } from '@/lib/utils';

type BetOption = '1' | 'X' | '2';

interface VoteStatsProps {
    stats: {
        total: number;
        '1': number;
        'X': number;
        '2': number;
    };
}

const colors: Record<BetOption, string> = {
    '1': 'bg-blue-500',
    'X': 'bg-green-500',
    '2': 'bg-red-500'
} as const;

export const VoteStats = ({ stats }: VoteStatsProps) => {
    const keys: BetOption[] = ['1', 'X', '2'];
    if (!stats) return null;

    return (
        <div className="space-y-1">
            <div className="flex bg-gray-100 rounded-full overflow-hidden">
                {keys.map((key) => (
                    stats[key] > 0 && (
                        <div
                            key={key}
                            className={cn(
                                'transition-all duration-300',
                                colors[key],
                            )}
                            style={{ width: `${(stats[key] / stats.total) * 100}%` }}
                        >
                            <div className="w-full flex items-center justify-center text-[8px] text-white font-bold text-center">
                                {key}
                                <br />
                                {Math.round((stats[key] / stats.total) * 100)}%
                            </div>
                        </div>
                    )))}
            </div>
        </div>
    );
}; 