export type BetResult = '1' | '2' | 'X' | null;

/**
 * A column as the UI uses it: the operator's draw (`columns` table) merged with the current group's
 * view of it (`group_columns`). See src/groups/groupColumn.ts.
 */
export interface Column {
  id?: string;
  name: string;
  deadline: string;
  market?: string;
  external_draw_id?: string | null;
  source_status?: "open" | "closed" | "final" | null;
  created_at?: string;
  created_by?: string;
  /** the limit players in this group get: min(group setting, operator maximum) */
  max_doubles?: number;
  max_triples?: number;
  /** the operator maximum (columns.max_doubles / max_triples) */
  operator_max_doubles?: number | null;
  operator_max_triples?: number | null;
  games?: Game[];
  // ---- per group (group_columns)
  is_active: boolean;
  /** hidden from this group's players (navigation, default column, stats) */
  is_archived?: boolean;
  /** this group's override of its default limits for this column; null = the group default */
  group_override_doubles?: number | null;
  group_override_triples?: number | null;
  /** group bet's own budget; null = same as the players' limits */
  group_max_doubles?: number | null;
  group_max_triples?: number | null;
  group_bet: GameBetValue[] | null;
  group_bet_correct_guesses: number | null;
}

/** A row of the operator-level `columns` table, as super-admins edit it */
export interface OperatorColumn {
  id?: string;
  name: string;
  deadline: string;
  market: string;
  external_draw_id?: string | null;
  source_status?: "open" | "closed" | "final" | null;
  created_at?: string;
  created_by?: string;
  max_doubles?: number | null;
  max_triples?: number | null;
  games?: Game[];
}

/** A row of `group_columns` */
export interface GroupColumnState {
  group_id: string;
  column_id: string;
  max_doubles: number | null;
  max_triples: number | null;
  is_active: boolean;
  is_archived: boolean;
  group_bet: GameBetValue[] | null;
  group_bet_max_doubles: number | null;
  group_bet_max_triples: number | null;
  group_bet_correct_guesses: number | null;
}

export interface Game {
  game_num: number;
  home_team: string;
  away_team: string;
  game_time: string;
  competition: string;
  live_tracker_id: number;
  result: BetResult;
  /** set by the market sync (docs/markets-plan.md §3.2) */
  external_id?: string | null;
  status?: "scheduled" | "played" | "void" | "lottery";
  /** 'manual' results are never overwritten by the sync */
  result_source?: "operator" | "manual";
}

export interface GameBetValue {
  game_num: string;
  value: BetResult[];
}

export interface UserBet {
  user_id: string;
  column_id: string;
  bet_values: GameBetValue[];
  correct_guesses: number | null;
}