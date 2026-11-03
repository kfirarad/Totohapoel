// ScoreAxis match-id lookup. scoreaxis.com is behind Cloudflare and has no CORS, so the lookup runs
// as a bookmarklet on their page: our admin opens scoreaxis.com with the round's games in the URL hash,
// the bookmarklet resolves team ids (search) and match ids (h2h + kickoff time) and posts them back
// to our tab via window.opener.

export const SCOREAXIS_ORIGIN = "https://www.scoreaxis.com";
export const SCOREAXIS_MESSAGE = "totohapoel-scoreaxis";

export type ScoreAxisSide = { he: string; id: string | null; en: string | null };
export type ScoreAxisPayload = {
  origin: string;
  games: { n: number; t: string; home: ScoreAxisSide; away: ScoreAxisSide }[];
};
export type ScoreAxisResult = {
  n: number;
  home: string;
  away: string;
  matchId: string | null;
  homeId?: string;
  awayId?: string;
};

const encode = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))));

export const scoreAxisUrl = (payload: ScoreAxisPayload) =>
  `${SCOREAXIS_ORIGIN}/widgets/football/live-match-centre/#totohapoel=${encode(payload)}`;

/**
 * Runs on scoreaxis.com. Must stay self-contained (it is serialized with toString into the bookmarklet).
 * Returns a promise so it can be tested.
 */
export function scoreAxisRunner() {
  return (async () => {
    const m = location.hash.match(/totohapoel=([^&]+)/);
    if (!m) {
      alert('פתח את הדף דרך הכפתור "מצא משחקים ב-ScoreAxis" בטוטו הפועל');
      return;
    }
    const payload = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    if (!window.opener) {
      alert("החלון של טוטו הפועל נסגר. פתח שוב מהכפתור.");
      return;
    }
    const get = async (url: string) => {
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    };
    const nameOf = (t: { name?: string | { en?: string } }) =>
      (typeof t?.name === "string" ? t.name : t?.name?.en) || "";
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const cache: Record<string, string[]> = {};

    // known team id, or the best 3 search hits for the admin-provided English name
    const candidates = async (side: { id: string | null; en: string | null }) => {
      if (side.id) return [side.id];
      if (!side.en) return [];
      if (!cache[side.en]) {
        const d = await get("/api/football/team/search?name=" + encodeURIComponent(side.en));
        const list: { id?: string; name?: string | { en?: string } }[] = Array.isArray(d)
          ? d
          : d.teams || d.data || d.items || d.results || Object.values(d).find(Array.isArray) || [];
        const q = norm(side.en);
        const score = (t: { name?: string | { en?: string } }) => {
          const n = norm(nameOf(t));
          return n === q ? 3 : n.startsWith(q) || n.endsWith(q) ? 2 : n.includes(q) ? 1 : 0;
        };
        cache[side.en] = list
          .filter((t) => t && t.id)
          .sort((a, b) => score(b) - score(a))
          .slice(0, 3)
          .map((t) => t.id as string);
      }
      return cache[side.en];
    };

    const results = [];
    for (const g of payload.games) {
      let found = null;
      try {
        const kickoff = new Date(g.t).getTime();
        const homes = await candidates(g.home);
        const aways = await candidates(g.away);
        search: for (const h of homes) {
          for (const a of aways) {
            const d = await get("/api/football/h2h-games?firstTeamId=" + h + "&secondTeamId=" + a);
            // the fixture between these teams that kicks off within 90 minutes of Winner's time
            const match = (d.games || []).find(
              (x: { date: string }) => Math.abs(new Date(x.date).getTime() - kickoff) <= 90 * 60000
            );
            if (match) {
              found = { matchId: match.id, homeId: h, awayId: a };
              break search;
            }
          }
        }
      } catch {
        // leave this game unmatched; the admin fills it by hand
      }
      results.push({ n: g.n, home: g.home.he, away: g.away.he, ...(found || { matchId: null }) });
    }

    window.opener.postMessage({ type: "totohapoel-scoreaxis", results }, payload.origin);
    alert(
      "נמצאו " + results.filter((r) => r.matchId).length + " מתוך " + results.length + " משחקים. חזור לטאב של טוטו הפועל ושמור."
    );
  })();
}

export const scoreAxisBookmarklet = () => `javascript:${encodeURIComponent(`(${scoreAxisRunner.toString()})()`)}`;
