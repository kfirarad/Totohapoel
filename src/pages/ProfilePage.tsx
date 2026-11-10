import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useSeasonDataQuery } from "@/hooks/useQueries";
import { computePlayerStats, playerHistory } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { useMarketDates } from "@/i18n/dates";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const FORM_WEEKS = 5;
const CHART_COLUMNS = 20;


const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

export const ProfilePage = () => {
  const { profile } = useAuth();
  const { data, isLoading, error } = useSeasonDataQuery();
  const { t, i18n } = useTranslation();
  const dates = useMarketDates();
  const rtl = i18n.dir() === "rtl";
  const chartConfig = {
    me: { label: t("profile.chart.me"), color: "hsl(var(--brand))" },
    group: { label: t("glossary:theGroupBet"), color: "hsl(var(--muted-foreground))" },
    average: { label: t("profile.chart.average"), color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const { me, rank, total, history } = useMemo(() => {
    if (!data || !profile?.id) return { me: null, rank: 0, total: 0, history: [] };
    const players = computePlayerStats(data.columns, data.bets, FORM_WEEKS).sort((a, b) => b.hitRate - a.hitRate);
    const index = players.findIndex((p) => p.userId === profile.id);
    return {
      me: players[index] ?? null,
      rank: index + 1,
      total: players.length,
      history: playerHistory(data.columns, data.bets, profile.id),
    };
  }, [data, profile?.id]);

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  if (error) return <div className="p-8">{t("common.loadError")}</div>;

  const chartData = history.slice(-CHART_COLUMNS).map((h) => ({
    column: h.name,
    me: h.correct,
    // no group bet that round -> gap in the line, not a fake 0
    group: h.group,
    average: h.average,
  }));

  const tiles = me
    ? [
        { label: t("stats.hitRate"), value: pct(me.hitRate), sub: t("stats.inDraws", { count: me.columns }) },
        {
          label: t("stats.formLast", { n: FORM_WEEKS }),
          value: pct(me.formRate),
          trend: me.trend,
        },
        { label: t("stats.wins"), value: `${me.wins}`, sub: t("profile.winsSub") },
        { label: t("stats.bestWeek"), value: `${me.bestWeek}`, sub: t("profile.hitsSub") },
        {
          label: t("profile.beatGroup"),
          value: me.groupComparisons ? `${me.beatGroup}/${me.groupComparisons}` : "—",
          sub: t("glossary:draws"),
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      {/* Identity */}
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-5 md:p-6">
        <Avatar url={profile?.avatar_url} name={profile?.name} className="size-16 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{profile?.name}</h1>
          <p className="truncate text-sm text-muted-foreground"><bdi>{profile?.email}</bdi></p>
        </div>
        {me && (
          <div className="rounded-xl bg-muted px-4 py-2 text-center">
            <div className="text-xs text-muted-foreground">{t("profile.rank")}</div>
            <div className="text-lg font-bold tabular-nums">
              {rank}
              <span className="text-sm font-normal text-muted-foreground"> {t("profile.rankOf", { total })}</span>
            </div>
          </div>
        )}
      </section>

      {!me ? (
        <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
          {t("profile.empty")}
        </p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-2xl border bg-card p-4">
                <div className="text-xs text-muted-foreground">{tile.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">{tile.value}</span>
                  {"trend" in tile && tile.trend != null && Math.abs(tile.trend) >= 0.01 && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-medium",
                        tile.trend > 0 ? "text-success" : "text-destructive"
                      )}
                      title={t("stats.trendTitle")}
                    >
                      {tile.trend > 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                      {Math.round(Math.abs(tile.trend) * 100)}
                    </span>
                  )}
                </div>
                {"sub" in tile && <div className="text-xs text-muted-foreground">{tile.sub}</div>}
              </div>
            ))}
          </div>

          {/* Me vs group */}
          <section className="rounded-2xl border bg-card p-5 md:p-6">
            <h2 className="text-base font-bold">{t("profile.chart.title")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t("profile.chart.subtitle", { count: chartData.length })}</p>
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <LineChart data={chartData} margin={{ top: 8, left: rtl ? 8 : 0, right: rtl ? 0 : 8 }}>
                <CartesianGrid vertical={false} />
                {/* time runs in reading direction: in RTL the oldest is on the right */}
                <XAxis dataKey="column" reversed={rtl} tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
                <YAxis orientation={rtl ? "right" : "left"} allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="group"
                  type="monotone"
                  stroke="var(--color-group)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  dataKey="average"
                  type="monotone"
                  stroke="var(--color-average)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  dataKey="me"
                  type="monotone"
                  stroke="var(--color-me)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--color-me)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </section>

          {/* History */}
          <section className="overflow-hidden rounded-2xl border bg-card">
            <h2 className="border-b px-5 py-4 text-base font-bold md:px-6">{t("profile.history")}</h2>
            <ul className="divide-y">
              {[...history].reverse().map((h) => {
                const diff = h.group == null ? null : h.correct - h.group;
                return (
                  <li key={h.columnId}>
                    <Link
                      to={`/column/${h.columnId}/user/${profile?.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 md:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{h.name}</div>
                        <div className="text-xs text-muted-foreground">{dates.format(h.deadline, "dd.MM.yy")}</div>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {h.correct}/{h.graded}
                      </span>
                      <span
                        className={cn(
                          "w-14 rounded-md px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
                          diff == null && "text-muted-foreground",
                          diff != null && diff > 0 && "bg-brand text-brand-foreground",
                          diff != null && diff <= 0 && "bg-muted text-muted-foreground"
                        )}
                        title={t("profile.vsGroupBet")}
                      >
                        {diff == null ? "—" : diff > 0 ? `+${diff}` : diff}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
};
