import { Link } from "react-router-dom";

interface UserStats {
    user: {
        id: string;
        name: string;
    };
    totalBets: number;
    correctBets: number;
}

interface ColumnSummaryProps {
    columnId: string;
    stats: UserStats[];
    showScore: boolean;
}

export const ColumnSummary = ({ stats, showScore, columnId }: ColumnSummaryProps) => {
    return (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">סיכום הטור</h3>
                <span className="text-sm text-muted-foreground">
                    {stats.length} משתתפים
                </span>
            </div>

            <div className="divide-y max-h-48 overflow-y-scroll md:max-h-fit  md:overflow-y-auto">
                {stats.map((userStat) => (
                    <div
                        key={userStat.user.id}
                        className="py-2 flex justify-between items-center"
                    >
                        <div className="flex items-center gap-2">
                            <div>
                                <div className="font-medium">
                                    <Link to={`/column/${columnId}/user/${userStat.user.id}`}>
                                        {userStat.user.name}
                                    </Link>
                                </div>
                            </div>
                        </div>
                        {showScore && <div className="text-lg font-semibold">
                            {userStat.correctBets}
                        </div>}
                    </div>
                ))}
            </div>
        </div>
    );
}; 