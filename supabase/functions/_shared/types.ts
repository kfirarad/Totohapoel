// Market-neutral shapes exchanged between operator adapters and the sync job.
// Mirrors src/markets/types.ts on the client (Edge Functions are bundled separately, so no shared import).

export type Outcome = "1" | "X" | "2";
export type GameStatus = "scheduled" | "played" | "void" | "lottery";
export type ResultSource = "operator" | "manual";

/** One game as stored in columns.games (jsonb) */
export type StoredGame = {
  game_num: number;
  home_team: string;
  away_team: string;
  competition: string;
  game_time: string; // ISO instant
  result: Outcome | null;
  live_tracker_id?: string | number | null;
  bet_radar_id?: string | null;
  external_id?: string | null;
  status?: GameStatus;
  result_source?: ResultSource;
};

export type DrawDTO = {
  externalId: string; // operator draw number
  name: string;
  deadline: string; // ISO instant
  games: {
    gameNum: number;
    externalId?: string;
    home: string;
    away: string;
    competition: string;
    kickoff: string; // ISO instant
  }[];
};

export type ResultDTO = {
  externalId: string;
  /** the operator has published the final result for the whole draw */
  final: boolean;
  games: { gameNum: number; externalId?: string; status: GameStatus; result: Outcome | null }[];
};

/** The server half of a market adapter. Markets whose operator blocks servers (Israel) have none. */
export type ServerAdapter = {
  market: string;
  limits: { maxDoubles: number; maxTriples: number }; // operator maximum
  listOpenDraws(): Promise<DrawDTO[]>;
  getResults(externalDrawId: string): Promise<ResultDTO>;
};
