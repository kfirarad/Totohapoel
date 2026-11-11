# Group Bet: App Privacy answers (App Store Connect → App Privacy)

These answers were checked against the code and `supabase/migrations` on 2026-11-10.

**Tracking: No.** There are no ads, no analytics SDK and no data shared with data brokers.

## Data collected (all "Linked to the user", purpose: App Functionality only)

| ASC category | Data | Where |
|---|---|---|
| Contact Info → Name | Name from Apple/Google, editable | `profiles.name` |
| Contact Info → Email Address | Sign-in email (Apple may give a relay address) | Supabase Auth |
| User Content → Photos or Videos | Profile and group photos the user picks | Storage bucket `avatars` |
| User Content → Other User Content | Bets, group names, group bets | `user_bets`, `groups`, `group_bets` |
| Identifiers → User ID | Account id | Supabase Auth |
| Identifiers → Device ID | Expo push token, only if notifications are allowed | `push_tokens` |

## Not collected
Location, contacts, health, financial info, browsing or search history, usage data, diagnostics (no crash SDK), purchases.

Third parties that process data: Supabase (database and auth, EU Frankfurt), Expo (push delivery), Apple and Google (sign-in, push). None of them use it for tracking.
