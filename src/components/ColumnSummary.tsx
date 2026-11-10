import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { userBetsQueryOptions } from "@/hooks/useQueries";
import { useCurrentGroup } from "@/groups/useGroup";

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

const median = (values: number[]) => {
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

// a reference row (group bet, average, median) slotted into the ranking by score
type ExtraRow = { key: string; score: number; node: ReactNode };

export const ColumnSummary = ({ stats, showScore, columnId, loading, groupBet }: ColumnSummaryProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    // warm the player's picks on hover/focus so opening their column feels instant
    const groupId = useCurrentGroup().id;
    const prefetch = (userId: string) => queryClient.prefetchQuery(userBetsQueryOptions(groupId, columnId, userId));

    const scores = stats.map((s) => s.correctBets);
    const extras: ExtraRow[] = [];

    if (groupBet) {
        extras.push({
            key: "group-bet",
            // before the deadline there's no score: pin it on top
            score: showScore ? groupBet.score : Infinity,
            node: (
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
                    <span className="flex-1 truncate text-sm font-semibold">{t("glossary:theGroupBet")}</span>
                    {showScore && <span className="font-semibold tabular-nums">{groupBet.score}</span>}
                </button>
            ),
        });
    }

    if (showScore && scores.length) {
        const reference = (label: string, symbol: string, value: number) => (
            <div className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-muted-foreground">
                <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed text-[11px] font-semibold"
                    aria-hidden
                >
                    {symbol}
                </span>
                <span className="flex-1 truncate text-sm italic">{label}</span>
                <span className="font-semibold tabular-nums">{oneDecimal(value)}</span>
            </div>
        );
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const med = median(scores);
        extras.push({ key: "average", score: avg, node: reference(t("summary.average"), "x̄", avg) });
        extras.push({ key: "median", score: med, node: reference(t("summary.median"), "Me", med) });
    }

    // players stay in their order; each reference row goes before the first player who scored less
    const rows: { key: string; node: ReactNode }[] = [];
    const pending = [...extras].sort((a, b) => b.score - a.score);
    for (const s of stats) {
        while (pending.length && s.correctBets < pending[0].score) {
            const e = pending.shift()!;
            rows.push({ key: e.key, node: e.node });
        }
        rows.push({
            key: s.user.id,
            node: (
                <Link
                    to={`/column/${columnId}/user/${s.user.id}`}
                    onMouseEnter={() => prefetch(s.user.id)}
                    onFocus={() => prefetch(s.user.id)}
                    className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted"
                >
                    <Avatar url={s.user.avatar_url} name={s.user.name} />
                    <span className="flex-1 truncate text-sm">{s.user.name}</span>
                    {showScore && <span className="font-semibold tabular-nums">{s.correctBets}</span>}
                </Link>
            ),
        });
    }
    pending.forEach((e) => rows.push({ key: e.key, node: e.node }));

    return (
        <section className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-base font-bold">{t("summary.participants")}</h2>
                {!loading && <span className="text-sm text-muted-foreground tabular-nums">{stats.length}</span>}
            </div>
            <ul>
                {loading && Array.from({ length: 5 }, (_, i) => (
                    <li key={i} className="flex items-center gap-2.5 py-2">
                        <Skeleton className="size-7 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                    </li>
                ))}
                {!loading && rows.map((r) => (
                    <li key={r.key} className="border-t first:border-t-0">
                        {r.node}
                    </li>
                ))}
            </ul>
        </section>
    );
};
