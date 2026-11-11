// Wall-clock time in an IANA zone <-> ISO instant (DST-aware, no library).

const offsetMinutes = (instant: Date, timeZone: string) => {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
};

/** "2026-11-07T14:54" (or with seconds) in `timeZone` → ISO instant. */
export const zonedToIso = (local: string, timeZone: string) => {
  const wall = local.replace(/Z$/, '').slice(0, 19);
  const asUtc = new Date(`${wall.length === 16 ? `${wall}:00` : wall}Z`);
  // two passes so times next to a DST switch land on the right offset
  let t = asUtc.getTime() - offsetMinutes(asUtc, timeZone) * 60_000;
  t = asUtc.getTime() - offsetMinutes(new Date(t), timeZone) * 60_000;
  return new Date(t).toISOString();
};

/** ISO instant → "YYYY-MM-DDTHH:mm" wall clock in `timeZone` (for <input type="datetime-local">). */
export const isoToZoned = (iso: string, timeZone: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const local = new Date(d.getTime() + offsetMinutes(d, timeZone) * 60_000);
  return local.toISOString().slice(0, 16);
};
