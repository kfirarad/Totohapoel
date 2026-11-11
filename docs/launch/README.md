# Group Bet multi-country launch plan

Combined plan from three research reports (2026-11-10). Details and sources:
- [admin-dashboard.md](admin-dashboard.md): the operator admin at gb-admin.kfir.app.
- [toto-games.md](toto-games.md): weekly football pools games around the world, their data feeds, legal and brand rules.
- [gtm.md](gtm.md): country ranking, positioning, channels and a 90-day plan.

## Decisions in short

| Topic | Decision |
|---|---|
| Positioning | "Your tipping group without the WhatsApp mess." Free, no money, no prizes. |
| Store wording | No "bet", "odds" or "gamble" in the listing. No operator logos, and no operator brand in the app name or icon. The game name may be used descriptively ("Stryktipset week 46") together with a "not affiliated with …" line. Adding prizes would bring in App Store 5.3, so don't. |
| hapoel-toto | Stays the friends' site for the "טוטו הפועל" group. Group Bet is the product that grows. |
| Admin | A Bun + React single-page app in a new `admin/` folder, served from a Cloudflare Worker on gb-admin.kfir.app. Google sign-in, system admins only. Security lives in Postgres (RLS and `security definer` RPCs), with no admin server and no secret key. $0. |
| Data model | `columns.games` stays JSONB, so the mobile app and hapoel-toto need no change. New `teams` and `competitions` tables are added. `toto_types` gains `games_count`, `timezone`, `adapter` and `is_active`. `columns` gains `source` and `external_id`, so re-importing a round updates it. |
| Coupons | Operators pick the matches by hand, so take the match list from the operator: a JSON feed, a PDF or manual entry. Then map each match to a fixture API for kickoff times and results. |
| Results | API-Football: the free tier allows 100 requests a day, and Pro is about $19 a month. A scheduled Supabase Edge Function fills a result only at full time. Postponed games raise an alert, and a result entered by hand is never overwritten. |

## Launch order

Both reports agree that **Sweden comes first after Israel.**
- Stryktipset is the biggest European pool: a record SEK 53.8M round in October 2025.
- Syndicate play is common, and the 13 × 1X2 coupon with doubles and triples fits the app as it is.
- Svenska Spel's site returns the coupon as JSON.

For the second slot, the two reports disagree:
- **GTM says Norway:** it scores higher on demand.
- **The catalog says Finland:** Veikkaus Vakio has a fully open JSON feed, while Norway's API refused access (403), so every Norwegian round would be entered by hand.

**Recommendation: Finland second, Norway third.** For a solo developer, a free automatic feed is worth more than the higher demand score.

**Then Spain.** It has the strongest brand but needs "Pleno al 15", a goal-count pick that 1X2 scoring can't handle. After that, Brazil Loteca, whose format matches ours exactly and which has a public JSON feed.

**Skip for now:**
- **Italy and Portugal:** their pools are small.
- **Germany:** Kicktipp owns friends' tipping there.
- **The UK:** Classic Pools uses a score-draw game, not 1X2.
- **China:** geo-blocked.
- **Singapore and Malaysia:** their "TOTO" is a number lottery, not football.

## Gaps that block other countries

1. **Rounds are entered by hand, one type only.** This is the main blocker, and the admin with import converters fixes it.
2. **Only Hebrew and English.** `profiles.locale` allows only those two, and there are no Swedish, Finnish or Norwegian strings.
3. **Deadlines and kickoff times aren't shown in each user's timezone.**
4. **Game count is fixed.** It's 16 in the old web form; it should come from the toto type: 13 in Sweden, 12–13 in Finland, 14 in Spain.
5. **Age line.** The terms say 13+. GTM recommends 16+, the highest digital-consent age in the EU.
6. **No usage metrics yet:** activation (joined a group and placed a first bet) and retention by week.
7. **Invite links don't open the app.** That needs the apple-app-site-association file plus a `/join/<code>` page on groupbet.kfir.app, which needs the Apple Team ID.

## Next steps

### Phase 0: finish Israel (this week)
1. **Commit and push all open work to PR #14:** the web move, the import script, the realtime migration, the site, OTA, archiving and the photo fallback.
2. **Add an `admin_stats()` SQL function:** activation and retention numbers, before inviting the 44 friends to the app.
3. **Invite the friends to TestFlight.** Target: about 35 of 44 betting from the app in weeks 1–2.
4. **Invite links that open the app:** AASA file and a join page.

### Phase 1: admin skeleton (S–M)
5. Scaffold `admin/` and deploy a sign-in-only shell to gb-admin.kfir.app that refuses non-admins.
6. Migration `20261110000000_admin.sql`: new `toto_types` and `columns` fields, `teams` and `competitions`, the admin RPCs, and a test that a non-admin gets `42501`.
7. **Port the round workflow:**
   - game count per toto type
   - results entry
   - archiving
   - the Winner converter
   - a CSV-paste converter, with `bun test`

   From then on, edit global rounds only in the new admin.

### Phase 2: Sweden (target around week 7)
8. Allow more locales (`sv`, `fi`, `no`, `es`), add Swedish strings, and show times in the user's timezone.
9. **Add the Stryktipset and Europatipset toto types** and an import adapter that reads the Svenska Spel JSON. Email Svenska Spel for an official API key.
10. **Auto results from API-Football** through a scheduled Edge Function.
11. Write the Swedish store listing, privacy policy and "not affiliated with Svenska Spel" line. Change the terms' age line to 16+.
12. **Recruit 3–5 real Swedish seed groups** through existing contacts. Add a shareable weekly results card.

**Gate:** if fewer than 25% of Swedish users are still betting in week 4, stop expanding and fix the core loop.

### Phase 3: Finland, Norway, Spain
13. Vakio adapter on the open Veikkaus feed, plus Finnish strings.
14. Norway Tipping, with rounds entered manually in the admin.
15. Spain: support "Pleno al 15" scoring, a Quiniela adapter (manual or light scraping, since their endpoint blocks bots), and Spanish strings.

## Decisions for Kfir
- **Second country:** Finland (open feed) or Norway (more demand, manual entry)?
- **Results API:** stay on API-Football's free tier (100 requests a day), or budget about $19 a month for Pro once there are 2 or more countries?
- **Age line in the terms:** 13+ or 16+?
- **Monetization later:** a premium tier for group admins is the safe option. Affiliate links to buy coupons should be avoided, because they bring in gambling-licence rules.
