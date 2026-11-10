import { expect, test } from "bun:test";
import { toGroupColumn, type GroupColumnRow } from "./groupColumn";

const row = (gc: Partial<GroupColumnRow["group_columns"][0]>, max: number | null = 6): GroupColumnRow => ({
  id: "c1", name: "Toto", deadline: "2026-11-14T12:00:00Z", market: "il", max_doubles: max, max_triples: max,
  group_columns: [{
    group_id: "g1", column_id: "c1", max_doubles: null, max_triples: null, is_active: true, is_archived: false,
    group_bet: null, group_bet_max_doubles: null, group_bet_max_triples: null, group_bet_correct_guesses: null, ...gc,
  }],
});

test("group default, capped by the operator maximum", () => {
  expect(toGroupColumn(row({}), { max_doubles: 5, max_triples: 4 })).toMatchObject({ max_doubles: 5, max_triples: 4, operator_max_doubles: 6 });
  expect(toGroupColumn(row({}), { max_doubles: 9, max_triples: 9 })).toMatchObject({ max_doubles: 6, max_triples: 6 });
});

test("per-column override wins over the group default, still capped", () => {
  expect(toGroupColumn(row({ max_doubles: 2 }), { max_doubles: 5, max_triples: 4 }).max_doubles).toBe(2);
  expect(toGroupColumn(row({ max_doubles: 8 }), { max_doubles: 5, max_triples: 4 }).max_doubles).toBe(6);
});

test("no operator maximum = no cap", () => {
  expect(toGroupColumn(row({}, null), { max_doubles: 9, max_triples: 9 }).max_doubles).toBe(9);
});

test("group bet and per-group state are flattened", () => {
  const c = toGroupColumn(row({ is_archived: true, group_bet: [{ game_num: "1", value: ["1"] }], group_bet_max_doubles: 7 }),
    { max_doubles: 5, max_triples: 4 });
  expect(c).toMatchObject({ is_archived: true, group_max_doubles: 7, group_bet: [{ game_num: "1", value: ["1"] }] });
  expect("group_columns" in c).toBe(false);
});
