import { formatDistanceToNowStrict } from "date-fns";
import { useTranslation } from "react-i18next";
import { Teams, teamWeight } from "@/components/Teams";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMarketDates } from "@/i18n/dates";
import { standingsLeagueId } from "@/markets/il/standings";
import { useAuth } from "@/contexts/AuthContext";
import {
  useColumnQuery,
  usePlaceBetMutation,
  useVoteStatsQuery,
  useColumnStatsQuery,
  useUserBetsQuery,
  useSeasonDataQuery,
  columnQueryOptions,
  userBetsQueryOptions,
} from "@/hooks/useQueries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formVotes, formWeights, readAlgoSettings } from "@/lib/stats";
import { VoteHeatmap } from "@/components/VoteHeatmap";
import { ColumnSummary } from "@/components/ColumnSummary";
import { BetResult, Game } from "@/types/database.types";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BetButtons, betOutcome } from "@/components/BetButtons";
import { CircleCheck, CircleX } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Banner } from "@/components/Banner";
import { Segmented } from "@/components/Segmented";
import { LimitTiles } from "@/components/LimitTiles";
import { StandingWidget } from "@/components";
import { LiveMatchWidget } from "@/components/LiveMatchWidget";
import { supabase } from "@/services/supabase";
interface UserStats {
  user: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
  totalBets: number;
  correctBets: number;
}

type OrderBy = "game_num" | "game_time" | "triples";

const initialSettings = JSON.parse(localStorage.getItem("settings") || `{}`);

type Bets = Record<number, BetResult[]>;

// Order-insensitive fingerprint, ignoring empty games, to compare picks with the saved column
const betsFingerprint = (bets: Bets) =>
  JSON.stringify(
    Object.entries(bets)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => [Number(k), [...v].sort()])
      .sort((a, b) => (a[0] as number) - (b[0] as number))
  );

const readDraft = (key: string): Bets | null => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

const writeDraft = (key: string, bets: Bets | null) => {
  try {
    if (bets) localStorage.setItem(key, JSON.stringify(bets));
    else localStorage.removeItem(key);
  } catch {
    // storage unavailable (private mode / quota) - draft is a convenience only
  }
};

export const Column = () => {
  const { columnId, userId: userIdParam } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const dates = useMarketDates();

  const [orderBy, setOrderBy] = useState<OrderBy>(
    initialSettings.orderBy || "game_num"
  );
  const [userBet, setUserBet] = useState<Record<number, BetResult[]>>({});
  const [showVoteStats, setShowVoteStats] = useState(
    initialSettings.showVoteStats || false
  );
  const [showLiveMatchWidget, setShowLiveMatchWidget] = useState(
    initialSettings.showLiveFrames ?? false
  );
  // per-game manual override of the live match frame (toggled by pressing the match)
  const [liveFrameOverride, setLiveFrameOverride] = useState<Record<number, boolean>>({});
  const [showGroupBet, setShowGroupBet] = useState(
    initialSettings.showGroupBet || false
  );
  const [standingWidgetLeague, setStandingWidgetLeague] = useState<
    string | null
  >(null);
  // Save outcome shown in the bottom bar; success auto-hides
  const [notice, setNotice] = useState<"ok" | "fail" | null>(null);
  useEffect(() => {
    if (notice !== "ok") return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const [gameFilter, setGameFilter] = useState<"all" | "correct" | "incorrect" | "future">("all");

  const [calcType, setCalcType] = useState<"weighted" | "classic" | "form">("classic");
  useEffect(() => {
    localStorage.setItem(
      "settings",
      JSON.stringify({
        orderBy,
        showVoteStats,
        showGroupBet,
        showLiveFrames: showLiveMatchWidget,
      })
    );
  }, [orderBy, showVoteStats, showGroupBet, showLiveMatchWidget]);

  const {
    data: column,
    isLoading: isColumnLoading,
    isPlaceholderData: isColumnSwitching,
    error: columnError,
    data: { previousColumn, nextColumn } = {
      previousColumn: null,
      nextColumn: null,
    },
    refetch: refetchColumn,
  } = useColumnQuery(columnId);

  useEffect(() => {
    if (columnId !== undefined) {
      return;
    }
    const channels = supabase
      .channel("custom-update-channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "columns" },
        () => {
          refetchColumn();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channels);
    };
  }, [columnId, refetchColumn]);

  const {
    data: betsData,
    isLoading: isBetsLoading,
    refetch: refetchUserBets,
  } = useUserBetsQuery(column?.id ?? "", userIdParam || user?.id || "");

  // on someone else's column, also load my picks so I can compare
  const viewingOther = !!userIdParam && userIdParam !== user?.id;
  const { data: myBetsData } = useUserBetsQuery(viewingOther ? column?.id ?? "" : "", user?.id ?? "");
  const [compareMine, setCompareMine] = useState(false);
  useEffect(() => setCompareMine(false), [userIdParam]);

  // the current round (what /column shows), to know whether "back to current" makes sense
  const { data: currentColumn } = useQuery(columnQueryOptions());

  useEffect(() => {
    const channels = supabase
      .channel("custom-insert-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_bets" },
        () => {
          refetchUserBets();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channels);
    };
  }, [refetchUserBets]);

  const { data: voteStats = {} } =
    useVoteStatsQuery(column?.id ?? "");

  const { mutateAsync: placeBet, isPending: isSaving } = usePlaceBetMutation();

  // "Form" mode: each vote weighted by the voter's form in the columns before this one
  const { data: season } = useSeasonDataQuery(calcType === "form");
  const formVoteByGame = useMemo(() => {
    if (!season || !column?.id) return null;
    const { formWeeks, power } = readAlgoSettings();
    const weightOf = formWeights(season.columns, season.bets, new Date(column.deadline), formWeeks, power);
    return formVotes(season.bets.filter((b) => b.column_id === column.id), weightOf);
  }, [season, column?.id, column?.deadline]);

  const { data: columnStats = [], isLoading: isStatsLoading } =
    useColumnStatsQuery(column);

  const isDeadlinePassed = new Date(column?.deadline) < new Date();

  // Calculate correct guesses
  //@ts-expect-error - games is not always defined
  const gamesWithResults =
    column?.games?.filter((game) => game.result !== null) || [];
  //@ts-expect-error - games is not always defined
  const correctGuesses = gamesWithResults.filter((game) =>
    userBet[game.game_num]?.includes(game.result as BetResult)
  ).length;

  const formatBetsFromBetsData = (
    betsValues?: {
      game_num: number;
      value: BetResult[];
    }[]
  ) => {
    if (!betsValues) return {};
    const bets: Record<number, BetResult[]> = {};
    betsValues.forEach((bet) => {
      bets[bet.game_num] = bet.value;
    });
    return bets;
  };

  const formattedGroupBet = formatBetsFromBetsData(column?.group_bet);

  const correctGroupGuesses = gamesWithResults.filter((game) =>
    formattedGroupBet[game.game_num]?.includes?.(game.result as BetResult)
  ).length;


  const handlePlaceBet = (gameId: number, value: BetResult) => {
    if (!isCurrentUserColumn || isDeadlinePassed) return;

    const bet = userBet[gameId] || [];
    const newValue = {
      ...userBet,
      [gameId]: bet.includes(value)
        ? bet.filter((v) => v !== value)
        : [...bet, value],
    };
    setUserBet(newValue);
    setNotice(null);
    if (draftKey) {
      writeDraft(
        draftKey,
        betsFingerprint(newValue) === betsFingerprint(serverBets)
          ? null
          : newValue
      );
    }
  };

  const submitBet = async () => {
    if (!user?.id || isDeadlinePassed || isSaving) return;

    setNotice(null);
    try {
      await placeBet({
        betValues: Object.entries(userBet).map(([game_num, bet]) => ({
          game_num,
          value: bet,
        })),
        columnId: column.id,
        userId: user.id,
      });
    } catch (e) {
      console.error(e);
      setNotice("fail");
      return;
    }
    if (draftKey) writeDraft(draftKey, null);
    setNotice("ok");
  };

  const userId = userIdParam || user?.id;
  const isCurrentUserColumn = userId === user?.id;

  // whose picks are shown: the viewed column, mine (only on someone else's column) or the group bet
  type PickSource = "viewed" | "me" | "group";
  const myBets = formatBetsFromBetsData(myBetsData?.bet_values);
  const pickSource: PickSource = showGroupBet ? "group" : compareMine && !isCurrentUserColumn ? "me" : "viewed";
  const setPickSource = (source: PickSource) => {
    setShowGroupBet(source === "group");
    setCompareMine(source === "me");
  };
  const displayedBets = pickSource === "group" ? formattedGroupBet : pickSource === "me" ? myBets : userBet;

  const serverBets = formatBetsFromBetsData(betsData?.bet_values);
  // Draft only while the column is still editable by its owner; keyed per column so last week's picks never leak in
  const draftKey =
    column?.id && user?.id && isCurrentUserColumn && !isDeadlinePassed
      ? `bet-draft:${column.id}:${user.id}`
      : null;
  const hasUnsavedChanges =
    !!draftKey && betsFingerprint(userBet) !== betsFingerprint(serverBets);

  // Layout effect: swap in the new column's picks before paint, so the old picks never flash
  useLayoutEffect(() => {
    if (isBetsLoading) return;
    const server = formatBetsFromBetsData(betsData?.bet_values);
    const draft = draftKey ? readDraft(draftKey) : null;
    if (draft && betsFingerprint(draft) === betsFingerprint(server)) {
      writeDraft(draftKey!, null);
    }
    setUserBet(draft || server);
  }, [betsData, draftKey, isBetsLoading, column?.id]);

  const doublesAndTriplesCount = useMemo(() => {
    const values = Object.values(userBet);
    return {
      filledBets: values.filter((bet) => bet.length > 0).length,
      doubles: values.filter((bet) => bet.length === 2).length,
      triples: values.filter((bet) => bet.length === 3).length,
    };
  }, [userBet]);

  // Prefetch neighbouring columns so prev/next is usually instant
  const queryClient = useQueryClient();
  const viewedUserId = userIdParam || user?.id;
  useEffect(() => {
    for (const neighbour of [previousColumn, nextColumn]) {
      if (!neighbour?.id) continue;
      queryClient.prefetchQuery(columnQueryOptions(neighbour.id));
      if (viewedUserId) queryClient.prefetchQuery(userBetsQueryOptions(neighbour.id, viewedUserId));
    }
  }, [queryClient, previousColumn?.id, nextColumn?.id, viewedUserId]);

  const orderedGames: Game[] = useMemo(
    () =>
      column?.games?.sort((a: Game, b: Game) => {
        switch (orderBy) {
          case "game_num":
            return a.game_num - b.game_num;
          case "game_time":
            if (a["game_time"] === b["game_time"]) {
              return a.game_num - b.game_num;
            }
            return (
              new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
            );
          case "triples":
            return (
              (voteStats[b.game_num]?.triples || 0) -
                (voteStats[a.game_num]?.triples || 0) ||
              (voteStats[b.game_num]?.doubles || 0) -
                (voteStats[a.game_num]?.doubles || 0) ||
              (voteStats[b.game_num]?.singles || 0) -
                (voteStats[a.game_num]?.singles || 0)
            );
          default:
            return a.game_num - b.game_num;
        }
      }) || [],
    [column?.games, orderBy, voteStats]
  );

  useEffect(() => {
    if (showGroupBet && !column?.group_bet?.some((b: { value?: BetResult[] }) => b.value?.length)) {
      setShowGroupBet(false);
    }
  }, [column?.games?.length, column?.group_bet, showGroupBet]);

  if (isColumnLoading) return <ColumnSkeleton />;
  if (columnError) return <div className="p-8">{t("column.error", { message: columnError.message })}</div>;
  if (!column) return <div className="p-8">{t("column.noActive")}</div>;

  const games: Game[] = column.games ?? [];
  const canSubmit =
    !isSaving &&
    doublesAndTriplesCount.filledBets >= games.length &&
    doublesAndTriplesCount.doubles <= column.max_doubles &&
    doublesAndTriplesCount.triples <= column.max_triples;
  const isEditable = !!draftKey;
  const unsentMessage = !draftKey
    ? null
    : !betsData
    ? t("column.notSent")
    : hasUnsavedChanges
    ? t("column.unsavedChanges")
    : null;
  const canSeeVotes = !!profile?.is_admin || isDeadlinePassed;
  const showVotes = canSeeVotes && showVoteStats;
  // an entry with no picks (e.g. a half-started admin edit) isn't a group bet
  const hasGroupBet = !!column.group_bet?.some((b: { value?: BetResult[] }) => b.value?.length);
  const viewedName = betsData?.profiles?.name ?? "";
  const hits = (bets: Bets) =>
    gamesWithResults.filter((g: Game) => bets[g.game_num]?.includes(g.result as BetResult)).length;
  const pickOptions: { value: PickSource; label: string; score: number }[] = [
    { value: "viewed", label: isCurrentUserColumn ? t("column.me") : viewedName, score: correctGuesses },
    ...(!isCurrentUserColumn ? [{ value: "me" as const, label: t("header.myColumn"), score: hits(myBets) }] : []),
    ...(hasGroupBet ? [{ value: "group" as const, label: t("glossary:theGroupBet"), score: correctGroupGuesses }] : []),
  ];
  const canSwitchPicks = pickOptions.length > 1;
  const deadline = new Date(column.deadline);
  const discardChanges = () => {
    setUserBet(serverBets);
    setNotice(null);
    if (draftKey) writeDraft(draftKey, null);
  };

  const navButton = (target: { id: string } | null, label: string, Icon: typeof ChevronLeft) => (
    <Button
      variant="outline"
      size="icon"
      className="size-10 shrink-0 rounded-xl"
      aria-label={label}
      disabled={!target}
      onClick={() => target && navigate(`/column/${target.id}`)}
    >
      <Icon className="size-[18px]" />
    </Button>
  );

  return (
    <div className={cn("mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8", isEditable && "pb-44 md:pb-32")}>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <section
          aria-busy={isColumnSwitching}
          className={cn(
            "relative overflow-hidden rounded-2xl border bg-card transition-opacity duration-200",
            isColumnSwitching && "pointer-events-none opacity-60"
          )}
        >
          {isColumnSwitching && (
            <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden" aria-hidden>
              <div className="h-full w-1/3 animate-loading-bar bg-brand motion-reduce:animate-none" />
            </div>
          )}
          {/* Column header */}
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex items-center justify-between gap-3 md:justify-start">
              {navButton(previousColumn, t("column.previous"), ChevronRight)}
              <div className="text-center md:text-start">
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">{column.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {isDeadlinePassed
                    ? t("column.closedAt", { date: dates.format(deadline, t("dates.dayMonthTime")) })
                    : t("column.closesAt", {
                        day: dates.dayName(deadline),
                        time: dates.time(deadline),
                        distance: formatDistanceToNowStrict(deadline, { locale: dates.locale, addSuffix: true }),
                      })}
                </p>
              </div>
              {navButton(nextColumn, t("column.next"), ChevronLeft)}
            </div>

            {isEditable ? (
              <LimitTiles
                loading={isBetsLoading}
                filled={doublesAndTriplesCount.filledBets}
                total={games.length}
                doubles={doublesAndTriplesCount.doubles}
                maxDoubles={column.max_doubles ?? 0}
                triples={doublesAndTriplesCount.triples}
                maxTriples={column.max_triples ?? 0}
              />
            ) : (
              gamesWithResults.length > 0 && (
                <div
                  role={canSwitchPicks ? "group" : undefined}
                  aria-label={canSwitchPicks ? t("column.correctGuesses") : undefined}
                  className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1 md:min-w-64"
                >
                  {pickOptions.map((tile) => {
                    const selected = canSwitchPicks && pickSource === tile.value;
                    const pct = Math.round((tile.score / gamesWithResults.length) * 100);
                    const content = (
                      <>
                        <span className="w-full truncate text-xs text-muted-foreground">
                          {canSwitchPicks ? tile.label : t("column.correctGuesses")}
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold leading-tight tracking-tight tabular-nums">{pct}%</span>
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {t("column.scoreOf", { score: tile.score, total: gamesWithResults.length })}
                          </span>
                        </span>
                        <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border" aria-hidden>
                          <span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                        </span>
                      </>
                    );
                    // with more than one source, each score tile doubles as the switch
                    return canSwitchPicks ? (
                      <button
                        key={tile.value}
                        aria-pressed={selected}
                        onClick={() => setPickSource(tile.value)}
                        className={cn(
                          "flex min-w-0 flex-col items-start rounded-lg px-3 py-2 text-start",
                          selected ? "bg-card shadow-xs" : "hover:bg-card/50"
                        )}
                      >
                        {content}
                      </button>
                    ) : (
                      <div key={tile.value} className="flex flex-col items-start px-3 py-2">{content}</div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {(!isCurrentUserColumn || (columnId && column.id !== currentColumn?.id)) && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm md:px-6">
              <span className="flex items-center gap-1">
                {!isCurrentUserColumn && (
                  <>
                    {t("column.columnOf")}{" "}
                    {isBetsLoading ? <Skeleton className="inline-block h-4 w-24" /> : <strong>{betsData?.profiles?.name}</strong>}
                  </>
                )}
              </span>
              {!isCurrentUserColumn ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(column.id === currentColumn?.id ? "/column" : `/column/${column.id}`)}
                >
                  {t("column.backToMine")}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => navigate("/column")}>
                  {t("column.backToCurrent")}
                </Button>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t bg-muted/40 px-4 py-3 md:px-6">
            {!showVotes && <Segmented
              label={t("common.orderBy")}
              value={orderBy}
              onChange={setOrderBy}
              options={[
                { value: "game_num", label: t("common.numberShort") },
                { value: "game_time", label: t("common.time") },
                ...(canSeeVotes ? [{ value: "triples" as const, label: t("column.order.hedges") }] : []),
              ]}
            />}
            {canSwitchPicks && !showVotes && !(isDeadlinePassed && gamesWithResults.length > 0) && (
              <Segmented
                label={t("column.form")}
                value={pickSource}
                onChange={setPickSource}
                options={pickOptions.map(({ value, label }) => ({ value, label }))}
              />
            )}
            {canSeeVotes && (
              <Segmented
                label={t("column.view.label")}
                value={showVoteStats ? "votes" : "picks"}
                onChange={(v) => setShowVoteStats(v === "votes")}
                options={[
                  { value: "picks", label: t("glossary:column") },
                  { value: "votes", label: t("column.view.votes") },
                ]}
              />
            )}
            {showVotes && (
              <Segmented
                label={t("column.calc.label")}
                value={calcType}
                onChange={setCalcType}
                options={[
                  { value: "classic", label: t("column.calc.classic") },
                  { value: "weighted", label: t("column.calc.weighted") },
                  { value: "form", label: t("column.calc.form") },
                ]}
              />
            )}
            {isDeadlinePassed && !showVotes && (
              <Segmented
                label={t("column.filter.label")}
                value={gameFilter}
                onChange={setGameFilter}
                options={[
                  { value: "all", label: t("column.filter.all") },
                  { value: "correct", label: t("column.filter.correct") },
                  { value: "incorrect", label: t("column.filter.incorrect") },
                  { value: "future", label: t("column.filter.future") },
                ]}
              />
            )}
            {isDeadlinePassed && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showLiveMatchWidget}
                  onCheckedChange={() => setShowLiveMatchWidget(!showLiveMatchWidget)}
                />
                {t("column.liveGames")}
              </label>
            )}
          </div>

          {/* Games */}
          {showVotes ? (
            <VoteHeatmap
              games={orderedGames}
              votes={Object.fromEntries(
                games.map((g) => [
                  g.game_num,
                  calcType === "form" ? formVoteByGame?.[g.game_num] : voteStats[g.game_num]?.[calcType],
                ])
              )}
              hedge={Object.fromEntries(games.map((g) => [g.game_num, voteStats[g.game_num]]))}
              picks={displayedBets}
              pickLabel={
                pickSource === "group"
                  ? t("glossary:theGroupBet")
                  : pickSource === "me" || isCurrentUserColumn
                  ? t("column.myPick")
                  : t("column.pickOf", { name: viewedName })
              }
              pickOptions={canSwitchPicks ? pickOptions.map(({ value, label }) => ({ value, label })) : undefined}
              pickValue={pickSource}
              onPickChange={setPickSource}
              participants={columnStats.length}
              voters={Object.fromEntries(
                games.map((g) => [
                  g.game_num,
                  Object.fromEntries(
                    (["1", "X", "2"] as const).map((o) => [
                      o,
                      columnStats.filter((u) => u.picks[g.game_num]?.includes(o)).map((u) => ({ name: u.user.name, picks: u.picks[g.game_num].length }))
                        .sort((a, b) => a.picks - b.picks), // singles, then doubles, then triples
                    ])
                  ),
                ])
              )}
            />
          ) : (
            <ul key={column.id} className="divide-y border-t animate-in fade-in duration-300">
            {orderedGames
              .filter((game) => {
                if (!isDeadlinePassed || gameFilter === "all") return true;
                if (gameFilter === "future") return !game.result;
                const outcome = betOutcome(displayedBets[game.game_num], game.result);
                return gameFilter === "correct" ? outcome === true : outcome === false;
              })
              .map((game) => {
              const correct =
                isBetsLoading && pickSource === "viewed" ? null : betOutcome(displayedBets[game.game_num], game.result);
              const picksLoading = isBetsLoading && pickSource === "viewed";
              const outcomeIcon =
                correct === true ? (
                  <CircleCheck className="size-4 shrink-0 text-success" aria-label={t("column.guessCorrect")} />
                ) : correct === false ? (
                  <CircleX className="size-4 shrink-0 text-destructive" aria-label={t("column.guessWrong")} />
                ) : null;
              const meta = (
                <>
                  {dates.dayName(game.game_time)} {dates.time(game.game_time)} ·{" "}
                  <button
                    className="hover:text-foreground hover:underline"
                    onClick={() => setStandingWidgetLeague(standingsLeagueId(game.competition))}
                  >
                    {game.competition}
                  </button>
                </>
              );
              const betButtonsProps = {
                gameNum: game.game_num,
                userBet: displayedBets,
                result: game.result,
                disabled: isDeadlinePassed || !isCurrentUserColumn,
                onBetPlace: handlePlaceBet,
              };
              const showLiveFrame =
                !!game.live_tracker_id && (liveFrameOverride[game.game_num] ?? showLiveMatchWidget);
              return (
                <li
                  key={game.game_num}
                  onClick={(e) => {
                    if (!game.live_tracker_id || (e.target as HTMLElement).closest("button, iframe")) return;
                    setLiveFrameOverride((o) => ({ ...o, [game.game_num]: !showLiveFrame }));
                  }}
                  className={cn(
                    "px-4 py-3 transition-colors md:px-6 md:py-2.5",
                    game.live_tracker_id && "cursor-pointer",
                    correct === true && "bg-success-soft",
                    correct === false && "bg-error/60"
                  )}
                >
                  {/* mobile: scoreboard — 1 under the home team, X in the middle, 2 under the away team */}
                  <div className="flex flex-col gap-2 md:hidden">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="flex shrink-0 items-center gap-1 font-semibold tabular-nums">
                        {outcomeIcon}
                        {t("common.gameN", { num: game.game_num })}
                      </span>
                      <span className="truncate">{meta}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-1 text-center text-[15px] leading-snug">
                      <span className={teamWeight(game, "1")}>{game.home_team}</span>
                      <span className="text-xs text-muted-foreground">{t("common.vs")}</span>
                      <span className={teamWeight(game, "2")}>{game.away_team}</span>
                    </div>
                    {picksLoading ? (
                      <Skeleton className="h-10 w-full rounded-[10px]" />
                    ) : (
                      <BetButtons layout="board" {...betButtonsProps} />
                    )}
                  </div>

                  {/* desktop: one row */}
                  <div className="hidden items-center gap-4 md:flex">
                    <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">{game.game_num}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {outcomeIcon}
                        <span className="min-w-0"><Teams game={game} /></span>
                      </div>
                      <div className="truncate text-sm text-muted-foreground">{meta}</div>
                    </div>
                    {picksLoading ? (
                      <Skeleton className="h-[50px] w-[142px] shrink-0 rounded-xl" />
                    ) : (
                      <BetButtons {...betButtonsProps} />
                    )}
                  </div>
                  {showLiveFrame && (
                      <div className="mt-2">
                        <LiveMatchWidget matchId={game.live_tracker_id} />
                      </div>
                    )}
                </li>
              );
            })}
          </ul>
          )}
        </section>

        <aside>
          <ColumnSummary
            stats={columnStats as UserStats[]}
            showScore={isDeadlinePassed}
            columnId={column.id}
            loading={isStatsLoading}
            groupBet={
              hasGroupBet
                ? { score: correctGroupGuesses, selected: pickSource === "group", onSelect: () => setPickSource("group") }
                : undefined
            }
          />
        </aside>
      </div>

      {/* Save bar: state banner + actions, pinned while the column is editable */}
      {isEditable && !isBetsLoading && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4 md:px-8">
            <div className="flex-1">
              {notice === "ok" ? (
                <Banner tone="success" onClose={() => setNotice(null)}>
                  {t("column.sentOk")}
                </Banner>
              ) : notice === "fail" ? (
                <Banner tone="error" action={{ label: t("common.retry"), onClick: submitBet, disabled: !canSubmit }}>
                  {t("column.sendFailed")}
                </Banner>
              ) : unsentMessage ? (
                <Banner
                  tone="warn"
                  action={betsData && hasUnsavedChanges ? { label: t("column.discardChanges"), onClick: discardChanges, disabled: isSaving } : undefined}
                >
                  {unsentMessage}
                </Banner>
              ) : (
                <p className="text-sm font-medium text-success">{t("column.sentEditable")}</p>
              )}
            </div>
            <Button
              className="h-12 rounded-xl px-6 text-base md:h-11"
              disabled={!canSubmit || (!unsentMessage && notice !== "fail")}
              onClick={submitBet}
            >
              {isSaving ? t("common.saving") : t("column.send")}
            </Button>
          </div>
        </div>
      )}

      <StandingWidget
        isOpened={!!standingWidgetLeague}
        leagueId={standingWidgetLeague}
        onOpenChange={(newState) => {
          if (newState) {
            setStandingWidgetLeague(standingsLeagueId(column.competition));
          } else {
            setStandingWidgetLeague(null);
          }
        }}
      />
    </div>
  );
};

const ColumnSkeleton = () => {
  const { t } = useTranslation();
  return (
  <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8" aria-busy="true" aria-label={t("column.loading")}>
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center justify-between gap-3 md:justify-start">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex flex-col items-center gap-2 md:items-start">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-2 md:w-96">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[54px] rounded-xl" />)}
          </div>
        </div>
        <div className="border-t bg-muted/40 px-4 py-3 md:px-6">
          <Skeleton className="h-9 w-56 rounded-lg" />
        </div>
        <ul className="divide-y border-t">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5 md:gap-4 md:px-6">
              <Skeleton className="h-4 w-5" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-3/5 max-w-56" />
                <Skeleton className="h-3 w-2/5 max-w-36" />
              </div>
              <Skeleton className="h-[50px] w-[130px] rounded-xl md:w-[142px]" />
            </li>
          ))}
        </ul>
      </section>
      <aside className="rounded-2xl border bg-card p-5">
        <Skeleton className="mb-4 h-5 w-24" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </aside>
    </div>
  </div>
  );
};
