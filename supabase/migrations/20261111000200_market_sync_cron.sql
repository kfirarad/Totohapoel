-- Schedules the market-sync Edge Function.  NOT run by supabase/tests/run.sh (needs pg_cron + pg_net).
--
-- Before running:
--   1. Dashboard -> Database -> Extensions: enable pg_cron and pg_net.
--   2. Deploy the function:  supabase functions deploy market-sync
--   3. Store two secrets in Vault (SQL editor):
--        select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--        select vault.create_secret('<service role key>', 'service_role_key');
--
-- The results job runs every 10 minutes; the function itself only calls an operator when some
-- column of that market is between kickoff and "final", so idle runs are cheap.

create or replace function public.call_market_sync(kind text) returns bigint
  language sql security definer set search_path = public as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/market-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
    body := jsonb_build_object('kind', kind)
  ) $$;
revoke execute on function public.call_market_sync(text) from public, anon, authenticated;

select cron.schedule('market-sync-import', '17 4 * * *', $$ select public.call_market_sync('import') $$);
select cron.schedule('market-sync-results', '*/10 * * * *', $$ select public.call_market_sync('results') $$);
