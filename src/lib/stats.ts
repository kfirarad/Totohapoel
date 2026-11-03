import type { BetResult, Game } from "@/types/database.types";

export type SeasonColumn = {
  id: string;
  name: string;
  deadline: string;
  games: Game[] | null;
  group_bet_correct_guesses: number | null;
};

export type SeasonBet = {
  user_id: string;
  column_id: string;
  bet_values: { game_num: string | number; value: BetResult[] }[];
  profiles: { name: string; avatar_url?: string | null } | null;
};

export type PlayerStats = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  columns: number;
  correct: number;
  graded: number;
  hitRate: number;
  /** hit rate over the player's bets in the last `formWeeks` closed columns; null if none played */
  formRate: number | null;
  /** formRate - hitRate */
  trend: number | null;
  wins: number;
  bestWeek: number;
  beatGroup: number;
  groupComparisons: number;
  singlesHitRate: number | null;
};

export type Votes = { "1": number; X: number; "2": number; total: number };

const OUTCOMES = ["1", "X", "2"] as const;

const hasResults = (c: SeasonColumn) => !!c.games?.some((g) => g.result);

/** Columns past their deadline with at least one result, oldest first */
export const closedColumns = (columns: SeasonColumn[], now = new Date()) =>
  columns
    .filter((c) => new Date(c.deadline) < now && hasResults(c))
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));

const scoreBet = (bet: SeasonBet, column: SeasonColumn) => {
  const results = new Map(
    (column.games ?? []).map((g) => [String(g.game_num), g.result])
  );
  let correct = 0, graded = 0, singles = 0, singlesCorrect = 0;
  for (const { game_num, value } of bet.bet_values ?? []) {
    const result = results.get(String(game_num));
    if (!result || !value?.length) continue;
    const hit = value.includes(result);
    graded++;
    if (hit) correct++;
    if (value.length === 1) {
      singles++;
      if (hit) singlesCorrect++;
    }
  }
  return { correct, graded, singles, singlesCorrect };
};

export const computePlayerStats = (
  columns: SeasonColumn[],
  bets: SeasonBet[],
  formWeeks: number,
  now = new Date()
): PlayerStats[] => {
  const closed = closedColumns(columns, now);
  const recent = new Set(closed.slice(-formWeeks).map((c) => c.id));
  const betsByColumn = new Map<string, SeasonBet[]>();
  for (const b of bets) {
    betsByColumn.set(b.column_id, [...(betsByColumn.get(b.column_id) ?? []), b]);
  }

  const acc = new Map<
    string,
    PlayerStats & { formCorrect: number; formGraded: number; singles: number; singlesCorrect: number }
  >();

  for (const column of closed) {
    const scored = (betsByColumn.get(column.id) ?? []).map((bet) => ({
      bet,
      ...scoreBet(bet, column),
    }));
    const top = Math.max(0, ...scored.map((s) => s.correct));

    for (const { bet, correct, graded, singles, singlesCorrect } of scored) {
      if (!graded) continue;
      let p = acc.get(bet.user_id);
      if (!p) {
        p = {
          userId: bet.user_id, name: bet.profiles?.name ?? "—", avatarUrl: bet.profiles?.avatar_url ?? null,
          columns: 0, correct: 0, graded: 0, hitRate: 0, formRate: null, trend: null,
          wins: 0, bestWeek: 0, beatGroup: 0, groupComparisons: 0, singlesHitRate: null,
          formCorrect: 0, formGraded: 0, singles: 0, singlesCorrect: 0,
        };
        acc.set(bet.user_id, p);
      }
      p.columns++;
      p.correct += correct;
      p.graded += graded;
      p.singles += singles;
      p.singlesCorrect += singlesCorrect;
      p.bestWeek = Math.max(p.bestWeek, correct);
      if (top > 0 && correct === top) p.wins++;
      if (column.group_bet_correct_guesses != null) {
        p.groupComparisons++;
        if (correct > column.group_bet_correct_guesses) p.beatGroup++;
      }
      if (recent.has(column.id)) {
        p.formCorrect += correct;
        p.formGraded += graded;
      }
    }
  }

  return [...acc.values()].map(
    ({ formCorrect, formGraded, singles, singlesCorrect, ...p }) => {
      const hitRate = p.correct / p.graded;
      const formRate = formGraded ? formCorrect / formGraded : null;
      return {
        ...p,
        hitRate,
        formRate,
        trend: formRate == null ? null : formRate - hitRate,
        singlesHitRate: singles ? singlesCorrect / singles : null,
      };
    }
  );
};

/**
 * Vote weight per player = (form over the last `formWeeks` columns closed before `before`) ^ power.
 * Players with no recent history get the average weight, so new players still count.
 */
export const formWeights = (
  columns: SeasonColumn[],
  bets: SeasonBet[],
  before: Date,
  formWeeks: number,
  power: number
) => {
  const history = columns.filter((c) => new Date(c.deadline) < before);
  const weights = new Map<string, number>();
  for (const p of computePlayerStats(history, bets, formWeeks, before)) {
    if (p.formRate != null) weights.set(p.userId, p.formRate ** power);
  }
  const known = [...weights.values()];
  const fallback = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
  return (userId: string) => weights.get(userId) ?? fallback;
};

/** Per game: each bet spreads its player's weight evenly across the outcomes it picked */
export const formVotes = (
  columnBets: SeasonBet[],
  weightOf: (userId: string) => number
): Record<string, Votes> => {
  const votes: Record<string, Votes> = {};
  for (const bet of columnBets) {
    const w = weightOf(bet.user_id);
    for (const { game_num, value } of bet.bet_values ?? []) {
      if (!value?.length) continue;
      const v = (votes[String(game_num)] ??= { "1": 0, X: 0, "2": 0, total: 0 });
      for (const o of value) if (o) v[o] += w / value.length;
      v.total += w;
    }
  }
  return votes;
};

/**
 * Fill a group column from votes: singles on the top outcome, triples where the leader is weakest,
 * doubles where the runner-up is strongest.
 * ponytail: greedy per game, doesn't jointly optimize expected hits; fine for 16 games.
 */
export const autoFillGroupBet = (
  gameNums: number[],
  votes: Record<string, Votes>,
  maxDoubles: number,
  maxTriples: number
): Record<number, BetResult[]> => {
  const ranked = gameNums.map((num) => {
    const v = votes[String(num)];
    const share = (o: (typeof OUTCOMES)[number]) => (v?.total ? v[o] / v.total : 0);
    const order = [...OUTCOMES].sort((a, b) => share(b) - share(a));
    return { num, order, p1: share(order[0]), p2: share(order[1]) };
  });

  const bet: Record<number, BetResult[]> = {};
  for (const g of ranked) bet[g.num] = [g.order[0]];

  const triples = [...ranked].sort((a, b) => a.p1 - b.p1).slice(0, maxTriples);
  for (const g of triples) bet[g.num] = [...g.order];

  const tripled = new Set(triples.map((g) => g.num));
  const doubles = ranked
    .filter((g) => !tripled.has(g.num))
    .sort((a, b) => b.p2 - a.p2)
    .slice(0, maxDoubles);
  for (const g of doubles) bet[g.num] = g.order.slice(0, 2);

  return bet;
};

export type AlgoSettings = { formWeeks: number; power: number };
const ALGO_KEY = "algo-settings";

export const readAlgoSettings = (): AlgoSettings => {
  try {
    return { formWeeks: 5, power: 2, ...JSON.parse(localStorage.getItem(ALGO_KEY) || "{}") };
  } catch {
    return { formWeeks: 5, power: 2 };
  }
};

export const writeAlgoSettings = (s: AlgoSettings) => {
  try {
    localStorage.setItem(ALGO_KEY, JSON.stringify(s));
  } catch {
    // settings are a per-device convenience
  }
};

export type HistoryRow = {
  columnId: string;
  name: string;
  deadline: string;
  correct: number;
  graded: number;
  /** group column's correct guesses, as last recalculated by an admin */
  group: number | null;
};

/** One row per closed column the player bet on, oldest first */
export const playerHistory = (
  columns: SeasonColumn[],
  bets: SeasonBet[],
  userId: string,
  now = new Date()
): HistoryRow[] => {
  const mine = new Map(bets.filter((b) => b.user_id === userId).map((b) => [b.column_id, b]));
  return closedColumns(columns, now).flatMap((column) => {
    const bet = mine.get(column.id);
    if (!bet) return [];
    const { correct, graded } = scoreBet(bet, column);
    return graded
      ? [{ columnId: column.id, name: column.name, deadline: column.deadline, correct, graded, group: column.group_bet_correct_guesses }]
      : [];
  });
};
