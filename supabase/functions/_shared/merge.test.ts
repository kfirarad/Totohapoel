import { expect, test } from "bun:test";
import { drawToColumnRow, mergeResults, refreshFixtures } from "./merge.ts";
import type { DrawDTO, StoredGame } from "./types.ts";

const draw: DrawDTO = {
  externalId: "4801",
  name: "Stryktipset 4801",
  deadline: "2026-11-14T14:59:00.000Z",
  games: [
    { gameNum: 1, externalId: "e1", home: "A", away: "B", competition: "PL", kickoff: "2026-11-14T15:00:00.000Z" },
    { gameNum: 2, externalId: "e2", home: "C", away: "D", competition: "PL", kickoff: "2026-11-14T15:00:00.000Z" },
  ],
};

const games = () => drawToColumnRow("se", draw, { maxDoubles: 13, maxTriples: 13 }).games as StoredGame[];

test("draw -> column row", () => {
  const row = drawToColumnRow("se", draw, { maxDoubles: 13, maxTriples: 13 });
  expect(row).toMatchObject({ market: "se", external_draw_id: "4801", max_doubles: 13, source_status: "open" });
  expect(row.games[0]).toMatchObject({ game_num: 1, home_team: "A", result: null, status: "scheduled", external_id: "e1" });
});

test("results merge by external id, count changes, detect final", () => {
  const partial = mergeResults(games(), {
    externalId: "4801", final: false,
    games: [{ gameNum: 99, externalId: "e2", status: "played", result: "X" }],
  });
  expect(partial.updated).toBe(1);
  expect(partial.final).toBe(false);
  expect(partial.games[1]).toMatchObject({ result: "X", status: "played", result_source: "operator" });

  const done = mergeResults(partial.games, {
    externalId: "4801", final: false,
    games: [{ gameNum: 1, externalId: "e1", status: "void", result: null }, { gameNum: 2, externalId: "e2", status: "played", result: "X" }],
  });
  expect(done.updated).toBe(1); // e2 unchanged
  expect(done.final).toBe(true); // void counts as settled
});

test("manual results are never overwritten", () => {
  const g = games();
  g[0] = { ...g[0], result: "1", result_source: "manual" };
  const out = mergeResults(g, { externalId: "4801", final: true, games: [{ gameNum: 1, externalId: "e1", status: "played", result: "2" }] });
  expect(out.games[0].result).toBe("1");
  expect(out.updated).toBe(0);
});

test("fixture refresh moves kickoffs, keeps results", () => {
  const g = games();
  g[0] = { ...g[0], result: "1" };
  const moved = { ...draw, games: [{ ...draw.games[0], kickoff: "2026-11-15T13:00:00.000Z" }] };
  const out = refreshFixtures(g, moved);
  expect(out[0]).toMatchObject({ game_time: "2026-11-15T13:00:00.000Z", result: "1" });
  expect(out[1].game_time).toBe(draw.games[1].kickoff);
});
