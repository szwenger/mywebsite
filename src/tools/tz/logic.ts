/** UTC offset (minutes) of a zone at an instant, read back from Intl so it follows daylight saving. */
export function zoneOffsetMin(ms: number, zone: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    .formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]));
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 60000);
}

/** The instant (ms since epoch) at which the wall clock in `zone` reads `date` + `time`. NaN for bad input. */
export function wallToInstant(date: string, time: string, zone: string): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date), t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return NaN;
  const wall = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  // Offset at the guess, then again at the corrected instant: right except inside the skipped hour of a spring change.
  let at = wall - zoneOffsetMin(wall, zone) * 60000;
  at = wall - zoneOffsetMin(at, zone) * 60000;
  return at;
}

export const discord = (ms: number, style: string): string => `<t:${Math.floor(ms / 1000)}:${style}>`;

/** Reads `?t=<unix seconds>` from a query string. NaN when missing or not a number. */
export function parseStamp(search: string): number {
  const v = new URLSearchParams(search).get('t');
  return v && /^\d{1,12}$/.test(v) ? Number(v) * 1000 : NaN;
}
