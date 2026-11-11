import type { BetResult, Game, GameBetValue, Outcome } from '@/core/types';

export type Picks = Record<number, Outcome[]>;

export const toPicks = (values: GameBetValue[] | null | undefined): Picks =>
  Object.fromEntries((values ?? []).map((v) => [Number(v.game_num), v.value.filter(Boolean) as Outcome[]]));

export const picksOf = (p: Picks, g: Game) => p[g.game_num] ?? [];

export const fromPicks = (picks: Picks): GameBetValue[] =>
  Object.entries(picks).map(([game_num, value]) => ({ game_num, value }));

export const togglePick = (picks: Picks, game: number, o: Outcome): Picks => {
  const cur = picks[game] ?? [];
  const next = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o];
  return { ...picks, [game]: next };
};

export const usage = (picks: Picks) => {
  const lens = Object.values(picks).map((v) => v.length);
  return {
    filled: lens.filter((n) => n > 0).length,
    doubles: lens.filter((n) => n === 2).length,
    triples: lens.filter((n) => n === 3).length,
  };
};

export const withinLimits = (picks: Picks, maxDoubles: number, maxTriples: number) => {
  const u = usage(picks);
  return u.doubles <= maxDoubles && u.triples <= maxTriples;
};

export const canSubmit = (picks: Picks, games: Game[], maxDoubles: number, maxTriples: number) =>
  games.every((g) => (picks[g.game_num]?.length ?? 0) > 0) && withinLimits(picks, maxDoubles, maxTriples);

/** One point per graded game whose pick includes the result. */
export const score = (picks: Picks, games: Game[]) => {
  const graded = games.filter((g) => g.result);
  const hits = graded.filter((g) => picks[g.game_num]?.includes(g.result as Outcome)).length;
  return { hits, graded: graded.length };
};

export type VoteCount = Record<Outcome, number> & { voters: number };

/** Share of voters (per game) that included each outcome. */
export const votes = (bets: GameBetValue[][], games: Game[]): Record<number, VoteCount> => {
  const out: Record<number, VoteCount> = {};
  for (const g of games) out[g.game_num] = { '1': 0, X: 0, '2': 0, voters: 0 };
  for (const bet of bets)
    for (const v of bet) {
      const c = out[Number(v.game_num)];
      if (!c) continue;
      c.voters++;
      for (const o of v.value as BetResult[]) if (o) c[o]++;
    }
  return out;
};
