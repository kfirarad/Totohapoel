-- Live updates for the web app (results/new bets refresh the column page).
alter publication supabase_realtime add table public.columns, public.user_bets;
