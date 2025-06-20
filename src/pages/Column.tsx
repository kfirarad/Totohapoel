import { format } from "date-fns";
import { cn, getDayName } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { he } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import {
  useColumnQuery,
  usePlaceBetMutation,
  useVoteStatsQuery,
  useColumnStatsQuery,
  useUserBetsQuery,
} from "@/hooks/useQueries";
import { VoteStats } from "@/components/VoteStats";
import { ColumnSummary } from "@/components/ColumnSummary";
import { BetResult, Game } from "@/types/database.types";
import { useEffect, useMemo, useState } from "react";
import { BetButtons } from "@/components/BetButtons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { StandingWidget } from "@/components";
import { LiveMatchWidget } from "@/components/LiveMatchWidget";
import { supabase } from "@/services/supabase";
interface UserStats {
  user: {
    id: string;
    name: string;
  };
  totalBets: number;
  correctBets: number;
}

type OrderBy = "game_num" | "game_time" | "triples";

const initialSettings = JSON.parse(localStorage.getItem("settings") || `{}`);

const competitionTo365LeagueId = (leagueName: string) => {
  switch (leagueName) {
    case "ספרדית ראשונה":
      return 564;
    case "גרמנית ראשונה":
      return 82;
    case "פרמייר ליג":
      return 8;
    case "ליגת Winner":
      return 372;
    case "איטלקית ראשונה":
      return 384;
    case "צרפתית ראשונה":
      return 301;
    default:
      return null;
  }
};

export const Column = () => {
  const { columnId, userId: userIdParam } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [orderBy, setOrderBy] = useState<OrderBy>(
    initialSettings.orderBy || "game_num"
  );
  const [userBet, setUserBet] = useState<Record<number, BetResult[]>>({});
  const [showVoteStats, setShowVoteStats] = useState(
    initialSettings.showVoteStats || false
  );
  const [showLiveMatchWidget, setShowLiveMatchWidget] = useState(
    initialSettings.showLiveMatchWidget || true
  );
  const [showGroupBet, setShowGroupBet] = useState(
    initialSettings.showGroupBet || false
  );
  const [doublesAndTriplesCount, setDoublesAndTriplesCount] = useState({
    filledBets: 0,
    doubles: 0,
    triples: 0,
  });
  const [standingWidgetLeague, setStandingWidgetLeague] = useState<
    number | null
  >(null);
  const { toast } = useToast();

  useEffect(() => setUserBet({}), [columnId]);
  const [calcType, setCalcType] = useState<"weighted" | "classic">("classic");
  useEffect(() => {
    localStorage.setItem(
      "settings",
      JSON.stringify({
        orderBy,
        showVoteStats,
        showGroupBet,
        showLiveMatchWidget,
      })
    );
  }, [orderBy, showVoteStats, showGroupBet, showLiveMatchWidget]);

  const {
    data: column,
    isLoading: isColumnLoading,
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
    data: betsData = [],
    isLoading: isBetsLoading,
    refetch: refetchUserBets,
  } = useUserBetsQuery(column?.id ?? "", userIdParam || user?.id || "");

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

  const { data: voteStats = {}, isLoading: isVoteStatsLoading } =
    useVoteStatsQuery(column?.id ?? "");

  const { mutate: placeBet } = usePlaceBetMutation();

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
    betsValues: {
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

  const correctGuessesToUse = showGroupBet
    ? correctGroupGuesses
    : correctGuesses;

  const handlePlaceBet = (gameId: number, value: BetResult) => {
    if (!isCurrentUserColumn || isDeadlinePassed) return;

    setUserBet((prevBet) => {
      const newValue = { ...prevBet };
      let bet = newValue[gameId] || [];
      if (bet.includes(value)) {
        bet = bet.filter((v) => v !== value);
      } else {
        bet = [...bet, value];
      }
      newValue[gameId] = bet;
      return newValue;
    });
  };

  const submitBet = async () => {
    if (!user?.id || isDeadlinePassed) return;

    await placeBet({
      betValues: Object.entries(userBet).map(([game_num, bet]) => ({
        game_num,
        value: bet,
      })),
      betId: betsData?.id,
      columnId: column.id,
      userId: user.id,
    });
    toast({
      className: "bg-blue-800 text-white color-white",
      title: "יאללה הפועל!",
      description: "הטופס נשלח בהצלחה",
      variant: "default",
    });
  };

  const userId = userIdParam || user?.id;
  const isCurrentUserColumn = userId === user?.id;

  useEffect(() => {
    if (betsData?.bet_values) {
      setUserBet(formatBetsFromBetsData(betsData.bet_values));
    }
  }, [betsData]);

  useEffect(() => {
    const filledBets = Object.values(userBet).filter(
      (bet) => bet.length > 0
    ).length;
    const doubles = Object.values(userBet).filter(
      (bet) => bet.length === 2
    ).length;
    const triples = Object.values(userBet).filter(
      (bet) => bet.length === 3
    ).length;
    setDoublesAndTriplesCount({ filledBets, doubles, triples });
  }, [userBet]);

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
    if (showGroupBet && column?.group_bet?.length !== column?.games.length) {
      setShowGroupBet(false);
    }
  }, [column?.games?.length, column?.group_bet, showGroupBet]);

  if (
    isColumnLoading ||
    isBetsLoading ||
    isVoteStatsLoading ||
    isStatsLoading
  ) {
    return (
      <div className="flex justify-center align-center h-lvh">טוען...</div>
    );
  }
  if (columnError) return <div>Error: {columnError.message}</div>;
  if (!column) return <div>לא נמצא טור פעיל</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{column.name}</h1>
            <div className="flex gap-2">
              {previousColumn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/column/${previousColumn.id}`)}
                >
                  <ChevronRight className="h-4 w-4 ml-2" />
                  טור קודם
                </Button>
              )}
              {nextColumn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/column/${nextColumn.id}`)}
                >
                  טור הבא
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              )}
            </div>
          </div>
          {columnId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/column")}
            >
              חזור לשבוע נוכחי
            </Button>
          )}
        </div>
        <p className="text-gray-600">
          תאריך אחרון למשלוח:{" "}
          {format(new Date(column.deadline), "PPpp", {
            locale: he,
          })}
        </p>
      </div>

      {!isCurrentUserColumn && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold">
            הטור של {betsData.profiles.name}
          </h2>
        </div>
      )}

      {/* Doubles & Triples Counter */}
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="rounded-lg border bg-card">
          {!isDeadlinePassed && isCurrentUserColumn && (
            <div className="mb-4 sticky top-0 z-20 bg-card p-4 rounded-lg border-b-2">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div>
                    <span
                      className={cn([
                        "font-medium",
                        doublesAndTriplesCount.filledBets <
                        column?.games?.length
                          ? "text-red-500"
                          : "text-green-500",
                        doublesAndTriplesCount.filledBets ===
                        column?.games?.length
                          ? "text-green-500"
                          : "",
                      ])}
                    >
                      {doublesAndTriplesCount.filledBets ===
                        column?.games?.length && <>✅</>}{" "}
                      {doublesAndTriplesCount.filledBets}/
                      {column?.games?.length}
                    </span>{" "}
                    מלאים
                  </div>
                  <div>
                    <span
                      className={cn([
                        "font-medium",
                        doublesAndTriplesCount.doubles < column.max_doubles
                          ? "text-black"
                          : doublesAndTriplesCount.doubles > column.max_doubles
                          ? "text-red-500"
                          : "text-green-500",
                      ])}
                    >
                      {" "}
                      {doublesAndTriplesCount.doubles ===
                        column.max_doubles && <>✅</>}
                      {doublesAndTriplesCount.doubles > column.max_doubles && (
                        <>❌</>
                      )}{" "}
                      {doublesAndTriplesCount.doubles}/{column.max_doubles}
                    </span>{" "}
                    כפולים
                  </div>
                  <div>
                    <span
                      className={cn([
                        "font-medium",
                        doublesAndTriplesCount.triples < column.max_triples
                          ? "text-black"
                          : doublesAndTriplesCount.triples > column.max_triples
                          ? "text-red-500"
                          : "text-green-500",
                      ])}
                    >
                      {" "}
                      {doublesAndTriplesCount.triples ===
                        column.max_triples && <>✅</>}
                      {doublesAndTriplesCount.triples > column.max_triples && (
                        <>❌</>
                      )}{" "}
                      {doublesAndTriplesCount.triples}/{column.max_triples}
                    </span>{" "}
                    משולשים
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      doublesAndTriplesCount.filledBets <
                        column?.games?.length ||
                      doublesAndTriplesCount.doubles > column.max_doubles ||
                      doublesAndTriplesCount.triples > column.max_triples
                    }
                    onClick={submitBet}
                  >
                    שלח טופס
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isDeadlinePassed && gamesWithResults.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="flex gap-4 items-center">
                    <p className="text-right text-sm font-medium text-muted-foreground">
                      ניחושים נכונים : {correctGuessesToUse}/
                      {gamesWithResults.length} (
                      {(
                        (correctGuessesToUse / gamesWithResults.length) *
                        100
                      ).toFixed(2)}
                      %)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header - Only visible on desktop */}
          <div className="hidden md:flex justify-between items-center gap-4 p-4 bg-white border-b font-medium text-muted-foreground sticky top-0 z-10">
            <div>
              <div className="flex flex-col gap-2 items-start">
                {(profile?.is_admin || isDeadlinePassed) && (
                  <>
                    <div className="flex flex-row gap-2 items-start">
                      <>
                        <Checkbox
                          id="showVoteStats"
                          checked={showVoteStats}
                          onCheckedChange={() =>
                            setShowVoteStats(!showVoteStats)
                          }
                        />
                        <label
                          htmlFor="showVoteStats"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          הצג נתוני טופס
                        </label>
                      </>
                    </div>

                    <div className="flex flex-row gap-2 items-start">
                      <Button
                        variant={calcType === "classic" ? "default" : "outline"}
                        onClick={() => setCalcType("classic")}
                      >
                        קלאסי
                      </Button>
                      <Button
                        variant={
                          calcType === "weighted" ? "default" : "outline"
                        }
                        onClick={() => setCalcType("weighted")}
                      >
                        משוקלל
                      </Button>
                    </div>
                  </>
                )}

                {isDeadlinePassed && (
                  <div className="flex flex-row gap-2 items-start">
                    <Checkbox
                      id="showLiveMatchWidget"
                      checked={showLiveMatchWidget}
                      onCheckedChange={() =>
                        setShowLiveMatchWidget(!showLiveMatchWidget)
                      }
                    />
                    <label
                      htmlFor="showLiveMatchWidget"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      הצג משחקים חיים
                    </label>
                  </div>
                )}
              </div>
            </div>
            {column.group_bet &&
              column.group_bet?.length === column.games.length && (
                <div>
                  <div className="flex flex-row gap-2 items-center">
                    <Button
                      variant={!showGroupBet ? "default" : "outline"}
                      onClick={() => setShowGroupBet(false)}
                    >
                      טופס אישי
                    </Button>

                    <Button
                      variant={showGroupBet ? "default" : "outline"}
                      onClick={() => setShowGroupBet(true)}
                    >
                      הטופס המשותף
                    </Button>
                  </div>
                </div>
              )}
            <div className="flex flex-row gap-2 justify-end items-center">
              <div className="text-sm text-muted-foreground">סדר לפי</div>
              <Button
                size={"sm"}
                variant={orderBy === "game_num" ? "default" : "outline"}
                onClick={() => setOrderBy("game_num")}
              >
                מס׳
              </Button>
              <Button
                size={"sm"}
                variant={orderBy === "game_time" ? "default" : "outline"}
                onClick={() => setOrderBy("game_time")}
              >
                זמן משחק
              </Button>
              {(profile?.is_admin || isDeadlinePassed) && (
                <Button
                  size={"sm"}
                  variant={orderBy === "triples" ? "default" : "outline"}
                  onClick={() => setOrderBy("triples")}
                >
                  כפולים/משולשים
                </Button>
              )}
            </div>
          </div>

          {/** Mobile sort buttons */}
          <div className="visible md:hidden p-4 bg-white border-b font-medium text-muted-foreground sticky top-0 z-10">
            <div className="flex flex-row gap-2 justify-between items-center">
              <div className="flex flex-col gap-2  w-1/2">
                {(profile?.is_admin || isDeadlinePassed) && (
                  <>
                    <div className="flex flex-row gap-2 items-center">
                      <Checkbox
                        id="showVoteStats"
                        checked={showVoteStats}
                        onCheckedChange={() => setShowVoteStats(!showVoteStats)}
                      />
                      <label
                        htmlFor="showVoteStats"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        הצג נתוני טופס
                      </label>
                    </div>

                    <div className="flex flex-row gap-2 items-center">
                      <Button
                        size={"sm"}
                        variant={calcType === "classic" ? "default" : "outline"}
                        onClick={() => setCalcType("classic")}
                      >
                        קלאסי
                      </Button>
                      <Button
                        size={"sm"}
                        variant={
                          calcType === "weighted" ? "default" : "outline"
                        }
                        onClick={() => setCalcType("weighted")}
                      >
                        משוקלל
                      </Button>
                    </div>
                  </>
                )}

                {isDeadlinePassed && (
                  <>
                    <div className="flex flex-row gap-2 items-center">
                      <Checkbox
                        id="showLiveMatchWidget"
                        checked={showLiveMatchWidget}
                        onCheckedChange={() =>
                          setShowLiveMatchWidget(!showLiveMatchWidget)
                        }
                      />
                      <label
                        htmlFor="showLiveMatchWidget"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        הצג משחקים חיים
                      </label>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="flex flex-row gap-2 justify-end items-center">
                  <div className="text-sm text-muted-foreground">סדר לפי</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        {orderBy === "game_num"
                          ? "מס׳"
                          : orderBy === "game_time"
                          ? "זמן משחק"
                          : "כפולים/משולשים"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuRadioGroup
                        value={orderBy}
                        onValueChange={(value) => setOrderBy(value as OrderBy)}
                      >
                        <DropdownMenuRadioItem value="game_num">
                          מס׳
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="game_time">
                          זמן משחק
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="triples">
                          כפולים/משולשים
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {column.group_bet &&
                  column.group_bet?.length === column.games.length && (
                    <div>
                      <div className="flex flex-row gap-2 items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                              {showGroupBet ? "הטופס המשותף" : "טופס אישי"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56">
                            <DropdownMenuRadioGroup
                              value={showGroupBet.toString()}
                              onValueChange={(value: string) =>
                                setShowGroupBet(value === "true" ? true : false)
                              }
                            >
                              <DropdownMenuRadioItem value={"false"}>
                                טופס אישי
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value={"true"}>
                                הטופס המשותף
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Games List */}
          <div className="divide-y">
            {orderedGames.map((game) => (
              <div>
                <div
                  key={game.game_num}
                  className="grid grid-cols-1 md:grid-cols-[60px_1fr_2fr_1fr] gap-4 p-4"
                >
                  <div className="text-right md:text-right font-medium">
                    <span className="md:hidden text-muted-foreground text-sm">
                      #
                    </span>
                    {game.game_num}
                  </div>

                  {/* Mobile: Game Details Column */}
                  <div className="md:hidden flex flex-row justify-between">
                    {/* Game Info */}
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="font-medium">
                        {game.home_team} - {game.away_team}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getDayName(new Date(game.game_time))}
                        {", "}
                        {format(new Date(game.game_time), "HH:mm")}
                      </div>
                      <div className="text-sm text-blue-600">
                        <span
                          onClick={() =>
                            setStandingWidgetLeague(
                              competitionTo365LeagueId(game.competition)
                            )
                          }
                        >
                          {game.competition}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Desktop: Time & Competition */}
                  <div className="hidden md:block">
                    <div className="text-sm text-muted-foreground">
                      {getDayName(new Date(game.game_time))}
                      {", "}
                      {format(new Date(game.game_time), "HH:mm")}
                    </div>
                    <div
                      className="text-sm text-blue-600"
                      onClick={() =>
                        setStandingWidgetLeague(
                          competitionTo365LeagueId(game.competition)
                        )
                      }
                    >
                      {game.competition}
                    </div>
                  </div>

                  {/* Desktop: Teams */}
                  <div className="hidden md:flex items-center gap-2">
                    <span className="font-medium">{game.home_team}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-medium">{game.away_team}</span>
                  </div>

                  {/* Desktop: Bet Buttons */}
                  <div className="flex gap-2 justify-start flex-col">
                    <BetButtons
                      gameNum={game.game_num}
                      userBet={
                        showGroupBet
                          ? formatBetsFromBetsData(column.group_bet)
                          : userBet
                      }
                      result={game.result}
                      disabled={isDeadlinePassed || !isCurrentUserColumn}
                      onBetPlace={handlePlaceBet}
                    />
                    {(profile?.is_admin || isDeadlinePassed) &&
                      showVoteStats &&
                      voteStats[game.game_num] && (
                        <div className="mt-2">
                          <VoteStats
                            stats={voteStats[game.game_num]}
                            calcType={calcType}
                          />
                        </div>
                      )}
                  </div>
                </div>
                {showLiveMatchWidget &&
                  game.live_tracker_id &&
                  new Date(game.game_time).getTime() - Date.now() <
                    30 * 60 * 1000 &&
                  new Date(game.game_time).getTime() - Date.now() >
                    -120 * 60 * 1000 && (
                    <LiveMatchWidget matchId={game.live_tracker_id} />
                  )}
              </div>
            ))}
          </div>

          {/* Footer */}
        </div>

        {/* Column Summary */}
        {
          <div className="order-first md:order-last">
            <ColumnSummary
              stats={columnStats as UserStats[]}
              showScore={isDeadlinePassed}
              columnId={column.id}
            />
          </div>
        }
      </div>

      {
        <StandingWidget
          isOpened={!!standingWidgetLeague}
          leagueId={standingWidgetLeague}
          onOpenChange={(newState) => {
            if (newState) {
              setStandingWidgetLeague(
                competitionTo365LeagueId(column.competition)
              );
            } else {
              setStandingWidgetLeague(null);
            }
          }}
        />
      }
    </div>
  );
};
