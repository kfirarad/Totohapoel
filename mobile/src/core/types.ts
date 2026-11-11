// Domain types for the multi-group schema. Replace with `supabase gen types` output once the DB lands.

export type BetResult = '1' | '2' | 'X' | null;
export type Outcome = '1' | 'X' | '2';
export const OUTCOMES: Outcome[] = ['1', 'X', '2'];

export interface Game {
  game_num: number;
  home_team: string;
  away_team: string;
  game_time: string;
  competition: string;
  live_tracker_id?: string | number | null;
  result: BetResult;
}

export interface GameBetValue {
  game_num: string | number;
  value: BetResult[];
}

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  locale: 'he' | 'en';
  last_group_id: string | null;
  is_system_admin: boolean;
  notify: { deadline: boolean; results: boolean; join_requests: boolean };
}

export interface TotoType {
  id: string;
  code: string;
  name_he: string;
  name_en: string;
  country: string;
}

export interface Column {
  id: string;
  toto_type_id: string | null;
  group_id: string | null;
  name: string;
  deadline: string;
  is_active: boolean;
  max_doubles: number;
  max_triples: number;
  games: Game[];
}

export interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  join_code: string;
  is_open: boolean;
}

export type Role = 'admin' | 'member';
export type MemberStatus = 'pending' | 'active';

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: Role;
  status: MemberStatus;
  joined_at: string;
  profiles?: Pick<Profile, 'name' | 'avatar_url'> | null;
}

export interface UserBet {
  user_id: string;
  column_id: string;
  bet_values: GameBetValue[];
  correct_guesses: number | null;
}

export interface GroupBet {
  group_id: string;
  column_id: string;
  bet_values: GameBetValue[];
  correct_guesses: number | null;
}
