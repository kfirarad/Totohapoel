// Winner (winner.co.il) Toto draws -> our column shape.
// Their API sits behind bot protection, so data reaches us from the admin's browser
// (bookmarklet or clipboard), never from a server.

import i18n from "@/i18n";
import { zonedLocalToIso } from "../time";
import { ilConfig } from "./config";

export const TOTO_GAME_TYPE = 96;

export type WinnerRow = {
  rowNumber: number;
  eventStartTime: string; // Israel local time, no offset
  league: string;
  teamA: string;
  teamB: string;
  betRadarId?: string;
};

export type WinnerDraw = {
  gameType: number;
  drawNumber: number;
  closeDateTime: string; // Israel local time, no offset
  rows: WinnerRow[];
};

/** Accepts the full GetTotoDraws response or a single draw; returns the Toto 16 draw */
export const pickTotoDraw = (data: unknown): WinnerDraw | null => {
  const d = data as { games?: WinnerDraw[] } & Partial<WinnerDraw>;
  if (Array.isArray(d?.games)) return d.games.find((g) => g.gameType === TOTO_GAME_TYPE) ?? null;
  if (Array.isArray(d?.rows) && d.closeDateTime) return d as WinnerDraw;
  return null;
};

/** "2026-11-07T14:54:00.000" in Israel -> ISO instant, DST-aware */
export const israelTimeToIso = (local: string) => zonedLocalToIso(local, ilConfig.timeZone);

export const drawToColumn = (draw: WinnerDraw) => {
  const deadline = israelTimeToIso(draw.closeDateTime);
  const [y, mo, d] = draw.closeDateTime.slice(0, 10).split("-").map(Number);
  return {
    // stored on the column, so always in the market's language, whatever the admin's UI language
    name: i18n.getFixedT(ilConfig.defaultLocale, "glossary")("columnName", { day: d, month: mo, year: String(y).slice(2) }),
    deadline,
    games: draw.rows.map((row) => ({
      game_num: row.rowNumber,
      home_team: row.teamA,
      away_team: row.teamB,
      competition: row.league,
      game_time: israelTimeToIso(row.eventStartTime),
      result: null,
      live_tracker_id: null,
      bet_radar_id: row.betRadarId ?? null,
    })),
  };
};

// URL-hash transport for the bookmarklet (UTF-8 safe base64)
export const encodeDraw = (draw: WinnerDraw) => btoa(unescape(encodeURIComponent(JSON.stringify(draw))));
export const decodeDraw = (encoded: string): WinnerDraw | null => {
  try {
    return pickTotoDraw(JSON.parse(decodeURIComponent(escape(atob(encoded)))));
  } catch {
    return null;
  }
};

/** Runs on winner.co.il (same origin, so it passes their bot protection) and opens our form prefilled */
export const winnerBookmarklet = (appOrigin: string) =>
  `javascript:(async()=>{try{` +
  // the API rejects calls without the headers the site itself sends (random 32-hex ids are accepted)
  `const hex=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');` +
  // reuse the device id the site registered for this browser (a random one is rejected with 500)
  `const findDev=()=>{for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const k=st.key(i);if(/device/i.test(k)){const m=(st.getItem(k)||'').match(/[0-9a-f]{32}/i);if(m)return m[0]}}const c=document.cookie.match(/device[^=]*=([0-9a-f]{32})/i);return c&&c[1]};` +
  `const dev=findDev();` +
  `const r=await fetch('/api/v2/publicapi/GetTotoDraws',{method:'POST',credentials:'include',headers:{` +
  `'accept':'application/json','content-type':'application/json','appversion':'2.7.0','x-csrf-token':'null',` +
  `'deviceid':dev||hex(),'requestid':hex(),` +
  `'useragentdata':JSON.stringify({devicemodel:'Macintosh',deviceos:'mac os',deviceosversion:'10.15.7',appversion:'2.7.0',apptype:'desktop',originId:'3',isAccessibility:false})` +
  `},body:JSON.stringify({IsForced:false})});` +
  `const t=await r.text();let d;try{d=JSON.parse(t)}catch(_){alert('ווינר החזירו תשובה לא צפויה ('+r.status+(dev?'':', לא נמצא מזהה מכשיר')+'): '+t.slice(0,200));return}` +
  `const g=(d.games||[]).find(x=>x.gameType===${TOTO_GAME_TYPE});` +
  `if(!g){alert('לא נמצא טוטו 16 פתוח באתר ווינר');return}` +
  `window.open('${appOrigin}/admin/columns/new#winner='+btoa(unescape(encodeURIComponent(JSON.stringify(g)))),'_blank')` +
  `}catch(e){alert('הייבוא נכשל ('+e.message+'). ודא שאתה בעמוד של winner.co.il')}})()`;

/** Accepts a bare ScoreAxis match id (24-hex, older numeric ones too), a widget URL, or the whole embed code */
export const parseScoreAxisId = (input: string): string | null => {
  const m = input.match(/live-match\/([0-9a-f]{24}|\d+)/i) ?? input.trim().match(/^([0-9a-f]{24}|\d+)$/i);
  return m ? m[1] : null;
};
