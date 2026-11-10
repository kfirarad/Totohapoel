export type BetResult = '1' | '2' | 'X' | null;

export interface Column {
  id?: string;
  name: string;
  deadline: string;
  is_active: boolean;
  /** hidden from players (navigation, default column, stats); admins can still open it */
  is_archived?: boolean;
  created_at?: string;
  created_by?: string;
  max_doubles?: number;
  max_triples?: number;
  /** group bet's own budget; null = same as the players' limits */
  group_max_doubles?: number | null;
  group_max_triples?: number | null;
  games?: Game[];
  group_bet: GameBetValue[] | null;
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