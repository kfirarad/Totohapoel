# Group Bet (טוטו חברים): international go-to-market

_Written 2026-11-10. Companion doc: `toto-games.md` (catalog of each country's pools game: format, schedule, data sources). Where the two disagree on game mechanics, trust `toto-games.md`._

## TL;DR

- **Launch order after Israel: 1) Sweden, 2) Norway, 3) Spain.** Brazil is the high-upside wildcard for later. Finland follows Sweden once there's a Finnish speaker to help.
- **Why Sweden first:** it has the healthiest weekly pools game in Europe. Stryktipset set a turnover record of 53.8 MSEK on a single round (26 Oct 2025) and passed 50 MSEK twice that year. It also has a deep culture of syndicates ("andelsspel"), and its coupon mechanics (13 matches, half and full hedges) match the app as it exists. English is widely spoken, so a bad first translation is forgivable.
- **What we sell:** "your tipping group, without the spreadsheet or WhatsApp mess." We are not selling another betting app. **No money, no odds, no links to buy coupons.** That keeps us out of App Store guideline 5.3 trouble and out of national gambling-marketing rules.
- **Acquisition costs nothing because the group invite *is* the channel.** Each new country needs one or two seed groups made of real people, a localized store listing, and posts in one or two forums where tipsters already gather.
- **The blockers are small but real.** `profiles.locale` is hard-coded to `('he','en')`. Coupons are entered by hand per `toto_type`. Spain needs "Pleno al 15" (a score-band pick).

---

## 1. Market sizing per candidate

Data quality note: no operator publishes "players of the weekly pools game" as a clean number. The figures below are the best public proxies I found. Some are turnover for a single round, some are annual turnover, and some are company-wide. The source is given for every figure.

| Country | Pools game(s) | Health of the pools game (evidence) | Group-play culture | Free social competitors | Gap we fill |
|---|---|---|---|---|---|
| **Israel** (home) | Winner 16 / Toto | 16-match coupon; jackpot of ~2.5 MNIS split by 2 winners, "third time this year" anyone hit first prize ([Israel Hayom](https://www.israelhayom.co.il/business/article/19662115?amp=1)) | Office/friends "טוטו" groups, WhatsApp-managed | None focused | Proven: 44 users, 2 seasons |
| **Sweden** | Stryktipset (Sat, 13), Europatipset (13), Topptipset (8), Powerplay | **Strong.** Single-round record 53.8 MSEK on 26 Oct 2025; >50 MSEK on a round twice in 2025; 62 million-krona wins in 2025, equal to the previous record ([Gambling Insider SE, 2026](https://www.gamblinginsider.com/se/?p=100474); [CasinoBeats SE](https://casinobeats.com/se/?p=67734)) | **Very strong.** Andelsspel sold by shops; syndicate wins of 10 MSEK ([CasinoBeats, Aug 2025](https://casinobeats.com/se/2025/08/04/skondals-tobak-tar-hem-10-miljoner/)) and 5.1 MSEK ([CasinoBeats, Oct 2025](https://casinobeats.com/se/2025/10/02/dybbans-andelsspel-vann-51-miljoner/)); Svenska Spel lets retailers sell andelsspel online since 2019 ([SBC News](https://sbcnews.co.uk/retail/2019/10/24/svenska-spel-allows-retailers-to-sell-games-via-new-online-platform/)) | Svenska Spel's own app (real money; syndicates are paid shares, not a friends leaderboard); generic tipping apps such as "The Game" and TippArena, which aren't tied to Stryktipset | A free friends league on *the actual Stryktipset coupon*, with half and full hedges, season tables, and a group system |
| **Norway** | Tipping (12 matches; Saturday, Sunday and midweek rounds) | **Moderate.** Tipping turnover 511 MNOK in 2024 ([SNL, "Tipping"](https://snl.no/Tipping)). Norsk Tipping overall flat in 2025 ([g3newswire](https://g3newswire.com/norsk-tipping-delivers-its-second-best-year-of-results-ever-with-nok7-69bn/)) | "Tippelag" at workplaces is a classic; Norsk Tipping has its own andelsbank (syndicate bank) | Norsk Tipping app (real money); generic predictor apps | Same as Sweden. Coupons are mostly Premier League, so match data overlaps with Sweden |
| **Finland** | Vakio (since 1940) | Moderate. Veikkaus has ~2.7 M registered customers, total sales €936 M in 2025 ([STT/Veikkaus, 2026](https://www.sttinfo.fi/tiedote/71868173/veikkaus-group-in-2025-international-growth-and-preparation-for-the-multi-license-market?lang=en)). No Vakio-specific figure found | "Porukkapeli" (syndicates) is an official product ([STT](https://www.sttinfo.fi/tiedote/71992049)) | Veikkaus app | Same. Market opens to licences on **1 Jul 2027** with an affiliate ban ([Bird & Bird](https://cm.twobirds.com/en/insights/2025/finland/its-official-licensed-gambling-operators-to-enter-the-finnish-gambling-market-in-july-2027)), which doesn't affect a free app |
| **Denmark** | Tips 13 (historical) | Unclear. Danske Spil reports don't break out Tips ([Lotterydaily, Mar 2026](https://lotterydaily.com/2026/03/17/retail/danske-spil-2bn-profit/)). Check `toto-games.md` | Weak evidence | Danske Spil | Low priority until the catalog confirms a live weekly 1X2 coupon |
| **Spain** | La Quiniela (14 + Pleno al 15) | **Declining but large.** €162.7 M in 2024, down 71% from €543.5 M in 2009 ([casasdeapuestas.com](https://www.casasdeapuestas.com/noticias/la-quiniela-en-caida-libre-pierde-un-71-de-facturacion-en-15-anos/)); off-season jornadas ~€0.5–0.66 M ([SELAE press notes, Jun–Jul 2026](https://www.loteriasyapuestas.es/f/loterias/documentos/Quiniela/Notas%20de%20prensa/NOTA_DE_PRENSA_LA_QUINIELA_12_7_26.pdf)) | **Very strong.** "Peñas quinielísticas" in bars and offices; growing use of expected-value peñas ([Moncloa.com, May 2025](https://www.moncloa.com/2025/05/29/la-quiniela-azar-y-asimetria-3234451/)) | Biwenger/Comunio fantasy rule social football; many Quiniela results/peña-manager apps | Free peña leaderboard on the real coupon. Spanish copy can be reused for LatAm later |
| **Italy** | Totocalcio | **Weak.** "A shadow of what it was": ≤40k schedine in a good week, prize pools rarely >€100k ([Quotidiano.net, 2026](https://www.quotidiano.net/economia/compleanno-totocalcio-80-anni-498316ae)) | Fantacalcio dominates | Fantacalcio | Skip |
| **Germany / Austria** | Toto 13er Ergebniswette / Toto 12er | Weak. Bremen's Toto 13er stakes were 275 in 2025 vs 280 in 2024, down 1.8% (units unstated) ([Bremer Lotto JAP 2025](https://www.lobbyregister.bundestag.de/media/e0/a2/827076/Offenlegungsdatei_Bremer-Lotto-und-Totto-GmbH_JAP-2025_26-6-2026.pdf)) | "Tippspiel" culture is huge, but it's score prediction, not pools | **Kicktipp**: founder cites ~6 M users, ~€1 M/yr revenue ([FAZ 2024 via kicktipp.at](https://www.kicktipp.at/download/presse/2024-07-faz.pdf); [ZDF](https://www.zdfheute.de/sport/fussball-wm/fussball-wm-2026-kicktipp-tippspiel-boom-100.html)) | Skip. Kicktipp owns the habit and the pools game is marginal |
| **UK** | Football Pools (score-draw format) | Weak. ~300k players (undated, [Prolific North](https://www.prolificnorth.co.uk/?p=24607)); £375k regulatory settlement in Mar 2025 ([UKGC](https://www.gamblingcommission.gov.uk/news/article/football-pools-limited-faces-gbp375-000-regulatory-action)) | Office sweepstakes and predictor leagues | Sky Super 6, BBC predictor, **Superbru** (2.6 M registered users lifetime, [Superbru](https://www.superbru.com/about)) | Skip. The mechanic is different and the competition is saturated |
| **Brazil** | Loteca (14 matches, doubles/triples) | Large lottery market: Caixa ~R$25.1 bn in 2025, down from R$25.6 bn in 2024; Loteca price raised from R$3 to R$4 in Jul 2025 ([BNLData](https://bnldata.com.br/tag/arrecadacao-loterias-2025/); [Sigma](https://sigma.world/pt-br/news/loterias-caixa-arrecadou-r-18-bilhoes-ate-setembro/)). No Loteca-specific figure found; lotteries now lose share to "bets" ([IstoÉ Dinheiro, Sep 2025](https://istoedinheiro.com.br/loterias-arrecadam-menos-bets)) | **Very strong** "bolão" culture | Cartola FC (fantasy), bets apps | Big upside, but needs pt-BR, a new timezone and LGPD |
| **Turkey** | Spor Toto (15 matches) | Alive: 23.3 M TL jackpot rollover reported ([Fanatik](https://www.fanatik.com.tr/iddaa/spor-toto-rekora-kosuyor-tam-100-milyon-2538140)); sold via Misli and others | Kupon culture is betting-led (İddaa) | Betting apps | Mid. Legal climate around betting is sensitive |
| **Greece / Portugal** | Pro-Po / Totobola | Pro-Po still listed by OPAP ([Lotterydaily, 2025](https://lotterydaily.com/2025/07/08/retail/greece-lottery/)); no recent data found for Totobola | Unclear | Betting apps | Skip for now |

Smartphone penetration is not a differentiator. Every candidate above is a high-penetration market, so it isn't scored.

## 2. Scoring and ranking

Each criterion is scored 1–5, where 5 = best for us. Weights: demand ×3, competition ×2, data ×2, reach ×2, localization ×1, legal ×1.

| # | Country | Demand | Competition gap | Localization cost | Coupon data | Legal / store risk | Solo reach | **Weighted (/55)** |
|---|---|---|---|---|---|---|---|---|
| 1 | **Sweden** | 5 | 4 | 4 (sv, LTR, good English fallback) | 4 | 4 | 4 | **47** |
| 2 | **Norway** | 4 | 4 | 4 | 4 | 4 | 3 | **42** |
| 3 | **Spain** | 4 | 3 | 4 (es; reusable for LatAm) | 3 (needs Pleno al 15) | 4 | 3 | **39** |
| 4 | Brazil | 4 | 3 | 3 (pt-BR, LGPD, UTC-3) | 4 | 3 | 2 | 37 |
| 5 | Finland | 3 | 4 | 2 (Finnish) | 4 | 4 | 2 | 36 |
| 6 | Turkey | 3 | 3 | 3 | 3 | 2 | 2 | 31 |
| 7 | Denmark | 2 | 4 | 4 | 2 | 4 | 3 | 31 |
| 8 | UK | 2 | 1 | 5 | 2 | 4 | 3 | 27 |
| 9 | Germany/Austria | 2 | 1 | 4 | 3 | 4 | 2 | 25 |
| 10 | Italy | 1 | 2 | 4 | 3 | 4 | 2 | 24 |

Score notes:
- **Legal / store risk.** The app takes no stakes and offers no prizes or odds, so it is not gambling under any of these regimes. The risk is App Review, not national law. A free sports-prediction app *with prizes* was rejected under 5.3.4 and asked for gambling licences ([Apple dev forums](https://developer.apple.com/forums/thread/825845)). Turkey scores lower because of the climate around illegal betting.
- **Coupon data.** Sweden, Norway and Brazil publish structured coupon pages, and Caixa exposes a public JSON results endpoint. Spain publishes per-jornada pages and PDFs. Defer to `toto-games.md` for the exact sources.
- **Solo reach.** This assumes Kfir has no personal network in the country. Sweden and Norway score higher because Nordic users accept English onboarding and post openly in a few concentrated forums (Flashback, Reddit, Facebook tips groups).

**Recommended order:** Israel (Nov 2026) → **Sweden** (soft launch ~week 7) → **Norway** (~week 11) → **Spain** (Q1 2027, before the La Liga run-in) → evaluate Brazil or Finland from the data.

## 3. Positioning, messaging and channels

### Core positioning, the same everywhere
"Your tipping group, without the WhatsApp mess." It runs on the real weekly coupon, has one bet per week counting in every group you're in, a live table, and a reminder before the deadline. It's free, with no money and no betting.

Rules:
- **Never** use the words *bet*, *odds*, *win money* or *gamble* in store metadata. App Review keys on them, and Nordic and Spanish ad rules treat them as gambling marketing.
- In store copy, call the game descriptively ("the Saturday 13-match coupon"). In the subtitle and app name, avoid trademarks such as "Stryktipset", "Vakio", "La Quiniela" and "Loteca". Apple 2.3.7 rejects other parties' trademarks in keywords. The app description can include a line like "Works with Stryktipset. Not affiliated with Svenska Spel."

### Per market

| Market | Name and subtitle idea | Hook | ASO keywords (local) |
|---|---|---|---|
| Sweden | "Group Bet – Tipsgrupp" / "Tippa med kompisarna" | "Who in the gang is best at 13 right? Tip the Saturday coupon together, free." Show half and full hedges explicitly | tipsgrupp, tipsliga, tipstävling, tippa med vänner, 13 rätt, helgardering, kompistips |
| Norway | "Group Bet – Tippelag" / "Tipp med vennene" | "Tippelaget, with a table." | tippelag, tippekonkurranse, tippe 12 rette, tippeliga |
| Spain | "Group Bet – Peña quinielística" / "Tu peña, sin Excel" | "Run the office peña on the real jornada. Includes Pleno al 15." | peña quiniela, quiniela amigos, porra fútbol, pronósticos jornada, porra liga |
| Brazil (later) | "Group Bet – Bolão da Loteca" | "Bolão with friends, ranking and no spreadsheet." | bolão, bolão futebol, palpites amigos, loteca amigos |

### $0 channels, in order of expected yield
1. **Invite loop (built in).** Every new user arrives through a group. Make the join link a deep link with a preview card showing the group name, member count and this week's deadline. Ask for the invite at the two moments users are most motivated: right after the first bet ("Invite someone to challenge you") and when weekly results land ("You came 2nd – rematch?").
2. **Shareable weekly result card.** Generate an image of the group table and the user's hits ("11 of 13 – best in the group"), formatted for WhatsApp, Instagram stories and Messenger. It's the only content that travels outside a group, and it is the TikTok and Instagram strategy as well.
3. **Seed groups.** Before posting publicly, get 3–5 real groups in each country through personal contacts, Israelis abroad, or colleagues of the 44 current users. A single group of 10 active users is better proof than 200 cold installs.
4. **Communities.** Sweden: the Flashback forum's Stryktipset threads, r/sweden, r/allsvenskan, and Facebook "Stryktipset"/"tipsgrupp" groups. Norway: r/norge and Facebook tippegrupper. Spain: r/LaLiga, r/futbol, Forocoches (sports subforum) and Quiniela Facebook groups. Write it as "I built a free thing for our group", one helpful post per community. Don't spam.
5. **Tipster podcasts and newsletters.** Sweden has many Stryktipset tips podcasts and YouTube "veckans tips" shows; Spain has quiniela-tips channels. Offer a branded **public group** ("Play against [Podcast]'s picks") that the host promotes for free. It costs us nothing and gives them engagement. This is the best partnership lever.
6. **Supporters' clubs and five-a-side leagues.** Offer a free group with the club's name.

### Referral mechanics that fit
- **Rewards are status only, never money.** Examples: a "Founder" badge for whoever creates a group with 5 or more active members, and a "Recruiter" badge.
- **Cross-group "one bet counts everywhere"** is the retention moat. Promote joining a *second* group (for example family plus office); someone in two groups churns much less.
- The **group bet** (a collective coupon) gives a natural reason to message the group mid-week.

## 4. Monetization later (without real-money betting)

| Option | Fit | Legal / store notes |
|---|---|---|
| **Premium group** (one-off or seasonal IAP by the admin): custom coupons, history and export, advanced stats, larger groups, custom branding | Best | Apple/Google IAP, no gambling exposure. Keep prices low (€5–15/season per group) |
| **Sponsored public groups and branded leagues** (podcasts, pubs, local brands) | Good | Prizes from sponsors turn this into a contest. Apple 5.3.x requires official rules and that the *developer* sponsors the contest, so avoid prizes entirely, or use non-cash prizes with rules shown in-app |
| **Light ads** | Weak at this scale | Gambling ads must be filtered out of ad networks; otherwise the age rating and Nordic marketing rules come into play |
| **Affiliate links to buy the coupon** | **Avoid** | Linking to real-money play pulls the app into 5.3.3/5.3.4 (licensing, geo-restriction). Finland bans affiliates from 2027 ([Bird & Bird](https://cm.twobirds.com/en/insights/2025/finland/its-official-licensed-gambling-operators-to-enter-the-finnish-gambling-market-in-july-2027)). Norway's monopoly restricts marketing. Spain's RD 958/2020 restricts gambling communications. Brazil's Law 14.790/2023 restricts betting ads. Not worth it |

## 5. Product gaps per market

Current code relevant to this: `toto_types(country, default_max_doubles/triples)`, `group_toto_types` (one group can follow several coupons), and `columns.games` (jsonb). `profiles.locale check in ('he','en')` blocks new languages. Group-created columns already allow a custom coupon, which is a useful fallback where data is missing.

| Gap | Affects | Size |
|---|---|---|
| Widen the `profiles.locale` constraint; add `sv`, then `nb`, then `es` locale files; date and time via `Intl` | all | S |
| **Coupon ingestion per `toto_type`.** Today an admin enters coupons by hand. Add one script per country in `scripts/` (or a scheduled Edge Function) that fetches the coupon and results. Without this, a solo dev can't run more than one country | all | M |
| Multiple coupons per country (Stryktipset + Europatipset + Topptipset; Norway's Saturday, Sunday and midweek rounds). Already modeled through `group_toto_types`. Needs UI to pick the coupons when creating a group | SE, NO | S |
| Different coupon sizes and hedge limits (8, 12, 13, 14, 15, 16 matches). `max_doubles/triples` already per column. Check the UI handles any length | all | S |
| **Pleno al 15**: a goal-band pick (0, 1, 2, M for each team), not 1X2. `score_bet` assumes 1X2 values | ES | M |
| Deadline in the user's timezone and push reminders relative to the deadline (stored as timestamptz, so the job is display and scheduling) | all non-IL | S |
| GDPR: EU-region Supabase project (check the current project's region), privacy policy per locale, in-app account deletion (already required by Apple), data export on request, a consent line at signup | EU | S |
| Age: ask for 16+ in the terms (GDPR consent age varies 13–16). Answer the store content questionnaires honestly (no simulated gambling, no real money). Show an "18+ to buy coupons; this app does not sell them" note on country screens | all | S |
| Brazil: pt-BR, LGPD privacy policy, UTC-3 | BR | M |

Things that don't matter here: decimals or odds formats (we show none) and RTL (Hebrew already works; new languages are LTR).

## 6. 90-day plan (10 Nov 2026 to 8 Feb 2027)

Metric definitions:
- **Activation** = a user joined at least one group *and* placed their first bet before the deadline.
- **Weekly retention (Wn)** = share of activated users who placed a bet in week n.
- **Invite K** = new activated users per activated user within 14 days.

All three can be computed with SQL over `group_members` and `user_bets`. No analytics SDK is needed.

| Weeks | Milestone | Target |
|---|---|---|
| 1–2 | Israel: TestFlight and Play internal for the 44 users; move the legacy groups across | ≥35 of 44 activated; 0 lost bets |
| 3–4 | Israel public store release; ask each current member to start one new group | ≥80 activated; W4 ≥70% for the legacy cohort |
| 3–6 | Sweden readiness: `sv` locale, Stryktipset/Europatipset/Topptipset `toto_types`, ingestion script, Swedish store listing, privacy policy in sv | Ingestion runs unattended for 3 rounds |
| 5–6 | Recruit 3–5 Swedish seed groups (personal network, then 1:1 outreach on Flashback and Reddit) | 3 groups, ≥25 activated |
| 7–10 | Sweden soft launch: community posts plus 2 podcast public-group pitches; weekly share card live | 150 activated SE; activation from install ≥50%; W4 ≥40%; K ≥0.5 |
| 9–11 | Norway readiness (`nb`, Tipping rounds); 2–3 seed groups | Ingestion stable |
| 11–13 | Norway soft launch; Spain spec for Pleno al 15 | 75 activated NO; go/no-go for Spain based on SE W4 |

Kill or adjust rule: if Swedish W4 is below 25% after 4 rounds, stop expanding. Interview 5 churned users and fix the core loop (reminders, results card) before Norway.

Infrastructure watch: the Supabase free tier is far above these numbers (tens of thousands of MAU). The limits likely to bite first are EAS free-tier monthly build quotas and push volume. Batch releases.

## 7. Next 5 actions

1. **Add activation and retention SQL** (a view or a saved query over `group_members` and `user_bets`) before the Israel rollout, so the baseline exists from week 1.
2. **Widen the locale constraint and add `sv.ts`.** One migration, plus `mobile/src/locales/sv.ts` copied from `en.ts`.
3. **Write the Stryktipset ingestion script.** Pick the source from `toto-games.md`, insert the `toto_types` rows for SE, and run it dry against 2–3 past rounds.
4. **Line up 3 Swedish seed groups.** Ask the 44 Israeli users for Swedish friends or colleagues first, then do 1:1 outreach.
5. **Draft the Swedish store listing and legal copy**: subtitle, keywords from §3, the "not affiliated with Svenska Spel; no money involved" line, and a Swedish privacy policy on groupbet.kfir.app.

---
_Research caveats: per-game player counts are not published by Svenska Spel, Norsk Tipping, Veikkaus or SELAE in anything I could retrieve. The demand scores are relative judgments based on single-round turnover, annual turnover and syndicate press coverage, not audited player numbers. Before committing build time, check the current status of Denmark's Tips 13 and Portugal's Totobola against `toto-games.md`._
