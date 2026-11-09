// @ts-nocheck: run with Bun, outside the app's TypeScript setup.
// Public pages for groupbet.kfir.app (home, privacy, terms, support), same setup as keto.kfir.app.
// Build then deploy: bun site/group-bet/build.ts && bunx wrangler deploy --config site/group-bet/wrangler.jsonc
// Optional effective date: bun site/group-bet/build.ts 2026-11-09
const EMAIL = 'groupbet@kfir.app';
const APP_STORE = 'https://apps.apple.com/app/id6832359803';
const date = Bun.argv[2] ?? new Date().toISOString().slice(0, 10);

const page = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
:root{color-scheme:light dark}
body{font:17px/1.6 -apple-system,system-ui,sans-serif;max-width:42rem;margin:0 auto;padding:2rem 1rem 4rem;background:#f5f7fb;color:#111827}
a{color:#2563eb}h1 img{height:1.5em;border-radius:22%;vertical-align:middle;margin-right:.4em}
[dir=rtl] h1 img{margin:0 0 0 .4em}hr{border:0;border-top:1px solid #d1d5db;margin:2.5rem 0}
@media(prefers-color-scheme:dark){body{background:#0f1115;color:#e5e7eb}a{color:#8ab4ff}hr{border-color:#374151}}
</style></head><body>
${body}
<hr><p><a href="/">Group Bet</a> · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/support/">Support</a></p>
</body></html>`;

/** English, then the Hebrew version right-to-left. */
const both = (en: string, he: string) =>
  `${Bun.markdown.html(en)}\n<hr>\n<div dir="rtl" lang="he">\n${Bun.markdown.html(he)}\n</div>`;

const home = both(`# ![](/icon.png) Group Bet

Toto predictions with your groups of friends. Fill in one bet per round and it counts in every group you play in, with leaderboards, stats and a group bet. No money, no ads.

- [Download on the App Store](${APP_STORE})
- [Privacy policy](/privacy/)
- [Terms of use](/terms/)
- [Support](/support/)`, `# ![](/icon.png) טוטו חברים

ניחושי טוטו עם קבוצות החברים שלך. ממלאים טור אחד לכל מחזור והוא נספר בכל הקבוצות, עם טבלאות, סטטיסטיקות וטור קבוצתי. בלי כסף ובלי פרסומות.

- [להורדה ב-App Store](${APP_STORE})
- [מדיניות פרטיות](/privacy/)
- [תנאי שימוש](/terms/)
- [תמיכה](/support/)`);

const privacy = both(`# Group Bet privacy policy

Effective ${date}

Group Bet ("טוטו חברים") is a free app and website for toto predictions with groups of friends. It has no ads and does not sell or share your data.

## What we collect

- **Account details** from Sign in with Apple or Google: your name, email address and (Google) profile picture. With Apple you may hide your email.
- **Profile**: the name and photo you choose, your language and notification preferences.
- **Game data**: the groups you create or join, your bets, scores and group roles.
- **Push notification token**, if you allow notifications.

We do not collect location, contacts, advertising identifiers or analytics.

## Photos, camera and microphone

When you set a profile or group picture, the app asks for access to your photo library and uploads only the one picture you pick. The app does not ask for access to the camera or microphone and never records or listens to audio.

## How it is used

Only to run the service: signing you in, showing your bets and results to members of groups you belong to, and sending the notifications you turned on.

## Who can see it

Members of your groups see your name, photo, bets and scores. Nobody else does. Data is stored with Supabase (servers in Frankfurt, EU); push notifications are delivered through Expo and Apple/Google.

## Deleting your data

Delete your account any time from Profile → Delete account in the app. This permanently removes your profile, bets and memberships. You can also email us to ask for deletion.

## Children

Group Bet is not directed at children under 13.

## Changes

If this policy changes, the new version is posted here with a new effective date.

## Contact

[${EMAIL}](mailto:${EMAIL})`, `# טוטו חברים – מדיניות פרטיות

בתוקף מ-${date}

טוטו חברים (Group Bet) היא אפליקציה ואתר חינמיים לניחושי טוטו עם קבוצות חברים. אין בהם פרסומות, והמידע שלך לא נמכר ולא מועבר לאחרים.

## מה נאסף

- **פרטי חשבון** מהתחברות עם Apple או Google: שם, כתובת אימייל ותמונת פרופיל (ב-Google). ב-Apple אפשר להסתיר את האימייל.
- **פרופיל**: השם והתמונה שבחרת, שפה והעדפות התראות.
- **נתוני משחק**: הקבוצות שיצרת או הצטרפת אליהן, הניחושים, הניקוד והתפקידים בקבוצה.
- **מזהה התראות**, אם אישרת התראות.

לא נאספים מיקום, אנשי קשר, מזהי פרסום או נתוני אנליטיקה.

## תמונות, מצלמה ומיקרופון

כשבוחרים תמונת פרופיל או תמונת קבוצה, האפליקציה מבקשת גישה לספריית התמונות ומעלה רק את התמונה שבחרת. האפליקציה לא מבקשת גישה למצלמה או למיקרופון ולעולם לא מקליטה או מאזינה לשמע.

## שימוש במידע

רק להפעלת השירות: התחברות, הצגת הניחושים והתוצאות לחברי הקבוצות שלך, ושליחת ההתראות שהפעלת.

## מי רואה

חברי הקבוצות שלך רואים את השם, התמונה, הניחושים והניקוד שלך. אף אחד אחר לא. המידע נשמר ב-Supabase (שרתים בפרנקפורט, האיחוד האירופי), והתראות נשלחות דרך Expo ו-Apple/Google.

## מחיקת מידע

אפשר למחוק את החשבון בכל זמן מפרופיל ← מחיקת חשבון באפליקציה. הפעולה מוחקת לצמיתות את הפרופיל, הניחושים והחברות בקבוצות. אפשר גם לבקש מחיקה באימייל.

## ילדים

השירות אינו מיועד לילדים מתחת לגיל 13.

## שינויים

אם המדיניות תשתנה, הגרסה החדשה תפורסם כאן עם תאריך תוקף חדש.

## יצירת קשר

[${EMAIL}](mailto:${EMAIL})`);

const terms = both(`# Group Bet terms of use

Effective ${date}

By using the Group Bet app or website you agree to these terms.

## A game, not gambling

Group Bet is a free game for predicting football results with friends. No money is staked, paid or won through Group Bet, and it does not take or place bets. It is not affiliated with Winner, the Israel Sports Betting Board or any betting operator. Fixtures and results are entered by hand and may contain mistakes.

## Your account

You sign in with Apple or Google and you are responsible for activity on your account. You must be at least 13. You can delete your account at any time from the app.

## Groups and content

Group admins decide who joins their group and can remove members. Keep names, photos and group names lawful and respectful; don't impersonate others or harass other players. We may remove content or suspend accounts that break these rules.

## The service

Group Bet is provided "as is", without warranties. It may change, be unavailable at times, or end. To the extent the law allows, we are not liable for any loss arising from using it, including wrong results, scores or missed deadlines.

## Changes

If these terms change, the new version is posted here with a new effective date. Continuing to use Group Bet means you accept them.

## Law

These terms are governed by the laws of the State of Israel.

## Contact

[${EMAIL}](mailto:${EMAIL})`, `# טוטו חברים – תנאי שימוש

בתוקף מ-${date}

השימוש באפליקציה או באתר של טוטו חברים מהווה הסכמה לתנאים אלה.

## משחק, לא הימורים

טוטו חברים הוא משחק חינמי לניחוש תוצאות כדורגל עם חברים. לא מופקד, משולם או נזכה בו כסף, והשירות אינו מקבל או משלח הימורים. אין לו קשר לווינר, למועצה להסדר ההימורים בספורט או לכל גורם הימורים. המשחקים והתוצאות מוזנים ידנית ועלולים להכיל טעויות.

## החשבון שלך

ההתחברות היא עם Apple או Google, ואתה אחראי לפעילות בחשבונך. יש להיות בני 13 לפחות. אפשר למחוק את החשבון בכל זמן מהאפליקציה.

## קבוצות ותוכן

מנהלי קבוצה מחליטים מי מצטרף ויכולים להסיר חברים. שמות, תמונות ושמות קבוצות צריכים להיות חוקיים ומכבדים; אין להתחזות לאחרים או להטריד שחקנים. אנחנו רשאים להסיר תוכן או להשעות חשבונות שמפרים כללים אלה.

## השירות

טוטו חברים מסופק "כמות שהוא", ללא אחריות. הוא עשוי להשתנות, להיות לא זמין לפעמים או להיסגר. ככל שהחוק מתיר, איננו אחראים לכל נזק מהשימוש בו, כולל תוצאות, ניקוד או מועדים שגויים.

## שינויים

אם התנאים ישתנו, הגרסה החדשה תפורסם כאן עם תאריך תוקף חדש. המשך השימוש מהווה הסכמה להם.

## דין

על תנאים אלה חלים דיני מדינת ישראל.

## יצירת קשר

[${EMAIL}](mailto:${EMAIL})`);

const support = both(`# Group Bet support

Questions, problems or a wrong result? Write to [${EMAIL}](mailto:${EMAIL}).

## Common questions

**How do I join a group?** Open the invite link a friend shared, or tap Join and enter the 6-letter code. Closed groups need an admin to approve you.

**Does my bet count in all my groups?** Yes. You fill one bet per round and it is scored in every group you're in.

**Can I change my bet?** Yes, until the round's deadline.

**How do I delete my account?** Profile → Delete account. It removes your profile, bets and memberships for good.`, `# טוטו חברים – תמיכה

שאלות, תקלות או תוצאה שגויה? כתבו ל-[${EMAIL}](mailto:${EMAIL}).

## שאלות נפוצות

**איך מצטרפים לקבוצה?** פותחים את קישור ההזמנה שחבר שלח, או לוחצים הצטרפות ומזינים את הקוד בן 6 התווים. בקבוצה סגורה מנהל צריך לאשר.

**הניחוש נספר בכל הקבוצות?** כן. ממלאים טור אחד לכל מחזור והוא נספר בכל הקבוצות שלך.

**אפשר לשנות ניחוש?** כן, עד מועד הסגירה של המחזור.

**איך מוחקים חשבון?** פרופיל ← מחיקת חשבון. הפעולה מוחקת לצמיתות את הפרופיל, הניחושים והחברות בקבוצות.`);

const out = `${import.meta.dir}/dist`;
await Bun.write(`${out}/icon.png`, Bun.file(`${import.meta.dir}/../../mobile/assets/images/icon.png`));
await Bun.write(`${out}/index.html`, page('Group Bet – טוטו חברים', home));
await Bun.write(`${out}/privacy/index.html`, page('Group Bet privacy policy', privacy));
await Bun.write(`${out}/terms/index.html`, page('Group Bet terms of use', terms));
await Bun.write(`${out}/support/index.html`, page('Group Bet support', support));
// Google's consent screen and earlier notes link the old address.
await Bun.write(`${out}/privacy.html`, `<!doctype html><meta http-equiv="refresh" content="0; url=/privacy/"><link rel="canonical" href="/privacy/">`);
console.log(`built ${out} (effective date ${date})`);
