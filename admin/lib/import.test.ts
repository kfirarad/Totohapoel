import { expect, test } from 'bun:test';
import { parseCsv, parsePaste } from './import';
import { isoToZoned, zonedToIso } from './time';

test('zoned time round-trips across DST (Stockholm summer/winter, Jerusalem)', () => {
  expect(zonedToIso('2026-07-04T15:00', 'Europe/Stockholm')).toBe('2026-07-04T13:00:00.000Z');
  expect(zonedToIso('2026-11-07T15:00', 'Europe/Stockholm')).toBe('2026-11-07T14:00:00.000Z');
  expect(zonedToIso('2026-11-07T14:54:00.000', 'Asia/Jerusalem')).toBe('2026-11-07T12:54:00.000Z');
  expect(isoToZoned('2026-07-04T13:00:00.000Z', 'Europe/Stockholm')).toBe('2026-07-04T15:00');
});

test('CSV with header, numbers and TSV', () => {
  const d = parseCsv('#,home,away,league,kickoff\n1,Arsenal,Chelsea,Premier League,2026-11-14 16:00\n2,AIK,Malmö,Allsvenskan,2026-11-14 18:30', 'Europe/Stockholm');
  expect(d.games).toHaveLength(2);
  expect(d.games[1]).toMatchObject({ game_num: 2, home_team: 'AIK', away_team: 'Malmö', game_time: '2026-11-14T17:30:00.000Z' });
  const tsv = parseCsv('Real Madrid\tBarcelona\tLaLiga\t2026-11-15 21:00', 'Europe/Madrid');
  expect(tsv.games[0]).toMatchObject({ game_num: 1, competition: 'LaLiga', game_time: '2026-11-15T20:00:00.000Z' });
});

test('CSV errors are explicit', () => {
  expect(() => parseCsv('Arsenal', 'UTC')).toThrow('home and away');
  expect(() => parseCsv('A,B,L,tomorrow', 'UTC')).toThrow('YYYY-MM-DD');
  expect(() => parseCsv('\n\n', 'UTC')).toThrow('No games');
});

test('Winner JSON paste becomes a draft with draw number', () => {
  const draw = { gameType: 96, drawNumber: 260145, closeDateTime: '2026-11-14T13:00:00.000',
    rows: [{ rowNumber: 1, eventStartTime: '2026-11-14T15:00:00.000', league: 'ליגת העל', teamA: 'מכבי', teamB: 'הפועל' }] };
  const d = parsePaste(JSON.stringify({ games: [draw] }), 'Asia/Jerusalem');
  expect(d).toMatchObject({ source: 'winner', external_id: '260145', deadline: '2026-11-14T11:00:00.000Z' });
  expect(d.games[0]).toMatchObject({ home_team: 'מכבי', result: null });
});
