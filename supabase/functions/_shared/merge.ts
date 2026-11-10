import type { DrawDTO, ResultDTO, StoredGame } from "./types.ts";

const sameGame = (g: StoredGame, r: { gameNum: number; externalId?: string }) =>
  r.externalId && g.external_id ? r.externalId === g.external_id : Number(g.game_num) === r.gameNum;

/** A new operator draw -> the columns row to insert */
export const drawToColumnRow = (market: string, draw: DrawDTO, limits: { maxDoubles: number; maxTriples: number }) => ({
  market,
  external_draw_id: draw.externalId,
  name: draw.name,
  deadline: draw.deadline,
  is_active: true,
  max_doubles: limits.maxDoubles,
  max_triples: limits.maxTriples,
  source_status: "open" as const,
  synced_at: new Date().toISOString(),
  games: draw.games.map<StoredGame>((g) => ({
    game_num: g.gameNum,
    home_team: g.home,
    away_team: g.away,
    competition: g.competition,
    game_time: g.kickoff,
    result: null,
    live_tracker_id: null,
    external_id: g.externalId ?? null,
    status: "scheduled",
  })),
});

/** Kickoff/deadline changes on a draw we already have; never touches results */
export const refreshFixtures = (games: StoredGame[], draw: DrawDTO) =>
  games.map((g) => {
    const fresh = draw.games.find((d) => sameGame(g, d));
    return fresh ? { ...g, game_time: fresh.kickoff } : g;
  });

/**
 * Applies operator results. Results an admin set by hand (result_source 'manual') are kept.
 * `final` = the operator says so, or every game has a result or was voided.
 */
export const mergeResults = (games: StoredGame[], dto: ResultDTO) => {
  let updated = 0;
  const merged = games.map((g) => {
    const r = dto.games.find((x) => sameGame(g, x));
    if (!r || g.result_source === "manual") return g;
    const next: StoredGame = { ...g, result: r.result, status: r.status, result_source: "operator" };
    if (next.result !== g.result || next.status !== g.status) updated++;
    return next;
  });
  const final = dto.final || merged.every((g) => g.result !== null || g.status === "void");
  return { games: merged, updated, final };
};
