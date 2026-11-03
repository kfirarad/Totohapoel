import { test, expect } from "bun:test";
import { decodeDraw, drawToColumn, encodeDraw, israelTimeToIso, parseScoreAxisId, pickTotoDraw, type WinnerDraw } from "./winner";

const draw: WinnerDraw = {
  gameType: 96,
  drawNumber: 264401,
  closeDateTime: "2026-11-07T14:54:00.000",
  rows: [
    { rowNumber: 1, eventStartTime: "2026-11-08T20:30:00.000", league: "ליגת Winner", teamA: "הפועל באר שבע", teamB: "הפועל תל אביב", betRadarId: "72225430" },
  ],
};

test("picks the Toto 16 draw from the full response or accepts a single draw", () => {
  const full = { games: [{ ...draw, gameType: 87 }, draw, { ...draw, gameType: 86 }] };
  expect(pickTotoDraw(full)?.gameType).toBe(96);
  expect(pickTotoDraw(draw)?.drawNumber).toBe(264401);
  expect(pickTotoDraw({ games: [] })).toBeNull();
  expect(pickTotoDraw("nope")).toBeNull();
});

test("Israel local time converts with the right offset in winter and summer", () => {
  expect(israelTimeToIso("2026-11-07T14:54:00.000")).toBe("2026-11-07T12:54:00.000Z"); // UTC+2
  expect(israelTimeToIso("2026-07-01T20:00:00.000")).toBe("2026-07-01T17:00:00.000Z"); // UTC+3
});

test("draw maps to our column", () => {
  const c = drawToColumn(draw);
  expect(c.name).toBe("טוטו 7/11/26");
  expect(c.deadline).toBe("2026-11-07T12:54:00.000Z");
  expect(c.games[0]).toMatchObject({ game_num: 1, home_team: "הפועל באר שבע", away_team: "הפועל תל אביב", bet_radar_id: "72225430" });
});

test("hash transport round-trips Hebrew", () => {
  expect(decodeDraw(encodeDraw(draw))).toEqual(draw);
  expect(decodeDraw("%%%")).toBeNull();
});

test("ScoreAxis id from id, url or embed code", () => {
  expect(parseScoreAxisId("6a3cc87e8925f018dc0ace00")).toBe("6a3cc87e8925f018dc0ace00");
  expect(parseScoreAxisId("12345")).toBe("12345");
  expect(parseScoreAxisId("https://www.scoreaxis.com/widget/live-match/6a3cc87e8925f018dc0ace00?autoHeight=1")).toBe("6a3cc87e8925f018dc0ace00");
  expect(parseScoreAxisId('<iframe src="https://www.scoreaxis.com/widget/live-match/555?x=1"></iframe>')).toBe("555");
  expect(parseScoreAxisId("abc")).toBeNull();
});
