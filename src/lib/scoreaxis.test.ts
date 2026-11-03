import { test, expect } from "bun:test";
import { scoreAxisBookmarklet, scoreAxisRunner, scoreAxisUrl, type ScoreAxisPayload } from "./scoreaxis";

const PT = "62321b42adaf4b2bd73defba"; // Hapoel Petah Tikva
const RG = "62321b18adaf4b2bd73de862"; // Hapoel Ramat Gan

const payload: ScoreAxisPayload = {
  origin: "https://hapoel-toto.web.app",
  games: [
    // English names typed by the admin, ids unknown yet -> search + h2h
    { n: 5, t: "2026-11-07T13:00:00.000Z", home: { he: "הפועל פתח תקוה", id: null, en: "Petah Tikva" }, away: { he: "הפועל רמת גן", id: null, en: "Ramat Gan" } },
    // ids already learned -> h2h only, but no fixture near that time
    { n: 6, t: "2026-12-01T13:00:00.000Z", home: { he: "הפועל פתח תקוה", id: PT, en: null }, away: { he: "הפועל רמת גן", id: RG, en: null } },
    // unknown team without an English name -> skipped
    { n: 7, t: "2026-11-07T13:00:00.000Z", home: { he: "קבוצה", id: null, en: null }, away: { he: "הפועל רמת גן", id: RG, en: null } },
  ],
};

test("runner resolves teams, picks the fixture by kickoff time and posts results back", async () => {
  const posted: { data: unknown; origin: string }[] = [];
  const alerts: string[] = [];
  const g = globalThis as Record<string, unknown>;
  g.location = { hash: "#totohapoel=" + scoreAxisUrl(payload).split("#totohapoel=")[1] };
  g.window = { opener: { postMessage: (data: unknown, origin: string) => posted.push({ data, origin }) } };
  g.alert = (m: string) => alerts.push(m);
  g.fetch = async (url: string) => {
    const body = url.includes("team/search")
      ? url.includes("Petah")
        ? [{ id: "other", name: { en: "Maccabi Petah Tikva" } }, { id: PT, name: { en: "Hapoel Petah Tikva" } }]
        : { teams: [{ id: RG, name: { en: "Hapoel Ramat Gan" } }] }
      : url.includes(`firstTeamId=${PT}&secondTeamId=${RG}`)
      ? { games: [{ id: "6a3cc87e8925f018dc0ace00", date: "2026-11-07T13:00:00+00:00" }, { id: "old", date: "2025-05-05T16:00:00+00:00" }] }
      : { games: [] };
    return { ok: true, json: async () => body } as Response;
  };

  await scoreAxisRunner();

  expect(posted).toHaveLength(1);
  expect(posted[0].origin).toBe("https://hapoel-toto.web.app");
  const results = (posted[0].data as { results: { n: number; matchId: string | null; homeId?: string }[] }).results;
  expect(results.find((r) => r.n === 5)).toMatchObject({ matchId: "6a3cc87e8925f018dc0ace00", homeId: PT });
  expect(results.find((r) => r.n === 6)?.matchId).toBeNull();
  expect(results.find((r) => r.n === 7)?.matchId).toBeNull();
  expect(alerts[0]).toContain("1 מתוך 3");
});

test("bookmarklet is valid JavaScript", () => {
  const code = decodeURIComponent(scoreAxisBookmarklet().slice("javascript:".length));
  expect(() => new Function(code)).not.toThrow();
});
