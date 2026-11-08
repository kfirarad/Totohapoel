/// <reference types="bun" />
import { test, expect } from 'bun:test';
import type { Game } from '@/core/types';
import { canSubmit, score, togglePick, usage, votes, toPicks, fromPicks } from '@/core/scoring';

const g = (n: number, result: Game['result'] = null): Game => ({
  game_num: n, home_team: 'A', away_team: 'B', game_time: '', competition: '', result,
});

test('toggle, usage, limits, submit', () => {
  let p = togglePick({}, 1, '1');
  p = togglePick(p, 2, '1');
  p = togglePick(p, 2, 'X');
  expect(usage(p)).toEqual({ filled: 2, doubles: 1, triples: 0 });
  expect(canSubmit(p, [g(1), g(2)], 1, 0)).toBe(true);
  expect(canSubmit(p, [g(1), g(2)], 0, 0)).toBe(false);
  expect(canSubmit(p, [g(1), g(2), g(3)], 5, 5)).toBe(false);
  expect(togglePick(p, 1, '1')[1]).toEqual([]);
});

test('score counts only graded games', () => {
  const p = { 1: ['1'], 2: ['X', '2'], 3: ['1'] } as const;
  expect(score(p as never, [g(1, '1'), g(2, '1'), g(3)])).toEqual({ hits: 1, graded: 2 });
});

test('votes + roundtrip', () => {
  const bets = [fromPicks({ 1: ['1'] }), fromPicks({ 1: ['1', 'X'] })];
  expect(votes(bets, [g(1)])[1]).toEqual({ '1': 2, X: 1, '2': 0, voters: 2 });
  expect(toPicks(bets[1])).toEqual({ 1: ['1', 'X'] });
});
