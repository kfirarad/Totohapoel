interface UserStats {
    user: {
        id: string;
        name: string;
    };
    totalBets: number;
    correctBets: number;
}

interface ColumnSummaryProps {
    stats: UserStats[];
}

export const ColumnSummary = ({ stats }: ColumnSummaryProps) => {
    // if (!stats.length) return null;

    return (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">סיכום הטור</h3>
                <span className="text-sm text-muted-foreground">
                    {stats.length} משתתפים
                </span>
            </div>

            <div className="divide-y">
                {stats.map((userStat) => (
                    <div
                        key={userStat.user.id}
                        className="py-2 flex justify-between items-center"
                    >
                        <div className="flex items-center gap-2">
                            <div>
                                <div className="font-medium">
                                    {userStat.user.name}
                                </div>
                            </div>
                        </div>
                        <div className="text-lg font-semibold">
                            {userStat.correctBets}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 