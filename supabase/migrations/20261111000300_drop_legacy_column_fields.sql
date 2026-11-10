-- These per-column fields moved to group_columns (one copy per group) in 20261111000000.
-- The app no longer reads them. Run after 20261111000000 has copied them.
alter table public.columns
  drop column if exists is_active,
  drop column if exists is_archived,
  drop column if exists group_bet,
  drop column if exists group_max_doubles,
  drop column if exists group_max_triples,
  drop column if exists group_bet_correct_guesses;
