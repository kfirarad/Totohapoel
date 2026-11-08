/// <reference types="bun" />
import { test, expect } from "bun:test";
import type { Game } from "@/core/types";
import {
  autoFillGroupBet,
  computePlayerStats,
  formVotes,
  formWeights,
  groupScore,
  playerHistory,
  type SeasonBet,
  type SeasonColumn,
} from "./stats";

const game = (game_num: number, result: Game["result"]) =>
  ({ game_num, result }) as Game;

const col = (id: string, deadline: string, results: Game["result"][], groupPicks: string[][] | null = null): SeasonColumn => ({
  id, name: id, deadline,
  group_bet: groupPicks && groupPicks.map((value, i) => ({ game_num: i + 1, value: value as Game["result"][] })),
  games: results.map((r, i) => game(i + 1, r)),
});

const bet = (user_id: string, column_id: string, picks: string[][]): SeasonBet => ({
  user_id, column_id, profiles: { name: user_id },
  bet_values: picks.map((value, i) => ({ game_num: String(i + 1), value: value as SeasonBet["bet_values"][0]["value"] })),
});

const now = new Date("2026-06-01");
const columns = [
  col("c1", "2026-01-01", ["1", "X", "2"], [["1"], ["1"], ["1"]]), // group hits 1
  col("c2", "2026-02-01", ["1", "1", "1"], [["1"], ["1"], ["1"]]), // group hits 3
  col("open", "2026-12-01", [null, null, null]),
];
const bets = [
  bet("a", "c1", [["1"], ["X"], ["1"]]), // 2/3
  bet("b", "c1", [["2"], ["1"], ["1"]]), // 0/3
  bet("a", "c2", [["1"], ["1", "X"], ["2"]]), // 2/3, one double hit
  bet("b", "c2", [["1"], ["1"], ["1"]]), // 3/3
  bet("a", "open", [["1"], ["1"], ["1"]]),
];

test("player KPIs", () => {
  const stats = Object.fromEntries(computePlayerStats(columns, bets, 1, now).map((p) => [p.userId, p]));
  expect(stats.a.columns).toBe(2);
  expect(stats.a.correct).toBe(4);
  expect(stats.a.hitRate).toBeCloseTo(4 / 6);
  expect(stats.a.formRate).toBeCloseTo(2 / 3); // last 1 week = c2
  expect(stats.a.wins).toBe(1); // c1
  expect(stats.b.wins).toBe(1); // c2
  expect(stats.b.bestWeek).toBe(3);
  expect(stats.a.beatGroup).toBe(1); // 2 > 1 in c1, 2 < 3 in c2
  expect(stats.b.beatGroup).toBe(0); // 3 == 3 isn't beating
  expect(stats.a.singlesHitRate).toBeCloseTo(3 / 5);
});

test("form weights only use history before the column, new players get the average", () => {
  const w = formWeights(columns, bets, new Date("2026-01-15"), 5, 1); // only c1 is history
  expect(w("a")).toBeCloseTo(2 / 3);
  expect(w("b")).toBeCloseTo(0);
  expect(w("new")).toBeCloseTo(1 / 3);
});

test("form votes split weight across picked outcomes", () => {
  const v = formVotes([bet("a", "x", [["1", "X"]]), bet("b", "x", [["2"]])], (u) => (u === "a" ? 2 : 1));
  expect(v["1"]).toEqual({ "1": 1, X: 1, "2": 1, total: 3 });
});

test("auto-fill respects limits and hedges the least certain games", () => {
  const votes = {
    "1": { "1": 9, X: 1, "2": 0, total: 10 }, // confident
    "2": { "1": 4, X: 3, "2": 3, total: 10 }, // most uncertain -> triple
    "3": { "1": 5, X: 5, "2": 0, total: 10 }, // strong runner-up -> double
    "4": { "1": 0, X: 0, "2": 8, total: 8 },
  };
  const filled = autoFillGroupBet([1, 2, 3, 4], votes, 1, 1);
  expect(filled[1]).toEqual(["1"]);
  expect(filled[2]).toHaveLength(3);
  expect([...filled[3]].sort()).toEqual(["1", "X"]);
  expect(filled[4]).toEqual(["2"]);
});

test("player history lists only closed columns the player bet on", () => {
  const rows = playerHistory(columns, bets, "a", now);
  expect(rows.map((r) => [r.columnId, r.correct, r.graded, r.group, r.average])).toEqual([
    ["c1", 2, 3, 1, 1], // a 2, b 0
    ["c2", 2, 3, 3, 2.5], // a 2, b 3
  ]);
});

test("group score comes from the group picks and results; no group bet is null", () => {
  expect(groupScore(columns[0])).toBe(1);
  expect(groupScore(columns[1])).toBe(3);
  expect(groupScore(columns[2])).toBeNull();
  expect(groupScore({ ...columns[0], group_bet: [{ game_num: 1, value: [] }] })).toBeNull();
});
