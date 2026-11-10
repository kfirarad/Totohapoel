import { useMemo, useState, type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSeasonDataQuery } from "@/hooks/useQueries";
import { closedColumns, computePlayerStats, type PlayerStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";

const FORM_OPTIONS = [3, 5, 10];

type SortKey = "hitRate" | "formRate" | "correct" | "wins" | "bestWeek" | "beatGroup" | "singlesHitRate" | "columns";

const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

const Trend = ({ value }: { value: number | null }) => {
  const { t } = useTranslation();
  if (value == null || Math.abs(value) < 0.01) return null;
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-xs", up ? "text-success" : "text-destructive")}
      title={t("stats.trendTitle")}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {Math.round(Math.abs(value) * 100)}
    </span>
  );
};

export const StatsPage = () => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useSeasonDataQuery();
  const [formWeeks, setFormWeeks] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("hitRate");

  const players = useMemo(
    () => (data ? computePlayerStats(data.columns, data.bets, formWeeks) : []),
    [data, formWeeks]
  );
  const closedCount = useMemo(() => (data ? closedColumns(data.columns).length : 0), [data]);

  const sorted = useMemo(
    () => [...players].sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1) || b.hitRate - a.hitRate),
    [players, sortKey]
  );
  const leader = (key: SortKey) => [...players].sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1))[0];

  if (isLoading) return <div className="flex justify-center p-8">{t("common.loading")}</div>;
  if (error) return <div className="p-8">{t("common.loadError")}</div>;
  if (!players.length) return <div className="p-8">{t("stats.empty")}</div>;

  const columns: { key: SortKey; label: string; render: (p: PlayerStats) => ReactNode }[] = [
    {
      key: "hitRate",
      label: t("stats.hitRate"),
      render: (p) => (
        <span className="inline-flex items-baseline gap-1.5">
          {pct(p.hitRate)}
          <span className="text-xs font-normal text-muted-foreground">{t("stats.drawsInParens", { count: p.columns })}</span>
        </span>
      ),
    },
    {
      key: "formRate",
      label: t("stats.formLast", { n: formWeeks }),
      render: (p) => (
        <span className="inline-flex items-center gap-1.5">
          {pct(p.formRate)} <Trend value={p.trend} />
        </span>
      ),
    },
    { key: "correct", label: t("stats.totalHits"), render: (p) => p.correct },
    { key: "wins", label: t("stats.wins"), render: (p) => p.wins },
    { key: "bestWeek", label: t("stats.bestWeek"), render: (p) => p.bestWeek },
    {
      key: "beatGroup",
      label: t("stats.beatGroup"),
      render: (p) => (p.groupComparisons ? `${p.beatGroup}/${p.groupComparisons}` : "—"),
    },
    { key: "singlesHitRate", label: t("stats.singlesAccuracy"), render: (p) => pct(p.singlesHitRate) },
    { key: "columns", label: t("glossary:draws"), render: (p) => p.columns },
  ];

  const highlights = [
    {
      label: t("stats.hitRate"),
      player: leader("hitRate"),
      value: (p: PlayerStats) => (
        <>
          {pct(p.hitRate)}
          <span className="ms-1.5 text-xs font-normal text-muted-foreground">{t("stats.inDraws", { count: p.columns })}</span>
        </>
      ),
    },
    { label: t("stats.inFormLast", { n: formWeeks }), player: leader("formRate"), value: (p: PlayerStats) => pct(p.formRate) },
    { label: t("stats.mostWins"), player: leader("wins"), value: (p: PlayerStats) => `${p.wins}` },
    { label: t("stats.bestWeek"), player: leader("bestWeek"), value: (p: PlayerStats) => t("stats.hits", { count: p.bestWeek }) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("stats.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("stats.closedDraws", { count: closedCount })}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("stats.formBy")}</span>
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="group" aria-label={t("stats.formWeeksLabel")}>
            {FORM_OPTIONS.map((n) => (
              <button
                key={n}
                aria-pressed={formWeeks === n}
                onClick={() => setFormWeeks(n)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm",
                  formWeeks === n ? "bg-background font-semibold shadow-xs" : "text-muted-foreground"
                )}
              >
                {t("stats.lastN", { n })}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {highlights.map(({ label, player, value }) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 flex items-center gap-2 font-semibold">
              <Avatar url={player.avatarUrl} name={player.name} className="size-6" />
              <span className="truncate">{player.name}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{value(player)}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>
              <th className="sticky right-0 bg-muted p-3 text-right font-medium">{t("stats.player")}</th>
              {columns.map((c) => (
                <th key={c.key} className="p-0 text-right font-medium whitespace-nowrap" aria-sort={sortKey === c.key ? "descending" : undefined}>
                  <button
                    onClick={() => setSortKey(c.key)}
                    className={cn("w-full p-3 text-right", sortKey === c.key && "font-semibold text-foreground")}
                  >
                    {c.label}
                    {sortKey === c.key && " ↓"}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.userId} className="border-b last:border-0">
                <td className="sticky right-0 bg-card p-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                    <Avatar url={p.avatarUrl} name={p.name} />
                    <span className="font-medium">{p.name}</span>
                  </span>
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={cn("p-3 whitespace-nowrap tabular-nums", sortKey === c.key && "font-semibold")}>
                    {c.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
