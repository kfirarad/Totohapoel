# Multi-market plan: Toto markets beyond Israel

Status: **draft for review** · 2026-11-10

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
| Tenancy | One implicit group: every user sees every column | DB / RLS |

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
  - **import:** daily. Creates draft columns (`is_active=false`) for new draws. An admin reviews and activates them.
  - **results:** every 10 min while a column has kickoff ≤ now ≤ last kickoff + 3h, then hourly until the draw is final.
- **Browser-bridge transport** (bot-protected sites like Winner): keep the bookmarklet pattern. Add a results bookmarklet. The admin clicks it on the operator's site and it posts back through `window.opener`, as ScoreAxis does.
- **Scoring moves server-side.** A Postgres function `score_column(column_id)` recomputes `user_bets.correct_guesses` and `group_bet_correct_guesses`. A trigger runs it whenever `columns.games` changes. This is required: automated results have no browser to compute scores. It also removes the race in today's client-side recalculation.
- **Manual override stays.** Admin-set results are stored as `result_source: 'manual'` and are never overwritten by a sync.

### 3.3 Results source of truth

Use the **operator's own result**, not a general football API. Operators void postponed or abandoned matches, or settle them by lottery (Sweden's "lottning", Spain's sorteo), so only the operator's result matches its prize table. A general football API (one provider for all markets, matched by teams and kickoff, or Winner's `betRadarId`) is useful only as a **provisional** result while matches are live, and as a fallback when the operator feed is down. It is never final.

### 3.4 Schema changes (one migration)

```sql
alter table columns
  add column market text not null default 'il',
  add column external_draw_id text,                 -- operator draw number
  add column source_status text,                    -- 'open' | 'closed' | 'final'
  add column synced_at timestamptz,
  add constraint columns_market_draw_uniq unique (market, external_draw_id);
-- columns.games[] items gain: external_id, status ('scheduled'|'played'|'void'|'lottery'),
--                              result_source ('operator'|'provisional'|'manual')
alter table profiles add column locale text;        -- null = market default
create table app_settings (key text primary key, value jsonb);  -- default market and locale
```

### 3.5 i18n

- Use `react-i18next` with namespaces: `common` (shared UI) plus a per-market `glossary` that overrides wording (טור / kupong / rad / quiniela).
- Language and market are separate. An Israeli user may want English, so the locale comes from the profile first, then the market default.
- `<html lang dir>` is set at runtime: RTL for `he` (and `ar` later), LTR otherwise. Tailwind already uses logical `ms-`/`me-`/`text-start`, but some physical `left`/`right` classes need an audit.
- A `date-fns` locale map plus a helper `formatInMarketTz()`. Numbers and currency go through `Intl`.
- Locale files: `he` (extracted from the current code), `en` (base and fallback), then one file per market as it ships. A CI check fails if any key is missing.

## 4. Market catalogue

Endpoint facts below come from public reference repos and forums, not official docs. **Each market starts with a spike** (§6) that confirms them.

### Wave 1

| # | Market | Operator / game | Games | Columns source | Results source | Transport | Notes |
|---|---|---|---|---|---|---|---|
| 1 | 🇮🇱 Israel | Winner · Toto 16 | 16 | Winner `GetTotoDraws` (exists) | Winner results/draw-history endpoint *(to find)*, fallback betRadarId to a football API | browser-bridge | Bot protection blocks server calls. Locale `he`, RTL |
| 2 | 🇸🇪 Sweden | Svenska Spel · Stryktipset (+ Europatipset, Topptipset on the same API) | 13 (Topptipset 8) | `api.spela.svenskaspel.se/draw/1/{product}/draws` | same API `/draws/{n}/result` | server | External API needs an **access key**, requested from Svenska Spel by email. Lottery for postponed games. `sv` |
| 3 | 🇫🇮 Finland | Veikkaus · Vakio | varies (usually 13) | `/api/sport-open-games/v1/games/SPORT/draws` | Veikkaus results endpoint *(to find)* | server | Veikkaus publishes a reference robot (`veikkaus/sport-games-robot`). Uses header `X-ESA-API-Key: ROBOT`. `fi` |
| 4 | 🇪🇸 Spain | SELAE · La Quiniela | 14 + Pleno al 15 | loteriasyapuestas.es (HTML/JSON *to find*, `game_id=LAQU`) | same | server (HTML parse if needed) | Pleno al 15 = goals per team (0/1/2/M) and needs an `extras` pick type. `es` |

### Wave 2 (spike first; no confirmed public source yet)

| Market | Game | Games | Notes |
|---|---|---|---|
| 🇳🇴 Norway | Norsk Tipping · Tipping | 12 | Saturday/Sunday/midweek coupons. No documented API. `nb` |
| 🇩🇰 Denmark | Danske Spil · Tips 13 | 13 | `da` |
| 🇩🇪 Germany | Toto 13er Ergebniswette | 13 | Run by the 16 state Lotto companies through lotto.de. `de` |
| 🇮🇹 Italy | Sisal/ADM · Totocalcio | *verify* (8 mandatory + optional since 2022) | `it` |
| 🇦🇹 Austria | win2day · Toto | *verify* | `de-AT` |
| 🇧🇷 Brazil | Caixa · Loteca | 14 | `pt-BR` |
| 🇯🇵 Japan | JSC · toto | 13 | Labels 1/0/2. `ja` |

## 5. Phases

**Phase 0: Foundations (no visible change; Israel keeps working)**
1. Install i18n, extract all Hebrew into `he/common.json`, write `en`, and set `lang`/`dir` at runtime.
2. Market registry with `il` as its only entry. Move `winner.ts` into `markets/il`. Remove hard-coded `Asia/Jerusalem` and `locale: he`.
3. Run the migration in §3.4 and backfill `market='il'`.
4. Server-side `score_column()` plus a trigger. Remove the client-side recalculation and the dead `useSetResultMutation`.
5. `market-sync` Edge Function skeleton with `pg_cron`, sync logging, and an admin "last synced / errors" view.

**Phase 1: Israel complete.** Spike the Winner results source. Add a results bookmarklet (browser-bridge), or betRadarId plus a football-API fallback. Import is unchanged.

**Phase 2: Sweden.** Request the access key on day 1 (lead time). Build the Stryktipset adapter for import and results, the Swedish locale and glossary, and lottery handling for postponed games. Europatipset and Topptipset follow almost free.

**Phase 3: Finland** (open API, low risk). **Phase 4: Spain** (adds the Pleno al 15 extra). **Then Wave 2**, one market at a time, each starting with a spike.

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
- [ ] Locale file complete (CI key check), correct `dir`, dates in the market's time zone, market glossary
- [ ] Admin docs: how to get API keys and run the bookmarklet if one is used

## 8. Decisions needed

1. **Tenancy.** One deployment per market, or several groups (each with its own market) in one deployment? This plan assumes the current single group plus a default market. Several groups means adding a `groups` table and RLS, about one extra phase.
2. **Wave 1 order.** Proposed: IL → SE → FI → ES.
3. **Football-API fallback.** Is a paid provider acceptable as the provisional/fallback results source, or operator-only?
4. **Sweden access key.** Who contacts Svenska Spel?

## Sources (endpoint hints, unofficial)

- Svenska Spel draw API patterns: <https://www.sweclockers.com/forum/trad/1645429-oppet-api-for-stryktipset>, <https://github.com/andreyhgl/stryktipset-results>, <https://github.com/kotlinski/pot-bot>
- Veikkaus reference robot: <https://github.com/veikkaus/sport-games-robot>, <https://github.com/miikama/veikkaaja>
- SELAE results page and `game_id=LAQU`: <https://www.loteriasyapuestas.es/es/resultados-medios/resultados-ultimos-sorteos>
