import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { userBetsQueryOptions } from "@/hooks/useQueries";

interface UserStats {
    user: {
        id: string;
        name: string;
        avatar_url?: string | null;
    };
    totalBets: number;
    correctBets: number;
}

interface ColumnSummaryProps {
    columnId: string;
    stats: UserStats[];
    showScore: boolean;
    loading?: boolean;
    /** the group column as a pseudo-participant; omitted when there is none */
    groupBet?: { score: number; selected: boolean; onSelect: () => void };
}

export const ColumnSummary = ({ stats, showScore, columnId, loading, groupBet }: ColumnSummaryProps) => {
    const queryClient = useQueryClient();
    // warm the player's picks on hover/focus so opening their column feels instant
    const prefetch = (userId: string) => queryClient.prefetchQuery(userBetsQueryOptions(columnId, userId));

    // after the deadline the group column takes its place by score; before that it's pinned on top
    const groupIndex = groupBet
        ? showScore
            ? (() => {
                const at = stats.findIndex((s) => s.correctBets < groupBet.score);
                return at === -1 ? stats.length : at;
            })()
            : 0
        : -1;
    const groupRow = groupBet && (
        <li key="group-bet" className="border-t first:border-t-0">
            <button
                onClick={groupBet.onSelect}
                aria-pressed={groupBet.selected}
                className={cn(
                    "-mx-2 my-1 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg bg-brand/10 px-2 py-2 text-start hover:bg-brand/15",
                    groupBet.selected && "ring-2 ring-inset ring-brand"
                )}
            >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground" aria-hidden>
                    <Users className="size-3.5" />
                </span>
                <span className="flex-1 truncate text-sm font-semibold">הטופס המשותף</span>
                {showScore && <span className="font-semibold tabular-nums">{groupBet.score}</span>}
            </button>
        </li>
    );

    return (
        <section className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-base font-bold">משתתפים</h2>
                {!loading && <span className="text-sm text-muted-foreground tabular-nums">{stats.length}</span>}
            </div>
            <ul>
                {loading && Array.from({ length: 5 }, (_, i) => (
                    <li key={i} className="flex items-center gap-2.5 py-2">
                        <Skeleton className="size-7 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                    </li>
                ))}
                {!loading && stats.map((userStat, i) => (
                    <Fragment key={userStat.user.id}>
                    {groupBet && i === groupIndex && groupRow}
                    <li className="border-t first:border-t-0">
                        <Link
                            to={`/column/${columnId}/user/${userStat.user.id}`}
                            onMouseEnter={() => prefetch(userStat.user.id)}
                            onFocus={() => prefetch(userStat.user.id)}
                            className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted"
                        >
                            <Avatar url={userStat.user.avatar_url} name={userStat.user.name} />
                            <span className="flex-1 truncate text-sm">{userStat.user.name}</span>
                            {showScore && (
                                <span className="font-semibold tabular-nums">{userStat.correctBets}</span>
                            )}
                        </Link>
                    </li>
                    </Fragment>
                ))}
                {!loading && groupBet && groupIndex === stats.length && groupRow}
            </ul>
        </section>
    );
};
