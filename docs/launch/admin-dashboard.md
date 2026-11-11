# Group Bet operator admin (gb-admin.kfir.app): plan

Status: proposal, 2026-11-10. Nothing here is built or deployed.

## TL;DR

- **Build a small Bun + HTML-imports React SPA** in `admin/`, served as static assets from a **Cloudflare Worker** on `gb-admin.kfir.app` (same setup as `site/group-bet/`). It talks **directly to Supabase with the admin's own JWT**. Security sits entirely in Postgres: RLS plus `security definer` RPCs gated on `is_system_admin()`. No admin server, no service-role key in any browser, $0.
- **Stats are plain SQL functions** (`admin_stats()` and similar) returning JSON. No materialized views or pg_cron at today's scale.
- **Keep `columns.games` JSONB as the contract.** Add a `teams` catalog and `competitions`, and put *optional* ids (`home_team_id`, `away_team_id`, `fixture_id`) inside each game object. Mobile and the hapoel-toto web app keep working unchanged.
- **Ingestion** works through per-operator *adapters*, which are pure functions `raw → ColumnDraft` like the existing `drawToColumn` in `src/lib/winner.ts`. Raw data arrives by paste, CSV or bookmarklet in v1, and later by a scheduled Edge Function where an operator has an open feed. **Results are automated through API-Football's free tier** (100 req/day, enough because one `fixtures?ids=` call covers 20 games), with manual override.
- **Leave out** Supabase Studio duplicates (raw table editing), push sending, user impersonation, multi-admin roles, materialized analytics and audit logs. Studio already covers the rare cases.

---

## 1. Scope for v1

### Screens (7, each one route)

| # | Screen | What it does | Backing |
|---|---|---|---|
| 1 | **Dashboard** | KPI tiles plus 2 or 3 small charts (see KPIs below) | `admin_stats()` RPC |
| 2 | **Toto types** | List and create/edit: code, names, country, games count, default doubles/triples, timezone, adapter, `is_active` | `toto_types` table (RLS already allows sysadmin writes) |
| 3 | **Columns** | Filter by toto type and status (open / awaiting results / done / archived). Create from an import (paste, CSV or bookmarklet) or by hand. Edit games, enter results, archive (`is_active=false`). Shows bet count per column. | `columns` (RLS already allows sysadmin on global columns) |
| 4 | **Import review** | One step inside "create column", not a separate screen. Shows the parsed draft with each team name resolved to a team (green) or unresolved (red: pick an existing team or create one). Save is blocked until every name resolves. | `teams`, `team_aliases` |
| 5 | **Teams** | Search the catalog by country. Edit names per language, logo, external ids (API-Football, ScoreAxis). Manage aliases. **Merge duplicates** (repoints aliases and rewrites ids in open columns). | `teams`, `team_aliases`, `admin_merge_teams()` RPC |
| 6 | **Groups** | Search by name or join code. Shows members, created date, creator and toto types. **Delete group** behind a confirm. | `admin_groups(q)` and `admin_delete_group(id)` RPCs |
| 7 | **Users** | Search by name or email. Shows groups, bet count, last activity. **Delete user** behind a confirm. Toggle `is_system_admin` (Studio is acceptable for this). | `admin_users(q)` and `admin_delete_user(id)` RPCs |

### Dashboard KPIs (all from SQL; definitions matter more than charts)

- **Users**: total and new in the last 7 and 30 days (`profiles.created_at`).
- **WAU / MAU** = distinct users with a `user_bets.updated_at` in the window. Placing or editing a bet is the only meaningful action in this product. `auth.users.last_sign_in_at` is useless because mobile sessions persist. If "opened the app" matters later, use PostHog (already in the web app), not the DB.
- **Groups**: total, active (at least one bet in the last 14 days), median members, and a histogram of groups by size.
- **Bets per round**: for the last N columns of each toto type, `count(user_bets)`, plus the participation rate (bettors divided by members of groups playing that type).
- **Retention**: weekly cohorts by the week of a user's first bet, showing the share who bet again in weeks +1, +2 and +4. This is one SQL query and can be rendered as a small table, not a chart library.
- **Breakdowns by country / toto type**: users and bets grouped by `toto_types.country` and `code`, joined through `columns`. Users have no country field. Attribute a user to the countries of the toto types they bet on. Do **not** add `profiles.country` until a decision depends on it.
- **Ops alerts** (the most useful part of the page in practice): columns past their last kickoff + 3h that still have null results, open toto types with no upcoming column, and unresolved team names in open columns.

### Out of v1 (and when to add each)

- Raw table browsing and editing: **Supabase Studio** already does this. Link to it from the admin.
- Sending push or broadcast notifications: add once there is an actual campaign to send.
- An audit log: one admin means no audit trail is needed. Add an `admin_log` table when a second operator joins.
- Roles beyond `is_system_admin`, such as per-country editors: add when a second person needs scoped access.
- Materialized stats and pg_cron refresh: add when `admin_stats()` takes more than about 1s (likely at more than 1M `user_bets` rows).
- Automated operator scrapers: phase 3, one operator at a time, and only where a legal and stable feed exists.
- Non-1X2 game formats (UK Pools score-draws, Quiniela's "Pleno al 15" goals pick): out of scope until the toto-catalog decision says otherwise. The bet trigger only knows `1/X/2`.

---

## 2. Stack options

Options compared:

| Option | Maintenance | Fit | Cost | Verdict |
|---|---|---|---|---|
| **A. Bun + HTML-imports React SPA on a Cloudflare Worker (static assets), Supabase JWT + RLS/RPCs** | Low: one static bundle and no server. Reuses `winner.ts`, `scoreaxis.ts`, shadcn/ui components and Tailwind from `src/`. Same deploy as `site/group-bet`. | Exact: JSONB games editor, import review and alias resolution are custom UX that no-code tools handle badly. | $0 (Workers free tier is 100k req/day, and static asset requests are free) | **Recommended** |
| B. Extend the existing Vite admin (`src/pages/admin`) | It already works, but it is hard-wired to one group (`GROUP_ID`, `TOTO_TYPE_ID` constants in `src/services/supabase.ts`), always pads rounds to 16 rows, is Hebrew-only, and is deployed on Firebase. Generalizing it means a refactor inside the hapoel-toto product. | Medium | $0 | Lift its code into A instead. Leave the old admin alone until hapoel-toto is retired. |
| C. Off-the-shelf: Retool / Appsmith / NocoDB | Retool's free tier is cloud-hosted, but you then maintain a second app model and vendor lock-in, and its JSONB array editing and bookmarklet import flow are poor. Appsmith and NocoDB need self-hosting (a VM costs money and has to be patched). | Fine for CRUD, poor for import and alias resolution | $0 to $X | No |
| D. Metabase for stats only | Needs a JVM host (Render or Fly free tiers are flaky) or Metabase Cloud (paid). It also needs a direct DB connection with a read-only role. | Charts are better than you would hand-build | $0 only if self-hosted | Not now. If stats ever outgrow `admin_stats()`, point Metabase or Grafana Cloud's free tier at a read-only Postgres role. That stays read-only and adds no code. |
| E. Supabase Studio only | Zero code | Fine for moderation and edge cases, poor for daily column work | $0 | **Use it alongside A** for anything rare |

### Auth

- **Supabase Auth with Google sign-in**, the same provider the mobile app uses. Add `https://gb-admin.kfir.app` to Supabase Auth → URL configuration → redirect URLs. After sign-in the SPA reads `profiles.is_system_admin` and shows a "not authorized" page if it is false. **The UI check is cosmetic.** Every write and every admin RPC is enforced in Postgres (`is_system_admin()`), and `is_system_admin` cannot be set by clients because the column grants in `init.sql` exclude it.
- **Cloudflare Access is optional.** It is free for up to 50 users and adds a second gate in front of the page. Its cost is a second login prompt and one more thing to configure. Recommendation: skip it in v1, because RLS is the real boundary and the bundle contains no secrets. Add it if you want the admin URL to be invisible to scanners.
- Never ship the service-role key to the admin. Anything that needs elevated rights becomes a `security definer` RPC that starts with `if not is_system_admin() then raise ...`.

### Where stats live

- In `supabase/migrations/2026111x_admin.sql`: `create function admin_stats() returns jsonb language sql stable security definer` with an `is_system_admin()` guard (as plpgsql, or as a `where is_system_admin()` filter in SQL), and `revoke execute ... from anon`. One function returns all KPIs as JSON, so there is a single round trip and a single place to edit.
- Indexes needed: `user_bets (updated_at)` and `profiles (created_at)`. `user_bets (column_id)` already exists.
- **No materialized views or pg_cron yet.** Aggregating a few hundred thousand rows takes milliseconds. Note that pg_cron on Supabase Free stops if the project pauses after 7 idle days, which will not happen once real users are betting.

### Recommendation

**Option A**, with Supabase Studio as the fallback for rare operations. Layout:

```
admin/
  index.html          # <script type="module" src="./main.tsx">
  main.tsx            # router + pages (start as one file per page)
  pages/*.tsx
  adapters/*.ts       # operator importers (winner.ts moves here, re-exported from src/lib for the old admin)
  build.ts            # Bun.build({ entrypoints: ["admin/index.html"], outdir: "admin/dist", plugins: [tailwind] })
  wrangler.jsonc      # assets: ./dist, SPA fallback, route gb-admin.kfir.app custom_domain
```

- Dev: `bun admin/index.html` (Bun's dev server with HMR). Deploy: `bun admin/build.ts && bunx wrangler deploy -c admin/wrangler.jsonc`.
- Tailwind through `bun-plugin-tailwind`. Reuse `src/components/ui/*` by import path, with no copying.
- Charts: a few `<div>` bars or an inline SVG sparkline. Recharts is already a root dependency and can be used if wanted. Do not add a new chart library.
- i18n: English only. The operator is one person, and team names are data, not UI.

---

## 3. Column ingestion at scale

### Current state (the problems)

- Teams are free-text strings in `columns.games[].home_team/away_team`, in the operator's language (Hebrew for Winner).
- `team_aliases` is keyed by the **Hebrew name** and holds `en_name` and `scoreaxis_team_id`. It is effectively a one-language team table and cannot represent "Arsenal" in Swedish, Norwegian and Hebrew at once.
- Competition is a free-text string per game.
- A column has no source or external id, so re-importing the same draw creates a duplicate.
- Results are typed by hand. Live tracking uses ScoreAxis ids found through a bookmarklet.

### Data model changes (all additive)

```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  country text,                       -- ISO-2; null for national teams/unknown
  names jsonb not null default '{}',  -- {"en":"Arsenal","he":"ארסנל","sv":"Arsenal"}
  logo_url text,                      -- Supabase Storage public URL (bucket 'teams')
  api_football_id int unique,
  scoreaxis_id text unique,
  created_at timestamptz not null default now()
);

create table competitions (
  id uuid primary key default gen_random_uuid(),
  country text,
  names jsonb not null default '{}',
  api_football_id int unique
);

-- team_aliases becomes "any raw string an operator uses → team"
alter table team_aliases add column team_id uuid references teams on delete cascade;
-- keep he_name as the PK for now (rename to `alias` later; it is just a raw name).
-- Backfill: one teams row per existing alias, names = {he: he_name, en: en_name}, scoreaxis_id copied.

alter table toto_types
  add column games_count int,                 -- 16 Winner, 13 Stryktipset, 12 Norsk Tipping...
  add column timezone text not null default 'Asia/Jerusalem',
  add column adapter text,                    -- 'winner' | 'csv' | 'stryktipset' ...
  add column is_active boolean not null default true;

alter table columns
  add column source text,                     -- adapter name or 'manual'
  add column external_id text,                -- operator draw number
  add unique (toto_type_id, external_id);     -- re-import = upsert, not duplicate
```

Each game object in `columns.games` gains **optional** keys, and existing keys keep their meaning:

```json
{ "game_num": 1, "home_team": "ארסנל", "away_team": "צ'לסי", "competition": "פרמייר ליג",
  "game_time": "...", "result": null, "live_tracker_id": "...",
  "home_team_id": "uuid", "away_team_id": "uuid", "competition_id": "uuid",
  "fixture_id": 1234567, "result_source": "auto" }
```

Why games stay in JSONB rather than moving to a `games` table: `score_bet`, `check_user_bet`, `rescore_column`, realtime on `columns`, the mobile app and the web app all read the JSONB array. A games table would rewrite all of them for no user-visible gain. The catalog only needs to be *referenced* from the JSONB. Revisit if a game must belong to several columns, for example when building synthetic rounds.

RLS: `teams` and `competitions` get read for all authenticated users (the mobile app may want logos later) and writes for sysadmin only, the same pattern as `team_aliases`. Add a `teams` storage bucket with public read and sysadmin write.

### Import pipeline

Every source produces the same `ColumnDraft = { name, deadline, external_id, games: [{ game_num, home, away, competition, game_time }] }`. One review screen then:

1. Resolves each raw name through `team_aliases` (exact match first, then normalized: lowercase with punctuation and diacritics stripped) to get a `team_id`.
2. For unresolved names, offers a pick or create. Choosing one writes the alias, so the next import from that operator resolves automatically. **This is how the team catalog grows: by use, not by bulk entry.**
3. Optionally matches each game to an API-Football fixture (by team ids and kickoff date; this needs `api_football_id` on both teams) and stores `fixture_id`.
4. Upserts on `(toto_type_id, external_id)`.

Input options, cheapest first:

| Source | How | When |
|---|---|---|
| Manual form | Rows sized by `toto_types.games_count` | Always available |
| **CSV/TSV paste** | `game_num,home,away,competition,kickoff_local`, parsed in the browser and interpreted in `toto_types.timezone` | v1. Covers any operator; copy from the operator's site into a spreadsheet and paste |
| **JSON paste / bookmarklet** | Operator-specific adapter. Winner already exists (`winner.ts`), because its API is bot-protected and must be fetched from the admin's own browser | v1 for Winner, later others |
| Scheduled Edge Function | pg_cron + pg_net calls `import-<operator>` weekly, writing drafts (`is_active=false`) for review | Phase 3, only for operators with an open or keyed feed. Svenska Spel (Stryktipset/Europatipset) appears to issue API keys on request by email; that is unverified, so ask them. Avoid scraping sites protected by bot detection from servers. |
| Synthetic rounds from fixtures | Pick N matches from API-Football fixtures for a league/weekend → a "Group Bet <country> weekly" toto type that needs no operator | Phase 3 growth lever: the only way to launch a country with no pools operator, and it needs no scraping |

### Sports data APIs (checked Nov 2026; verify on signup)

| API | Free tier | Coverage | Use |
|---|---|---|---|
| **API-Football (api-sports.io)** | 100 req/day across all endpoints, resetting 00:00 UTC; per-minute cap reported as 10 to 30; recent seasons only. Pro is about $19/mo for 7,500 per day | ~1,000+ leagues including Israel, Scandinavia and lower divisions, with team logos and ids | **Primary**: fixture matching, team ids and logos, results |
| football-data.org | 10 req/min, 12 top competitions | EPL, the big-5 leagues, CL, Eredivisie, Primeira, Championship, Brazil, World Cup and Euros | Too narrow (no Israel or Scandinavia). Skip |
| TheSportsDB | Free shared key, about 30 req/min, results capped; Premium about $9/mo via Patreon (v2, livescores) | Broad, crowd-sourced, good badge images | Optional source of logos only |
| SportMonks | Free plan limited to a few leagues; paid from about €29+/mo | Excellent | Upgrade path only if API-Football fails |

Budget check for API-Football free: results polling calls `fixtures?ids=a-b-c...` with up to 20 ids per call, so one call covers a whole column. Polling every 30 min only while some game is between kickoff+105min and kickoff+6h, across 10 open columns, uses roughly 30 to 60 calls per matchday. That fits in 100 per day. Team and fixture matching at import is about 1 to 3 calls per column (`fixtures?date=` for each date in the round).

### Automatic results

- Edge Function `sync-results` (Deno, about 80 lines), triggered by pg_cron + pg_net every 30 min. It selects global columns that have games where `result is null and fixture_id is not null and game_time < now() - interval '105 min'`, batches the fixture ids, fetches them, maps the full-time score to `1/X/2`, and updates `columns.games` in one statement per column. The existing `rescore_column` trigger then rescores every bet. The API key is stored in Edge Function secrets.
- **Toto rules differ from the scoreboard.** Most operators score the 90-minute result (API-Football `score.fulltime`, not extratime or penalties). Postponed or abandoned games are settled by operator rules (lottery or "random result" panels). So: auto only fills `result` when the fixture status is `FT`. `PST`, `ABD`, `CANC` and `AWD` raise an ops alert on the dashboard for manual entry. A manual edit sets `result_source:'manual'` and is never overwritten by the sync.
- Games without `fixture_id` stay manual, as today.
- Supabase Free includes about 500k Edge Function invocations per month. This uses about 1.5k.

---

## 4. Impact on existing apps and backward compatibility

| Change | Mobile (`mobile/src/core/types.ts`, `queries.ts`) | hapoel-toto web (`src/`) | Action |
|---|---|---|---|
| New keys inside game objects | Ignored. `Game` is a TS interface over `select('*')` | Ignored for display. The old `ColumnForm` preserves unknown keys (it spreads the existing game object) | None |
| `teams`, `competitions`, new columns on `toto_types`/`columns` | Not selected or ignored | Not selected or ignored | None |
| `team_aliases.team_id` added | Not read | `TeamsList` and `ColumnForm` upsert `he_name/en_name/scoreaxis_team_id`, which still works; new rows have `team_id` null until resolved | Keep `team_aliases` columns as they are in phase 1. Drop `en_name` and `scoreaxis_team_id` only after the old admin is retired |
| Non-16-game columns (13, 12...) | Work: the trigger and UI iterate `games` | **Old `ColumnForm` pads every column to 16 rows** (`createEmptyGames`) and saves them, which would make bets impossible to complete. It only edits `TOTO_TYPE_ID` columns, so this is safe as long as the old admin edits only Winner Toto 16 | Rule: Winner Toto 16 is edited in one admin only. Move it to the new admin and stop using the old form for global columns |
| `is_active=false` used for archive | Already filtered (`.eq('is_active', true)`) | Check the web column list | None |
| Results written by Edge Function | Realtime on `columns` already published; the web app refreshes | Same | None |

Later and optional: mobile renders localized team names and logos by reading `home_team_id → teams.names[locale]` and falling back to the `home_team` string. This is additive and ships whenever the app wants it.

Migration order: one migration file that is purely additive (tables, columns, indexes, RPCs, policies) plus a backfill `insert into teams ... from team_aliases`. No destructive step in v1.

---

## 5. Phased plan

| Phase | Content | Effort |
|---|---|---|
| **0. Skeleton** | `admin/` Bun SPA, Google sign-in, `is_system_admin` gate, Worker on `gb-admin.kfir.app`, redirect URL added in Supabase | S (half a day) |
| **1. Ops parity** | Toto types CRUD; columns list, form, results and archive, generalized from `ColumnForm` (row count from `games_count`, timezone from the toto type); Winner adapter moved in; CSV paste adapter; groups and users moderation RPCs and screens | M (3 to 5 days) |
| **2. Dashboard** | `admin_stats()` with KPIs, cohorts, breakdowns and ops alerts; one dashboard page | S to M (1 to 2 days) |
| **3. Team catalog** | `teams`/`competitions` migration plus backfill; teams screen (names per language, logo upload, external ids, aliases, merge); import review with alias resolution; team ids written into games | M (3 to 4 days) |
| **4. Auto results** | API-Football account; fixture matching at import; `sync-results` Edge Function plus pg_cron; manual override and alerts | M (2 to 3 days) |
| **5. Scale-out (per country, as needed)** | Operator adapters (keyed feeds or bookmarklets); scheduled imports; synthetic fixture-based rounds; mobile shows localized names and logos | L, ongoing, about 1 day per operator |

Phases 2 and 3 can swap if launching a second country comes before measuring the first.

### First 3 concrete tasks

1. **Scaffold `admin/` and deploy an empty authenticated shell.** Add `admin/index.html`, `main.tsx`, `build.ts` and `wrangler.jsonc` (copying `site/group-bet/wrangler.jsonc` with route `gb-admin.kfir.app` and SPA fallback). Wire Supabase Google sign-in with the existing anon key, add the redirect URL in the Supabase dashboard, and show "not an admin" unless `profiles.is_system_admin`. Done when Kfir can sign in on `gb-admin.kfir.app` and a non-admin Google account sees nothing.
2. **Write migration `20261110000000_admin.sql`.** It contains `toto_types` additions (`games_count`, `timezone`, `adapter`, `is_active`), `columns.source/external_id` plus the unique constraint, indexes on `user_bets(updated_at)` and `profiles(created_at)`, and admin RPCs `admin_stats()`, `admin_groups(q)`, `admin_delete_group(id)`, `admin_users(q)` and `admin_delete_user(id)`, all guarded by `is_system_admin()` with execute revoked from `anon`. Add one pgTAP or SQL test in `supabase/tests/` proving that a non-admin gets `42501`.
3. **Port the columns workflow.** Add a toto-type-scoped columns list and a form with rows from `games_count`, results entry and archive. Move `winner.ts` into `admin/adapters/`, re-exported from `src/lib/winner.ts` so the old admin keeps compiling, and add the CSV paste adapter with a `bun test` for parsing and the timezone conversion. After this, the old Firebase admin no longer needs to touch global columns.

## Sources

- API-Football pricing and limits: https://www.api-football.com/pricing , https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide
- football-data.org policies: https://docs.football-data.org/general/v4/policies.html
- TheSportsDB API docs: https://www.thesportsdb.com/docs/api
- Supabase pricing, plus Free tier pausing after 7 idle days: https://supabase.com/pricing , https://supabase.com/docs/guides/platform/billing-on-supabase
- Cloudflare Access (free for under 50 users): https://www.cloudflare.com/teams-access/
- Stryktipset API key by request (community project, unofficial): https://github.com/kotlinski/pot-bot
