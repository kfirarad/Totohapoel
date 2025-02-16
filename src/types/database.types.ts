export type BetResult = '1' | '2' | 'X' | null;

export interface Column {
  id?: string;
  name: string;
  deadline: string;
  is_active: boolean;
  created_at?: string;
  created_by?: string;
  max_doubles?: number;
  max_triples?: number;
  games?: Game[];
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
}