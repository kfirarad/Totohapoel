# Weekly football pools ("toto") worldwide: what Group Bet could mirror

Research date: 2026-11-10. Sources were web searches plus live HTTP checks of operator endpoints made that day. Each claim is marked **[verified]** (endpoint or official page checked by us), **[press]** (news or press release, dated where known) or **[unverified]** (secondary source or memory, so check it before you build). Money amounts are approximate.

Group Bet's model today: one shared coupon per round, about 13–16 matches, 1/X/2 picks with a limited number of doubles and triples, and leaderboards. A game fits **natively** when it is pure 1X2 on N matches. Some games add a goals pick (Pleno al 15, Super 14) or a half-time variant (Norway). Those need a small extension.

---

## 1. Summary table

| # | Country | Operator | Game | Matches / picks | Frequency | Typical top prize / pool | Popularity | Main leagues | Open coupon data? | Fit |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Sweden | Svenska Spel | **Stryktipset** | 13 × 1X2 | Weekly, Saturday (sometimes Sunday) | Turnover SEK 40–54M per round; jackpots up to SEK 34M | Very high. Record turnover SEK 53.8M (2025) | EPL, Championship, L1/L2, Allsvenskan in summer | **Yes, unofficial public JSON** [verified] | Native |
| 2 | Sweden | Svenska Spel | Europatipset | 13 × 1X2 | Midweek and weekend | Turnover about SEK 0.3–several M; jackpots about SEK 3M | High | European top leagues, internationals | Same JSON [verified] | Native |
| 3 | Sweden | Svenska Spel | Topptipset | 8 × 1X2 | Daily | Smaller pools | Medium | Mixed European | Website (path differs) | Native but short |
| 4 | Finland | Veikkaus | **Vakio** (Lauantaivakio 13, Futisvakio 12, …) | 12–13 × 1X2 | Weekly, Saturday, plus extra coupons | €100–200k wins common | High in Finland | English lower leagues, Europe | **Yes, open JSON, no auth** [verified] | Native |
| 5 | Spain | SELAE | **La Quiniela** | 14 × 1X2 + Pleno al 15 (exact goals 0/1/2/M per side) | Weekly jornada, plus midweek | Botes €2–2.5M; one jornada about €1M | Iconic, very high reach | LaLiga, Segunda | Official page + PDF press notes. JSON endpoint is bot-blocked (403) | Native + goals extension |
| 6 | Brazil | Caixa | **Loteca** | 14 × 1X2 (doubles/triples allowed) | Weekly + midweek concursos | R$0.5–7M estimates; accumulations common | High | Brasileirão A/B, Europe | **Yes, public JSON with teams and goals** [verified] | Native |
| 7 | Norway | Norsk Tipping | **Tipping** (lørdag / søndag / midtuke) | 12 × 1X2, full time and/or half time | Several coupons a week | 2024 Tipping turnover NOK 511M | High | EPL/Championship, Eliteserien, Europe | Website only. API returned 403 | Native (half-time optional) |
| 8 | Mexico | Lotería Nacional | **Progol** (+ Revancha 7, Media Semana 9) | 14 × 1X2 | Weekend + midweek | Guaranteed MXN 5M, accumulations to MXN 35M+ (2026) | High | Liga MX, Europe, MLS | Official site (image/PDF quiniela) | Native |
| 9 | Turkey | Spor Toto Teşkilatı | **Spor Toto** | 15 × 1X2 | Weekly | Carryovers TL 30–45M; one pool about TL 130M (Mar 2026) | High | Süper Lig, 1. Lig, Europe | "Haftanın Listesi" download on sportoto.gov.tr | Native |
| 10 | South Korea | Sports Toto / betman | **축구토토 승무패** (Soccer Toto W/D/L) | 14 × 1X2 | About 70 rounds a year (round 65 in early Nov 2026) | ₩0.4–2B carryovers; ₩500M–1.3B top wins | High | EPL, LaLiga, Serie A, Bundesliga, K League | betman.co.kr (unreachable from outside KR in our test) | Native |
| 11 | Japan | JSC (Sports Promotion Center) | **toto** (13), mini toto (5), totoGOAL3 | 13 × 1/0/2 | Most J.League weekends | Up to ¥100M, or ¥500M with carryover | Medium (BIG random lottery dominates sales) | J1/J2/J3 | toto-dream.com (HTML) | Native |
| 12 | Israel | ISBB / Winner | **Toto 16** (current) | 16 × 1X2 with doubles/triples | Weekly (+ specials) | — | Very high locally | Ligat Ha'Al + Europe | (already supported) | Native |
| 13 | Germany | DLTB (state Lotto companies) | Toto 13er Ergebniswette (+ 6aus45 Auswahlwette) | 13 × 1/0/2 | Weekly | Rank-1 wins often €50k–500k | Low/declining | Bundesliga 1–3, Europe | Spielplan HTML/PDF on Lotto sites | Native |
| 14 | Austria | Österreichische Lotterien / win2day | Toto (13er) + Torwette | 13 × 1X2 | Weekly (round 46 closes 13 Nov 2026) | 13er jackpot €222k (Rd 46/2026) | Low-medium | Bundesliga AT, DE, EPL | **PDF "Vorschau" per round** [verified] | Native |
| 15 | Hungary | Szerencsejáték Zrt. | Totó 13+1 | 14 × 1X2 | **Two rounds a week** | Small: top prize about HUF 1.1M | Low | Mixed European | **Open CSV of all results** [verified] | Native |
| 16 | Italy | Sisal (ADM concession) | Totocalcio (new format, 2022) | 14-match schedina; formulas 3/5/7/9/11/13 [unverified] | Weekly | Record "13" win €235k | Low (a heritage brand) | Serie A/B | sisal.it (bot-blocked) | Partial; format changed |
| 17 | Portugal | SCML / Jogos Santa Casa | Totobola | 13 × 1X2 + Super 14 (goals 0/1/M) | Weekly | Small | Low | Liga Portugal | jogossantacasa.pt | Native + goals |
| 18 | France | FDJ United | Loto Foot 7/8/12/15 | 7–15 × 1X2 | Several grids a week | LF15 record jackpot >€3M (Apr 2026) | Medium | Ligue 1, Europe | fdj.fr (HTML) | Native (LF15 is the closest) |
| 19 | China | China Sports Lottery | 胜负彩 14场 / 任选9 | 14 × 3/1/0 | About every 2–3 days | Up to CNY 5M; sales about CNY 17M per period | Very high | Europe | sporttery.cn, geo-blocked | Native, but market blocked |
| 20 | UK | The Football Pools | Classic Pools | 49 matches, pick 10 score draws | Wed + Sat | £3M headline jackpot | Low (historic) | English/Scottish leagues | footballpools.com (403 to bots) | **Poor fit** (not 1X2) |
| 21 | Denmark | Danske Spil | Puljespil "Den Lange" (13), ex-Tips 13 [unverified] | 13 × 1X2 | Weekly | DKK multi-million jackpots historically | Low-medium | EPL, Superliga | danskespil.dk (JS app) | Native |
| 22 | Switzerland | Swisslos / Loterie Romande | Sport-Toto | 13 × 1X2 | Weekly | — | Low | Super League, DE | Official how-to page returns 404. **Status unclear, possibly discontinued** | — |
| 23 | Greece | OPAP (Allwyn) | ΠΡΟ-ΠΟ | 13 × 1X2 | Weekly | — | Historic | Super League GR | opap.gr 403. **Status unclear** | — |
| 24 | Kenya (+TZ, UG) | SportPesa / Betika (private bookmakers) | Mega Jackpot (17 games) | 17 × 1X2 | Weekly | KES hundreds of millions [unverified] | Very high in East Africa | EPL, Europe | Operator sites | Native, but commercial bookmaker |
| — | Poland, Czechia, Slovakia, Romania, Croatia, Serbia, Argentina (Prode), Chile (Polla Gol) | — | Historic pools | — | — | — | No current weekly football pool confirmed in 2026 searches. Treat as discontinued or negligible until shown otherwise. | — | — | Skip |
| — | Singapore / Malaysia | Singapore Pools; Malaysian operators | "TOTO" here is a **number lottery**, not football | — | — | — | — | — | — | Not applicable |

---

## 2. Per-game notes

### Sweden: Stryktipset, Europatipset, Topptipset (Svenska Spel)
- **Format:** 13 matches, 1X2, prizes for 13/12/11/10 right. The last Stryktipset result (draw 4978, closed 2026-11-07) paid 9 × SEK 1.44M for 13 right, down to 54,475 × SEK 98 for 10 right [verified via the result JSON]. Topptipset uses 8 matches.
- **Popularity:** Svenska Spel's 2025 summary reports a Stryktipset turnover record of SEK 53.8M in one round (26 Oct). Turnover passed SEK 50M twice that year, and Stryktipset produced 62 of the 85 million-krona wins in Sport & Casino [press]. Jackpots reach SEK 34M [press, Hurbra, Oct 2026].
- **Leagues:** English Premier League/Championship/League One/Two in winter, Allsvenskan/Superettan in summer. Europatipset uses European top leagues and internationals. This week's Europatipset (v.46) opens with Italy–France in the Nations League [verified].
- **Data:** `https://api.spela.svenskaspel.se/draw/1/{stryktipset|europatipset}/draws` returns open draws with `drawEvents[]`: match id, kickoff, teams, league, odds and favourite percentages. `/draws/result` returns results and prize distribution. No auth needed, but this is the **website's backend**, undocumented and not licensed to us. The official "external" API (`api.www.svenskaspel.se/external/1/...`) answers 401 and needs an access key, which developers obtain by emailing Svenska Spel [verified 401; pot-bot README]. On Tue 10 Nov the Stryktipset draw list was empty, while Europatipset (closing Thu) had opened Sun 17:00. The Stryktipset coupon appears early in the week.
- **Terms:** Svenska Spel's site terms prohibit automated access to the website (standard). **Ask Svenska Spel for an API key** and state the non-commercial, no-betting use case. Until a key arrives, poll the public JSON lightly and cache it, with a manual-entry fallback.

### Finland: Vakio (Veikkaus)
- **Format:** Lauantaivakio has 13 rows. Futisvakio coupons have 12. Also hockey Vakios (Lätkävakio, NHL-Vakio) and national-team Futisvakio (this week includes Albania–Finland) [verified]. Pick 1X2 for each row. Lauantaivakio's first two rows today are Stockport–Reading and Sheffield W–Plymouth, so it follows English lower leagues.
- **Prize:** single 13-right wins of €155k–200k are typical [press, STT].
- **Data:** **the best feed found.** `https://www.veikkaus.fi/api/sport-open-games/v1/games/SPORT/draws` returns all open Vakio draws with `rows[]` (home/away names, eventId), `closeTime`, `jackpots` and rules, with no key [verified]. Veikkaus loses its monopoly in 2027 (licensing reform), so the product and API may change.

### Spain: La Quiniela (SELAE)
- **Format:** 14 matches × 1X2 plus **Pleno al 15**, which picks exact goals 0/1/2/M for each side of match 15. Elige 8 is an add-on. Prize categories run from 15 (14 + Pleno) down to 10.
- **Size:** the bote for one 14+P15 winner was €2.5M (25 Oct 2026). The 14 Oct 2026 jornada raised €996,690. Pleno al 15 frequently rolls over [press, SELAE PDFs]. A single 14+P15 ticket won €2.46M on 5 Oct 2025.
- **Leagues:** LaLiga and Segunda, with Champions League/internationals during breaks.
- **Data:** the official site lists the coupon (`loteriasyapuestas.es`) and publishes a PDF press note per jornada under `/f/loterias/documentos/Quiniela/Notas de prensa/`. The JSON service `/servicios/buscadorSorteos?game_id=LAQU…` is behind Akamai bot protection and returned 403 [verified]. Plan for light HTML scraping or manual entry. Results are easy to compute from fixtures.

### Brazil: Loteca (Caixa)
- **Format:** 14 matches; mark column 1, draw or column 2. Doubles and triples are allowed, which maps directly to our model. 55% of revenue goes to prizes: 70% to 14-hits, 15% to 13-hits, and 15% reserved for concursos ending in 0/5 [press].
- **Size:** estimates of R$0.5–7M. Concurso 1281 (9 Nov 2026) had one 14-hit winner, and the next estimate is R$500k [verified].
- **Data:** `https://servicebus2.caixa.gov.br/portaldeloterias/api/loteca` (and `/loteca/{n}`) returns the current concurso with `listaResultadoEquipeEsportiva[]`: teams, date, goals and championship [verified]. This is a government open service. Brazil's 2023 betting law (Lei 14.790) regulates fixed-odds betting, not free prediction games.

### Norway: Tipping (Norsk Tipping)
- **Format:** 12 matches × 1X2. You can tip the **full-time and/or half-time** result on the same matches (half-time since 1997). Coupons run lørdag, søndag and midtuke. About 55% goes back as prizes, split among 12/11/10 right, plus a bonus pot [SNL encyclopedia].
- **Size:** 2024 turnover across Tipping was NOK 511M [SNL].
- **Data:** the website is a JS app. `api.norsk-tipping.no/PoolGamesSportInfo/...` returned 403 [verified]. Use manual entry, scraping, or ask Norsk Tipping.

### Mexico: Progol (Lotería Nacional)
- **Format:** 14 matches × 1X2 (MXN 15). Revancha is 7 more matches (MXN 5). Progol Media Semana covers midweek matches (9 per official description; 2026 press shows 14, so verify). Results use the 90-minute score.
- **Size:** guaranteed MXN 5M, which accumulates. It reached MXN 35M in July 2026 [press, La Crónica]. Concurso numbers were about 2357 in Nov 2026.
- **Data:** the official site publishes the quiniela as an image/PDF. Many media republish it. Manual entry or OCR is realistic.

### Turkey: Spor Toto
- **Format:** 15 matches × 1X2, with prize tiers for 15/14/13/12.
- **Size:** carryovers of TL 30–45M are routine. In March 2026 a pool of about TL 130M was shared by two 15-winners (about TL 60M each) [press, Sporx/Fanatik].
- **Data:** sportoto.gov.tr has a "Haftanın Listesi / Listeyi İndir" weekly list download. Sales go through iddaa dealers and online channels such as Misli. The government site looks dated (©2021 footer).
- Turkey's law against illegal betting (Law 7258) targets betting and its promotion. A free predictor with no betting links is not covered, but avoid any link to betting sites.

### South Korea: 축구토토 승무패 (Soccer Toto W/D/L)
- **Format:** 14 matches × W/D/L. About 70 rounds a year; round 65 was settled in early Nov 2026 with 2 winners of about ₩500M each [press, TF].
- **Size:** carryovers of ₩0.4–2B (round 34 carried over ₩2B+) [press].
- **Leagues:** mostly EPL, LaLiga, Serie A and Bundesliga, plus K League in season.
- **Data:** betman.co.kr only (no connection from our host). Korean media publish the match list each round.
- **Note:** "Proto" (프로토) is fixed-odds betting, not a pool. Don't mirror it.

### Japan: toto (JSC)
- **Format:** toto picks 13 matches as 1/0/2 (home/draw/away). mini toto picks 5. totoGOAL3 predicts goals. WINNER is a single-match pick with no pool, and BIG is random with no predicting.
- **Size:** max ¥100M, or ¥500M with a carryover [Rakuten/PayPay bank pages]. Round 1644 paid ¥5.1M × 7 [press].
- **Leagues:** J1/J2/J3, with occasional overseas leagues.
- **Data:** toto-dream.com (HTML, JS-heavy).

### Israel: Toto 16 (Winner / ISBB)
This is the existing product. ISBB also runs specials: a World Cup 2026 coupon with a ₪250k first prize [press, ice.co.il]. Toto revenue during the World Cup was about ₪700M (+20%) [press, Maariv]. Keep it as the reference implementation.

### Germany: Toto 13er Ergebniswette (DLTB)
- **Format:** 13 matches × 1/0/2, weekly. The 6aus45 Auswahlwette is a different game (pick 6 matches out of 45 that end in draws) and is a poor fit.
- **Size:** low volume. Bremen's share of 13er stakes was 275 (unit unclear, likely €k) in 2025 [Bremer Lotto annual report]. Top wins about €100k (e.g. €108k, Osnabrück, 2026) [press].
- **Data:** each state Lotto site publishes the Spielplan as HTML/PDF. The WestLotto page returned 500 when we tested.

### Austria: Toto (Österreichische Lotterien)
- **Format:** 13 matches × 1X2 ("Dreizehner", with a 12er rank) plus Torwette (score bet).
- **Size:** 13er jackpot of €222k for round 46 (closes 2026-11-13 17:50) [verified, win2day].
- **Data:** the win2day toto page links a **PDF preview per round** ("Vorschau zur Toto Runde 46") and yearly results PDFs [verified].

### Hungary: Totó 13+1 (Szerencsejáték)
- **Format:** 13 + 1 matches × 1X2, **two rounds a week**.
- **Data:** `https://bet.szerencsejatek.hu/cmsfiles/toto.csv` holds the full history: year; week; round; date; winners and prize per tier; 14 outcomes [verified]. This covers results only, not the upcoming coupon.
- **Size:** prizes are small (e.g. 4 × HUF 1.13M, 5 Nov 2026). Worth adding only as a low-cost extra.

### Italy: Totocalcio (Sisal, concession since 2022)
- **Format:** Sisal's 2022 "new Totocalcio" uses formulas 3/5/7/9/11/"Il 13" chosen from the schedina. Formula 11 costs €1 per column [Sisal FAQ via search; unverified because the page is 403]. The legacy "14 + Il9" format described in older articles appears to have ended (an ADM provision ended Il9) [unverified].
- **Size:** the record win under the new format is €234,931 [press, Sportface]. This is a **heritage brand with small pools**. Use the brand for nostalgia, not for jackpot appeal.

### Portugal: Totobola (Santa Casa)
- **Format:** 13 × 1X2 + Super 14 (goals per team: 0/1/M). Small pools.
- Users complain that Totobola has been absent from the Jogos Santa Casa app for 2+ years [Portal da Queixa], which suggests weak engagement.

### France: Loto Foot (FDJ United)
- **Format:** grids of 7, 8, 12 and 15 matches. Loto Foot 15 (LF15) is the jackpot game. Its record jackpot exceeded €3M (grid of 25/04/2026) [FDJ United press release, 2 Jun 2026]. 70+ millionaires since 2004.
- **Fit:** LF15 is the one to mirror. FDJ grids open several times a week.

### UK: Classic Pools (The Football Pools)
Pick 10 (or 8) **score draws** from a 49-match coupon. The headline jackpot is £3M, but recent wins are about £300k [press]. The mechanic is not 1X2, so it would need a separate game type. **Skip.**

### China: 足彩 胜负彩 14场 / 任选9场 (China Sports Lottery)
Huge in absolute terms: 14 × 3/1/0, sales of about CNY 17M per period, top prize up to CNY 5M [press, Sina]. However, sporttery.cn is geo-blocked, internet lottery content is tightly controlled, and App Store China removed lottery apps in 2019. **Skip** unless you build China-specific distribution.

### East Africa: SportPesa / Betika Mega Jackpot
A 17-match 1X2 jackpot run by **private bookmakers**, with very large headline jackpots [unverified]. The format matches ours, but mirroring a commercial bookmaker's product invites gambling-ad scrutiny. Consider it later, if at all.

### Denmark, Switzerland, Greece and others
These could not be confirmed as live, sizeable products in 2026: Danske Spil's pool page renders client-side, the Swisslos Sport-Toto how-to page returns 404, and opap.gr/propo returns 403. Poland, Czechia, Slovakia, Romania, Croatia, Serbia, Argentina and Chile show no current weekly football pool in 2026 sources. Revisit only if users ask.

---

## 3. Data sourcing

### Can a coupon be reconstructed from fixtures?
**No, not reliably.** Every operator picks its 12–16 matches editorially (Stryktipset mixes leagues according to the TV schedule; Vakio follows English lower leagues; Quiniela adds Segunda). You need the published list, then you map each line to a fixture ID in a sports API. After that, kickoff times, live scores and results come from the fixture API. That is the scalable part.

Recommended pipeline per game:
1. **Coupon ingest** (once per round). Use the operator JSON where it exists (Veikkaus, Caixa, Svenska Spel). Elsewhere, an admin pastes or edits 13–16 team pairs (we already have an admin ColumnForm). Optionally pre-fill candidates from the fixture API: "all matches in leagues X, Y between deadline and +3 days".
2. **Fixture matching:** fuzzy-match team names to API team IDs, with a per-game alias table (e.g. "Sheffield W" maps to "Sheffield Wednesday").
3. **Results:** compute 1X2 from the 90-minute score via the fixture API, then reconcile against the operator's official result where available (Svenska Spel `/result`, Caixa JSON, Hungarian CSV). Operators handle postponed matches differently: Stryktipset uses an odds-weighted random draw, Totobola counts every prediction as correct, others use other rules. So **use the operator's official outcome** for postponed or abandoned matches, and keep a manual override.

### Operator feeds found (tested 2026-11-10)
| Operator | Endpoint | Auth | Contents | Status |
|---|---|---|---|---|
| Veikkaus | `veikkaus.fi/api/sport-open-games/v1/games/SPORT/draws` | none | open coupons, rows, close time | 200 |
| Svenska Spel | `api.spela.svenskaspel.se/draw/1/{product}/draws[/result]` | none (site backend) | coupon, odds, results, payouts | 200 |
| Svenska Spel official | `api.www.svenskaspel.se/external/1/...` | access key | same | 401 (request a key) |
| Caixa | `servicebus2.caixa.gov.br/portaldeloterias/api/loteca[/n]` | none | matches, goals, prizes | 200 |
| Szerencsejáték | `bet.szerencsejatek.hu/cmsfiles/toto.csv` | none | results history | 200 |
| win2day | per-round PDF preview | none | match list | 200 |
| SELAE | `/servicios/buscadorSorteos` | bot-blocked | — | 403 |
| Norsk Tipping | `api.norsk-tipping.no/PoolGamesSportInfo/...` | — | — | 403 |
| Sisal, OPAP, Football Pools | site | bot-blocked | — | 403 |
| China Sports Lottery | `webapi.sporttery.cn` | geo-blocked | — | 567 |

### Sports data APIs
| API | Free tier | Coverage relevant here | Notes |
|---|---|---|---|
| **API-Football (api-sports.io)** | 100 req/day, all endpoints, no card. Paid Pro 7,500/day (about $19/mo per third parties) | 1,000+ leagues incl. English L1/L2/National, Allsvenskan, Superettan, Veikkausliiga, Eliteserien, J1–J3, K League, Liga MX, Brasileirão A/B, Süper Lig | **Best single choice.** At 100/day you need caching: one `fixtures?date=` call per day plus live polling only during coupon matches. Pro tier for live scores at scale |
| **football-data.org** | Free forever: 12 competitions (PL, Championship, Bundesliga, LaLiga, Serie A, Ligue 1, Eredivisie, Primeira, Brasileirão A, CL, WC, Euro), rate-limited. Paid tiers €49/99/199 | Missing English L1/L2, Scandinavian, Turkish, Mexican, Korean, Japanese | Good free backbone for Quiniela/Loteca top-flight lines only |
| **SportMonks** | Free plan: Danish Superliga and Scottish Premiership only, 180 calls/hour/endpoint | Paid plans cover everything | Free tier is useless for us |
| **TheSportsDB** | Free key "123" (docs), about 30 req/min, limited results | Broad but patchy for lower leagues and live data | Fallback for logos and team metadata |
| **Sofascore / FotMob (unofficial)** | Undocumented JSON | Everything, live | Terms forbid it, Cloudflare blocks it, and it can break anytime. **Don't build on it** |
| **openfootball (football.json)** | Free static JSON on GitHub | Major leagues, fixtures only | Fine for season fixtures, not live |

Recommendation: start with API-Football (free tier for development, Pro once more than ~3 games are live). Use operator JSON for coupons where it exists and admin entry elsewhere.

---

## 4. Legal and brand

### Using operator game names ("Stryktipset round 45")
- **Trademarks:** names like Stryktipset, Vakio, La Quiniela, Loteca and Totocalcio are operator brands. Referential (nominative) use to identify *which* coupon you mirror is generally allowed: in the EU under Trade Mark Regulation art. 14(1)(c) and Directive 2015/2436 art. 14, in the UK under TMA s.11(2), and in the US under nominative fair use. The conditions: honest practice, no implied affiliation, no logo, no confusing styling.
  - OK: "Sweden – 13-match Saturday coupon (Stryktipset week 46)", "Matches from La Quiniela jornada 18".
  - Avoid: operator logos and colours, the brand in our app name, icon or screenshots' headline, and phrasing like "Play Stryktipset".
  - Add the footer "Not affiliated with or endorsed by Svenska Spel / SELAE / …".
- **Apple 4.1(c)** forbids another developer's brand or product name in your app icon or name without approval. **Apple 5.2.1** forbids third-party trademarks without permission in the app. In practice, brand names in descriptive in-app text and the store description are common and rarely rejected, but keep them out of the title, subtitle and icon. If App Review asks, show that the mention only identifies the source.
- **Coupon data rights:** in *Football Dataco v Yahoo* (CJEU C-604/10, 2012), fixture lists got no database copyright. Earlier *Fixtures Marketing* cases (2004) also denied the sui generis database right to fixture lists. A 13-match coupon is a tiny selection, so the copyright risk is low. The **sui generis database right** (Directive 96/9 art. 7(5)) still forbids *repeated and systematic* extraction of insubstantial parts when that harms the maker's investment, and website terms forbid scraping. **Prefer official or opt-in feeds** (Veikkaus open API, Caixa government API, a Svenska Spel API key), keep each pull to one per round, and attribute the source.

### App stores
- **Apple 5.3** (checked 2026-11-10) covers sweepstakes/contests (5.3.1–5.3.2: developer must sponsor, official rules in-app, Apple not a sponsor), IAP for real-money gaming (5.3.3, banned) and real-money gaming/lotteries (5.3.4: license, geo-restriction, free app; a lottery needs consideration + chance + prize). **Group Bet has no stake and no prize, so 5.3.4 does not apply.** A 2026 developer-forum thread shows a free sports-prediction app *with prizes* rejected under 5.3.4/2.3.6, with Apple asking for gambling licenses. **Never add prizes or paid entry.** If we ever do, 5.3.1/5.3.2 apply at minimum.
- **Apple age rating:** answer "Simulated Gambling: none". We simulate no wagering, and the store text should not frame it as betting. Set "Contests" honestly, and expect a 12+/13+ rating at most.
- **Google Play, Real-Money Gambling, Games and Contests policy:** it targets apps where users "wager, stake, or participate using real money" to win prizes of real-world value. A free, prize-less prediction app is outside it. **Gambling ads** (betting-operator ads or affiliate links) bring nine extra requirements, including no simulated gambling and responsible-gambling messaging. A "sports odds tracker app with gambling ads linking to a sports betting site" is a listed violation. **Don't show odds with betting links, don't take betting-affiliate money, and don't deep-link to operators' bet pages.** Showing the Svenska Spel favourite percentages as information is fine.
- Both stores: the IARC content questionnaire's gambling questions get "no".

### Country-specific
- **Sweden, Norway, Finland, Denmark:** gambling-marketing rules (e.g. Spellagen ch. 15 moderation; Norway's 2023 Pengespilloven bans facilitating or marketing unlicensed gambling) bite only if we market or facilitate betting. A free social predictor without links is not gambling (no stake), so we are fine. Avoid "bet", "spela" or "tippa nu" calls to action that link out.
- **Spain:** Real Decreto 958/2020 restricts gambling advertising. We are not a gambling operator, but avoid operator logos and keep "La Quiniela" mentions descriptive.
- **Israel:** the Sports Betting Board holds the monopoly. Mirroring Toto 16 is the status quo.
- **Turkey and South Korea:** both aggressively block illegal betting sites (Turkey's Law 7258; Korea's National Sports Promotion Act). A free predictor is lawful. Avoid the word "toto" combined with any betting link, because Korean regulators associate "토토사이트" with illegal betting.
- **China:** online lottery sales have been banned since 2015, and App Store China removed lottery apps in 2019. Do not target China.
- **Middle East (UAE, Saudi Arabia, Qatar):** gambling-themed apps can be pulled. A no-stake predictor is generally OK, but keep wording free of gambling terms.
- **Restricted outright:** we found no country that bans a free, prize-less pools-prediction app. The risk comes from adding prizes (contest/sweepstakes law, e.g. Quebec and some US states' registration rules) or paid entry (gambling).

### Practical rules for the product
1. No stakes, no prizes, no betting links or ads. This keeps us outside every gambling regime and both store policies.
2. Name rounds descriptively ("🇸🇪 Saturday 13 – week 46"), with the operator's brand as a secondary text label only. Never use logos.
3. Add a disclaimer on every coupon screen: "Matches mirror the official [brand] coupon. Not affiliated with [operator]."
4. Prefer official or open feeds. Ask Svenska Spel and Norsk Tipping for API access before scraping.

---

## 5. Suggested rollout order
1. **Stryktipset (+ Europatipset)**: the biggest European pool, a 13 × 1X2 drop-in, and JSON with odds. Request an official key.
2. **Vakio**: fully open API, a 12–13 × 1X2 drop-in, almost zero ingest work.
3. **La Quiniela**: the strongest brand in Spanish-speaking markets. Needs manual or scraped ingest plus a goals pick for Pleno al 15 (or ignore it in v1).
4. **Loteca**: an open government JSON, 14 × 1X2 with doubles and triples. That is our exact model, and Brazil is a large market.
5. **Norway Tipping**: 12 × 1X2 with high engagement. Manual ingest. The half-time variant can come later.
6. **Progol**: 14 × 1X2 with large jackpots and a big Mexican football audience. Manual ingest.
7. **Spor Toto**: 15 × 1X2 with big TL jackpots. Weekly list download.
8. **Korea 승무패 / Japan toto**: native formats, but they need localization and manual ingest. Cheap extras: Austria (PDF), Hungary (CSV), Germany 13er.

Skip for now: UK Classic Pools (different mechanic), China (market access), Italy/Portugal (tiny pools), Switzerland, Greece and Denmark (status unclear).

---

## Sources (accessed 2026-11-10)
- Svenska Spel public JSON: https://api.spela.svenskaspel.se/draw/1/europatipset/draws, https://api.spela.svenskaspel.se/draw/1/stryktipset/draws/result
- Svenska Spel 2025 summary via Gambling Insider: https://www.gamblinginsider.com/se/?p=100474 ; jackpot story: https://hurbra.se/stryktipset-jackpot-31-oktober-2026/
- pot-bot (API key by email): https://github.com/kotlinski/pot-bot
- Veikkaus open draws: https://www.veikkaus.fi/api/sport-open-games/v1/games/SPORT/draws ; STT Vakio wins: https://www.sttinfo.fi/tiedote/72449087/vain-yksi-taysosuma-vakio-pelista-200-000-euron-potti-helsinkiin
- SELAE La Quiniela press notes, e.g. https://www.loteriasyapuestas.es/f/loterias/documentos/Quiniela/Notas de prensa/NOTA_DE_PRENSA_LA_QUINIELA_21_10_26.pdf ; https://www.loteriasyapuestas.es/es/noticias/premios/premio-de-2-4-millones-en-la-quiniela
- Caixa Loteca JSON: https://servicebus2.caixa.gov.br/portaldeloterias/api/loteca ; prize rules: https://bnldata.com.br/nenhuma-aposta-acertou-os-14-resultados-do-concurso-1250-da-loteca-e-premio-acumula-r-35-milhoes/
- Norsk Tipping Tipping (SNL): https://snl.no/Tipping
- Progol: https://www.cronica.com.mx/tendencias/2026/07/12/resultados-progol-revancha-2341-ganadores-de-la-quiniela-de-fin-de-semana/ ; https://www.laps4.com/preguntas-y-respuestas/que-pasa-si-tengo-7-aciertos-en-progol-media-semana
- Spor Toto: https://www.sporx.com/spor-toto-sonuclari-aciklandi-2-kisi-bildi-dev-ikramiye-SXHBQ1156683SXQ ; https://www.sportoto.gov.tr/
- Korea 승무패: https://news.tf.co.kr/read/toto/2383604.htm ; https://sports.khan.co.kr/article/202607131553003
- Japan toto: https://www.rakuten-bank.co.jp/jrebank/toto/ ; https://www.toto-dream.com/
- Israel: https://sport1.maariv.co.il/?p=1905768 ; https://www.ice.co.il/consumerism/news/article/1115616
- Germany 13er: https://www.leinetal24.de/niedersachsen/toto-spieler-aus-osnabrueck-raeumt-ueber-108-000-euro-ab-94558512.html ; Bremer Lotto report: https://www.lobbyregister.bundestag.de/media/e0/a2/827076/Offenlegungsdatei_Bremer-Lotto-und-Totto-GmbH_JAP-2025_26-6-2026.pdf
- Austria: https://www.win2day.at/lotterie/toto ; https://www.tt.com/artikel/15472892/toto-kein-dreizehner-in-12-runde-zwoelfer-jackpot-25-mal-geknackt
- Hungary CSV: https://bet.szerencsejatek.hu/cmsfiles/toto.csv
- Italy: https://www.sisal.it/totocalcio/faq ; https://www.sportface.it/calcio/totocalcio-vincita-record-con-la-nuova-schedina-centrato-il-13-da-234-931-euro/2315669
- Portugal: https://observador.pt/2017/08/04/santa-casa-premios-acima-de-2-000-euros-obrigam-a-mais-dados-pessoas/ ; https://scml.pt/?p=9428
- France Loto Foot record: https://www.fdjunited.com/wp-content/uploads/2026/06/20260602-CPFDJUNITED-RecordhistoriquedegainLotoFoot-Plusde32millionsdeurosdanslapetitepochedesonjean.pdf
- UK Classic Pools: https://www.fourfourtwo.com/features/the-football-pools-win-up-to-pound3-million-every-wednesday-and-saturday-for-just-pound1-per-game ; https://www.sportscasting.com/uk/?p=76564
- China 胜负彩: https://sports.sina.cn/2026-06-07/detail-iniapfme7002037.d.html?vt=4
- Apple App Review Guidelines (5.3, 4.1, 5.2): https://developer.apple.com/app-store/review/guidelines/ ; forum rejection: https://developer.apple.com/forums/thread/825845
- Google Play RMG policy: https://support.google.com/googleplay/android-developer/answer/9877032
- API-Football pricing: https://www.api-football.com/pricing ; football-data.org coverage: https://www.football-data.org/coverage ; SportMonks free plan: https://www.sportmonks.com/football-api/free-plan ; TheSportsDB: https://www.thesportsdb.com/docs_api_guide
- Football Dataco v Yahoo (C-604/10): https://www.ippt.eu/sites/default/files/2012/IPPT20120301_ECJ_Football_Dataco_v_Yahoo.pdf
