import { useQuery } from '@tanstack/react-query';
import { ok, supabase } from './supabase';

export type TotoType = {
  id: string; code: string; name_he: string; name_en: string; country: string;
  default_max_doubles: number; default_max_triples: number;
  games_count: number | null; timezone: string; adapter: string | null; is_active: boolean;
};

export type Game = {
  game_num: number; home_team: string; away_team: string; competition: string; game_time: string;
  result: '1' | 'X' | '2' | null; [k: string]: unknown;
};

export type Column = {
  id: string; toto_type_id: string | null; group_id: string | null; name: string; deadline: string;
  is_active: boolean; max_doubles: number; max_triples: number; games: Game[];
  source: string | null; external_id: string | null; created_at: string;
};

export const useTotoTypes = () =>
  useQuery({
    queryKey: ['toto_types'],
    queryFn: async () => ok(await supabase.from('toto_types').select('*').order('country').order('code')) as TotoType[],
  });
