export type BetResult = '1' | '2' | 'X' | null;

export interface Column {
  id?: string;
  name: string;
  deadline: string;
  is_active: boolean;
  created_at?: string;
  created_by?: string;
}

export interface Game {
  id: string;
  column_id: string;
  game_num: number;
  home_team: string;
  away_team: string;
  game_time: string;
  competition: string;
  result: BetResult;
  created_at: string;
}
