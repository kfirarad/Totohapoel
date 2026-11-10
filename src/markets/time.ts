/** Offset of `timeZone` from UTC at `instant`, in minutes (e.g. +120 for UTC+2) */
export const timeZoneOffset = (instant: Date, timeZone: string) => {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT+02:00", or "GMT" for UTC
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
};

/**
 * Wall-clock time in `timeZone` with no offset ("2026-11-07T14:54:00.000") -> ISO instant, DST-aware.
 * The offset is looked up twice so times just after a DST switch resolve with the right side's offset.
 */
export const zonedLocalToIso = (local: string, timeZone: string) => {
  const asUtc = new Date(`${local.replace(/Z$/, "")}Z`).getTime();
  const guess = asUtc - timeZoneOffset(new Date(asUtc), timeZone) * 60_000;
  return new Date(asUtc - timeZoneOffset(new Date(guess), timeZone) * 60_000).toISOString();
};
