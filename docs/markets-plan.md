# Multi-market plan: Toto markets beyond Israel

Status: **draft for review** · 2026-11-10 (rev 3: decisions made; markets A-Z)

## 1. Goal

Run Totohapoel for the main football-pools ("Toto") markets, Israel included. For every market the app must:

1. **Import columns.** Pull the operator's open draw (games, kickoff times, deadline) into a new column.
2. **Import results.** Fill each game's 1/X/2 result from the operator, then score everyone's bets automatically.
3. **Speak the market's language.** The UI is translated, uses the market's terms ("טור", "kupong", "rad", "quiniela") and its time zone, and switches between RTL and LTR.

A market counts as done only when all three work. See the checklist in §7.

**Out of scope:** placing real bets with operators, payments, and UK Football Pools. The Classic Pools is a different game (pick 8 score draws from about 49 matches), not 1X2.

## 2. What is Israel-specific today

| Area | Today | Where |
|---|---|---|
| Column import | Winner `GetTotoDraws` via a bookmarklet that runs on winner.co.il (bot protection blocks server calls) | `src/lib/winner.ts`, `ColumnForm.tsx` |
| Results | Admin sets each result by hand. Scoring (`correct_guesses`) is computed **in the browser** and saved | `ColumnForm.tsx` `handleSetResult`, `useRecalculateCorrectGuessesMutation` |
| Match ids | ScoreAxis lookup bookmarklet, for the live widget only | `src/lib/scoreaxis.ts` |
| Time | `Asia/Jerusalem` hard-coded, `date-fns/locale/he` | `winner.ts`, `Column.tsx`, `GroupBet.tsx` |
| Language | Hebrew strings inlined in about 27 files. `<html lang="he" dir="rtl">` is static | `index.html`, `src/**` |
| Game shape | 1X2 only. Game count comes from the import (16 for Israel). Doubles/triples limits per column | `database.types.ts` |
| Tenancy | One implicit group: every user sees every column and every bet. Limits exist only per column (`max_doubles/max_triples`, `group_max_*` for the group bet) | DB / RLS |

Dead code: `useSetResultMutation` writes to a `games` table, but games live in `columns.games` (jsonb).

## 3. Architecture

### 3.1 Market package

Each market is a self-contained folder, so adding a country means adding a folder:

```
src/markets/
  registry.ts            // code -> MarketPackage
  types.ts
  il/  config.ts  adapter.ts  glossary.ts  fixtures/*.json  adapter.test.ts
  se/  ...
supabase/functions/market-sync/   // server half of the adapters (Deno)
src/locales/{he,en,sv,fi,es,...}/common.json
```

```ts
type Outcome = '1' | 'X' | '2';

interface MarketConfig {
  code: 'il' | 'se' | 'fi' | 'es' | ...;
  operator: string;            // "Winner", "Svenska Spel", ...
  product: string;             // "Toto 16", "Stryktipset"
  defaultLocale: string;       // 'he', 'sv', ...
  timeZone: string;            // 'Asia/Jerusalem', 'Europe/Stockholm'
  gamesPerDraw: number | 'variable';
  outcomeLabels: Record<Outcome, string>;   // Japan shows 1/0/2, data stays 1/X/2
  defaultLimits: { maxDoubles: number; maxTriples: number };
  extras?: ('pleno15')[];      // market-specific extra picks
  postponedPolicy: 'void' | 'operator-decides' | 'lottery';
}

interface MarketAdapter {
  transport: 'server' | 'browser-bridge';   // browser-bridge = bookmarklet on the operator site
  listOpenDraws(): Promise<DrawDTO[]>;
  getDraw(externalId: string): Promise<DrawDTO>;
  getResults(externalId: string): Promise<ResultDTO>;  // per game: result | void | pending, plus source
}
```

`DrawDTO` and `ResultDTO` are market-neutral. One shared `drawToColumn()` replaces the Winner-specific one.

### 3.2 Data flow

- **Server transport** (open JSON endpoints): a Supabase Edge Function `market-sync`, run by `pg_cron`:
  - **import:** daily. Creates the column for each new draw, once per market. Every group in that market gets it automatically (a `group_columns` row), and each group admin can deactivate or archive it for their group.
  - **results:** every 10 min while a column has kickoff ≤ now ≤ last kickoff + 3h, then hourly until the draw is final.
- **Browser-bridge transport** (bot-protected sites like Winner): keep the bookmarklet pattern. Add a results bookmarklet. The admin clicks it on the operator's site and it posts back through `window.opener`, as ScoreAxis does.
- **Scoring moves server-side.** A Postgres function `score_column(column_id)` recomputes `user_bets.correct_guesses` and every group's `group_columns.group_bet_correct_guesses`. A trigger runs it whenever `columns.games` changes. This is required: automated results have no browser to compute scores. It also removes the race in today's client-side recalculation.
- **Manual override stays.** Admin-set results are stored as `result_source: 'manual'` and are never overwritten by a sync.

### 3.3 Results source of truth

**Results come only from the operator.** No third-party football API, for now. Operators void postponed or abandoned matches, or settle them by lottery (Sweden's "lottning", Spain's sorteo), so only the operator's result matches its prize table. If an operator feed is down, a super-admin enters results by hand (`result_source: 'manual'`).

### 3.4 Groups, and limits at two levels

The app becomes multi-group. A **column** is the operator's draw. It is imported once per market and shared by every group in that market. **Everything players do happens inside one group:**

- **A bet belongs to exactly one group.** A player in two groups fills a separate bet in each. Bets, votes, stats, the group bet and the voter lists never cross groups. A "copy my bet from group X" button is fine as a convenience: it copies, it doesn't link.
- **Limits are set at two levels:**
  1. **Column (operator rules):** `columns.max_doubles/max_triples` = the most the operator allows for that draw. They come from the market config or the draw itself, and only the importer or a super-admin sets them.
  2. **Group:** each group sets its own `max_doubles/max_triples`, as a group default plus an optional override per column.
  - **Effective limit** = `min(group override ?? group default, column max)`. The UI enforces it and a DB trigger rejects bets over it. A group can't allow more than the operator does.
- **Creating and joining groups:**
  - **Any user can create a group.** They pick its name, market and limits, and become its first admin.
  - **Joining is always by invite link** (`/join/<invite_code>`). Groups are never listed or searchable.
    - **Open group:** opening the link joins at once.
    - **Closed group:** opening the link creates a join request. A group admin approves or rejects it, and the user gets in only after approval.
  - Group admins can switch open/closed, regenerate the link (the old one stops working), promote other admins, and remove members. The last admin can't leave without promoting someone else.
  - Joining runs through a security-definer RPC `join_group(invite_code)`, so nobody can add themselves to a group without the code.
- **Per-group column state.** `is_active`, `is_archived` (the archive feature moves here from `columns`), and the shared group bet with its own budget and score all become per group.

### 3.5 Schema changes (one migration)

```sql
-- markets / sync
alter table columns
  add column market text not null default 'il',
  add column external_draw_id text,                 -- operator draw number
  add column source_status text,                    -- 'open' | 'closed' | 'final'
  add column synced_at timestamptz,
  add constraint columns_market_draw_uniq unique (market, external_draw_id);
-- columns.max_doubles / max_triples now mean "operator maximum"
-- columns.games[] items gain: external_id, status ('scheduled'|'played'|'void'|'lottery'),
--                              result_source ('operator'|'provisional'|'manual')

-- groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  market text not null,                       -- one market per group
  locale text,                                -- null = market default
  max_doubles int not null, max_triples int not null,   -- group defaults
  join_policy text not null default 'open',   -- 'open' | 'closed'
  invite_code text not null unique,           -- random; admin can regenerate (old link stops working)
  created_by uuid references profiles(id), created_at timestamptz default now()
);
create table group_join_requests (            -- closed groups only
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status text not null default 'pending',     -- 'pending' | 'approved' | 'rejected'
  decided_by uuid references profiles(id), created_at timestamptz default now(), decided_at timestamptz,
  primary key (group_id, user_id)
);
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member',        -- 'admin' | 'member'
  primary key (group_id, user_id)
);
create table group_columns (                  -- a column as seen by one group
  group_id uuid references groups(id) on delete cascade,
  column_id uuid references columns(id) on delete cascade,
  max_doubles int, max_triples int,           -- null = group default; capped by columns.* (trigger)
  is_active boolean not null default true,
  is_archived boolean not null default false,
  group_bet jsonb, group_bet_max_doubles int, group_bet_max_triples int,
  group_bet_correct_guesses int,
  primary key (group_id, column_id)
);
alter table user_bets add column group_id uuid not null references groups(id);
alter table user_bets add constraint user_bets_one_per_group unique (group_id, column_id, user_id);
alter table profiles add column locale text;  -- personal override
-- profiles.is_admin becomes "super-admin" (imports, markets); group admin = group_members.role
```

**RLS:** members read only their groups' `group_columns`, `user_bets` and member profiles. Group admins write their group's `group_columns`. Bets are insert/update-only by their owner, and only for a group they belong to, before the deadline, within the effective limit.

**Backfill** (existing Israeli data): create one group "טוטו הפועל" (market `il`) and add all profiles as members, with current admins as group admins. Set `group_id` on every `user_bets` row. Copy `is_active`, `is_archived`, `group_bet*` and the current limits from `columns` into `group_columns`. Set `columns.max_*` to the operator maximum.

### 3.6 i18n

- Use `react-i18next` with namespaces: `common` (shared UI) plus a per-market `glossary` that overrides wording (טור / kupong / rad / quiniela).
- Language and market are separate. An Israeli user may want English, so the locale comes from the profile first, then the group, then the market default.
- `<html lang dir>` is set at runtime: RTL for `he` (and `ar` later), LTR otherwise. Tailwind already uses logical `ms-`/`me-`/`text-start`, but some physical `left`/`right` classes need an audit.
- A `date-fns` locale map plus a helper `formatInMarketTz()`. Numbers and currency go through `Intl`.
- Locale files: `he` (extracted from the current code), `en` (base and fallback), then one file per market as it ships. A CI check fails if any key is missing.

## 4. Market catalogue (A-Z)

Endpoint facts below come from public reference repos and forums, not official docs. **Each market starts with a spike** (§6) that confirms them. "—" means no source found yet.

| Market | Operator · game | Games | Columns source | Results source | Transport | Locale | Notes |
|---|---|---|---|---|---|---|---|
| 🇦🇹 Austria | win2day (Österreichische Lotterien) · Toto | *verify* | — | — | ? | `de-AT` | |
| 🇧🇷 Brazil | Caixa · Loteca | 14 | — | — | ? | `pt-BR` | |
| 🇩🇰 Denmark | Danske Spil · Tips 13 | 13 | — | — | ? | `da` | |
| 🇫🇮 Finland | Veikkaus · Vakio | varies (usually 13) | `/api/sport-open-games/v1/games/SPORT/draws` | results endpoint *(to find)* | server | `fi` | Veikkaus publishes a reference robot (`veikkaus/sport-games-robot`). Header `X-ESA-API-Key: ROBOT` |
| 🇩🇪 Germany | Lotto state companies · Toto 13er Ergebniswette | 13 | — (lotto.de) | — | ? | `de` | |
| 🇮🇱 Israel | Winner · Toto 16 | 16 | Winner `GetTotoDraws` (built) | Winner results / draw history *(to find)* | browser-bridge | `he` (RTL) | Bot protection blocks server calls |
| 🇮🇹 Italy | Sisal / ADM · Totocalcio | *verify* (8 mandatory + optional since 2022) | — | — | ? | `it` | |
| 🇯🇵 Japan | JSC · toto | 13 | — | — | ? | `ja` | Labels 1/0/2 |
| 🇳🇴 Norway | Norsk Tipping · Tipping | 12 | — | — | ? | `nb` | Saturday/Sunday/midweek coupons |
| 🇪🇸 Spain | SELAE · La Quiniela | 14 + Pleno al 15 | loteriasyapuestas.es (`game_id=LAQU`, HTML/JSON *to find*) | same | server (HTML parse if needed) | `es` | Pleno al 15 = goals per team (0/1/2/M), needs an `extras` pick type |
| 🇸🇪 Sweden | Svenska Spel · Stryktipset (+ Europatipset, Topptipset) | 13 (Topptipset 8) | `api.spela.svenskaspel.se/draw/1/{product}/draws` | same API, `/draws/{n}/result` | server | `sv` | Needs an **access key**, requested from Svenska Spel by email. Lottery for postponed games |

## 5. Phases

**Phase 0: Foundations.** Israel keeps working throughout.
1. Install i18n, extract all Hebrew into `he/common.json`, write `en`, and set `lang`/`dir` at runtime.
2. Market registry with `il` as its only entry. Move `winner.ts` into `markets/il`. Remove hard-coded `Asia/Jerusalem` and `locale: he`.
3. Run the migration in §3.5 (markets, **groups**, invites and join requests, `group_columns`, `user_bets.group_id`, RLS) and backfill the existing data into one Israeli group.
4. **Groups in the UI:**
   - create group, `/join/<code>` page, and a group switcher in the header
   - every query scoped to the current group (column page, votes, stats, profile, group bet, admin list)
   - group-admin screens: members, join requests, invite link and open/closed, the group's limits (default and per column, capped by the operator maximum), activate and archive
5. Server-side `score_column()` plus a trigger. Remove the client-side recalculation and the dead `useSetResultMutation`.
6. `market-sync` Edge Function skeleton with `pg_cron`, sync logging, and a super-admin "last synced / errors" view.

**Phases 1–11: one market at a time, A-Z.** Austria, Brazil, Denmark, Finland, Germany, Israel, Italy, Japan, Norway, Spain, Sweden. Each starts with a spike (§6) and ends with the definition of done (§7). A market whose spike finds no viable source is parked, and work moves to the next letter.
- Israel already has import. Its phase adds results: a results bookmarklet on winner.co.il, with manual entry as the fallback.
- Spain's phase adds the Pleno al 15 extra.
- Sweden's phase needs the access key. Request it now, so it arrives before its turn.

## 6. Per-market spike (½–1 day, before any code)

- Confirm the draws and results endpoints, auth, CORS and bot protection, and rate limits. Save real payloads as `fixtures/*.json` for tests.
- Read the operator's terms for automated access. Prefer documented or partner access; ask the operator when unclear.
- Note the game rules: game count, postponed-match policy, extras, and how system bets map to doubles/triples.
- Outcome: either **server** or **browser-bridge**, or "no viable source" (the market waits).

## 7. Definition of done, per market

- [ ] `src/markets/<code>/`: config, adapter, glossary, fixture-based tests
- [ ] Column import: a draft column is created automatically, or with one click for browser-bridge
- [ ] Results: filled automatically within about 15 min of full time; void and lottery games handled; manual override kept
- [ ] Scores update automatically (server-side)
- [ ] Operator maximum for doubles/triples set from the market rules; a group can't exceed it
- [ ] Locale file complete (CI key check), correct `dir`, dates in the market's time zone, market glossary
- [ ] Admin docs: how to get API keys and run the bookmarklet if one is used

## 8. Decisions

**Made**
1. Many groups in one deployment. Each group has one market, its own limits and its own bets (§3.4).
2. Any user can create a group.
3. Joining is always by invite link. Open groups join at once; closed groups need an admin's approval.
4. Markets are built in A-Z order (§5).
5. Results come only from the operator. No third-party football API for now.

**Open**
1. Who emails Svenska Spel (Sweden's state-owned gaming operator) for the API access key?

## Sources (endpoint hints, unofficial)

- Svenska Spel draw API patterns: <https://www.sweclockers.com/forum/trad/1645429-oppet-api-for-stryktipset>, <https://github.com/andreyhgl/stryktipset-results>, <https://github.com/kotlinski/pot-bot>
- Veikkaus reference robot: <https://github.com/veikkaus/sport-games-robot>, <https://github.com/miikama/veikkaaja>
- SELAE results page and `game_id=LAQU`: <https://www.loteriasyapuestas.es/es/resultados-medios/resultados-ultimos-sorteos>
