// Turn pasted operator data into a column draft. Winner JSON (bookmarklet/clipboard) or CSV/TSV rows.
import { drawToColumn, pickTotoDraw } from '../../src/lib/winner';
import { zonedToIso } from './time';

export type DraftGame = {
  game_num: number; home_team: string; away_team: string; competition: string; game_time: string;
  result: '1' | 'X' | '2' | null; [k: string]: unknown;
};
export type Draft = { name?: string; deadline?: string; external_id?: string; source: string; games: DraftGame[] };

/**
 * CSV/TSV, one game per line: `home, away, competition, kickoff` (kickoff "YYYY-MM-DD HH:mm" in the toto type's zone).
 * An optional leading game number column is detected. Header lines and blank lines are skipped.
 */
export function parseCsv(text: string, timeZone: string): Draft {
  const games: DraftGame[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(line.includes('\t') ? '\t' : /[,;]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (/^(#|no|game|home)/i.test(cells[0])) continue;
    const numbered = /^\d+$/.test(cells[0]);
    const [home, away, competition = '', kickoff = ''] = numbered ? cells.slice(1) : cells;
    if (!home || !away) throw new Error(`Line needs home and away: "${line}"`);
    const when = kickoff.replace(' ', 'T');
    if (when && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when)) throw new Error(`Kickoff must be "YYYY-MM-DD HH:mm": "${kickoff}"`);
    games.push({
      game_num: numbered ? Number(cells[0]) : games.length + 1,
      home_team: home, away_team: away, competition,
      game_time: when ? zonedToIso(when, timeZone) : '',
      result: null,
    });
  }
  if (!games.length) throw new Error('No games found');
  return { source: 'csv', games };
}

/** Winner GetTotoDraws response (or one draw), as the bookmarklet/clipboard delivers it. */
export function parseWinner(json: unknown): Draft | null {
  const draw = pickTotoDraw(json);
  if (!draw) return null;
  const col = drawToColumn(draw);
  return {
    name: col.name, deadline: col.deadline, external_id: String(draw.drawNumber), source: 'winner',
    games: col.games.map((g) => ({ ...g, result: null })),
  };
}

/** Whatever was pasted: JSON → Winner, else CSV. */
export function parsePaste(text: string, timeZone: string): Draft {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    const draft = parseWinner(JSON.parse(t));
    if (!draft) throw new Error('JSON is not a Winner Toto draw');
    return draft;
  }
  return parseCsv(t, timeZone);
}
