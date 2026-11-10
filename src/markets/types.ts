// Market-neutral types. Each market (country / operator product) is a folder under src/markets
// with a config (static facts) and an adapter (how draws and results reach us). See docs/markets-plan.md §3.1.

/** Markets the app knows about; grows one code per market as it ships */
export type MarketCode = "il";

/** What is stored for a pick or result, in every market. Only the label shown to users differs. */
export type Outcome = "1" | "X" | "2";

/** Market-specific extra picks beyond the 1X2 games (Spain's Pleno al 15) */
export type MarketExtra = "pleno15";

/** What the operator does with a postponed or abandoned match */
export type PostponedPolicy = "void" | "operator-decides" | "lottery";

export interface MarketConfig {
  code: MarketCode;
  /** "Winner", "Svenska Spel", ... */
  operator: string;
  /** "Toto 16", "Stryktipset", ... */
  product: string;
  /** UI language for users who have not picked one ('he', 'sv', ...) */
  defaultLocale: string;
  /** IANA zone the operator's times are in, and the zone the UI shows times in */
  timeZone: string;
  gamesPerDraw: number | "variable";
  /** Label shown for each outcome (Japan shows 1/0/2); data always stays 1/X/2 */
  outcomeLabels: Record<Outcome, string>;
  /** The most doubles / triples the operator allows in one column */
  defaultLimits: { maxDoubles: number; maxTriples: number };
  extras?: MarketExtra[];
  postponedPolicy: PostponedPolicy;
}

/** One game of an operator draw, market-neutral */
export interface DrawGameDTO {
  gameNum: number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  /** kickoff, ISO instant */
  kickoff: string;
  /** the operator's (or a feed's) id for the match, if any */
  externalId?: string | null;
}

/** An operator draw (what becomes a column), market-neutral */
export interface DrawDTO {
  market: MarketCode;
  /** the operator's draw id */
  externalId: string;
  /** deadline for bets, ISO instant */
  deadline: string;
  games: DrawGameDTO[];
}

export type GameResultDTO =
  | { gameNum: number; status: "result"; result: Outcome }
  | { gameNum: number; status: "void" }
  | { gameNum: number; status: "pending" };

/** Results of one draw as the operator reports them */
export interface ResultDTO {
  market: MarketCode;
  externalId: string;
  /** where the results came from, e.g. "winner" or "manual" */
  source: string;
  /** ISO instant the results were fetched */
  fetchedAt: string;
  /** true once the operator has settled every game */
  final: boolean;
  games: GameResultDTO[];
}

export interface MarketAdapter {
  /**
   * server: an Edge Function calls the operator directly.
   * browser-bridge: the operator site blocks servers, so a bookmarklet on it hands data to our tab.
   */
  transport: "server" | "browser-bridge";
  // Optional until each market's phase implements them (browser-bridge markets may never have them)
  listOpenDraws?(): Promise<DrawDTO[]>;
  getDraw?(externalId: string): Promise<DrawDTO>;
  getResults?(externalId: string): Promise<ResultDTO>;
}

export interface MarketPackage {
  config: MarketConfig;
  adapter: MarketAdapter;
}
