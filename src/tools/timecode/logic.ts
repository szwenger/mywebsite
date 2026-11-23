// SMPTE timecode arithmetic. A timecode counts frames at the nominal rate (24, 25, 30, 60 per "second"). 23.976, 29.97 and 59.94
// really run 1000/1001 slower, so their timecode drifts from the wall clock; drop frame fixes 29.97 and 59.94 by skipping frame
// *numbers* (never frames): 2 (or 4) numbers at the start of every minute except each tenth.
export interface Rate { id: string; num: number; den: number; base: number; drop: number; dropOk: boolean }
export interface Tc { h: number; m: number; s: number; f: number }

const r = (id: string, num: number, den: number, base: number, dropOk = false): Rate => ({ id, num, den, base, drop: 0, dropOk });
export const RATES: Rate[] = [r('23.976', 24000, 1001, 24), r('24', 24, 1, 24), r('25', 25, 1, 25), r('29.97', 30000, 1001, 30, true), r('30', 30, 1, 30), r('50', 50, 1, 50), r('59.94', 60000, 1001, 60, true), r('60', 60, 1, 60)];

/** A frame rate by id; `dropFrame` is only honoured for 29.97 and 59.94. Unknown ids give 25. */
export function rate(id: string, dropFrame = false): Rate {
  const base = RATES.find((x) => x.id === id) ?? RATES[2];
  return { ...base, drop: dropFrame && base.dropOk ? base.base / 15 : 0 };
}

const perMinute = (x: Rate) => x.base * 60 - x.drop;
const perTenMinutes = (x: Rate) => x.base * 600 - x.drop * 9;

export function toFrames(t: Tc, x: Rate): number {
  const minutes = t.h * 60 + t.m;
  return ((t.h * 60 + t.m) * 60 + t.s) * x.base + t.f - x.drop * (minutes - Math.floor(minutes / 10));
}

export function toTimecode(frames: number, x: Rate): string {
  const neg = frames < 0;
  let n = Math.abs(Math.round(frames));
  if (x.drop) {
    const tens = Math.floor(n / perTenMinutes(x)), rest = n % perTenMinutes(x);
    n += 9 * x.drop * tens + (rest > x.drop ? x.drop * Math.floor((rest - x.drop) / perMinute(x)) : 0);
  }
  const f = n % x.base, s = Math.floor(n / x.base) % 60, m = Math.floor(n / (x.base * 60)) % 60, h = Math.floor(n / (x.base * 3600));
  const p = (v: number) => String(v).padStart(2, '0');
  return `${neg ? '-' : ''}${p(h)}:${p(m)}:${p(s)}${x.drop ? ';' : ':'}${p(f)}`;
}

/** "01:02:03:04", "01;02;03;04", "1.2.3.4" or "01020304" → its parts; null when it cannot exist at this rate (frame too high, or a dropped number). */
export function parseTimecode(text: string, x: Rate): Tc | null {
  const t = text.trim();
  let parts = t.split(/[:;.,\s]+/);
  if (parts.length === 1 && /^\d{8}$/.test(t)) parts = t.match(/\d\d/g)!;
  if (parts.length !== 4 || !parts.every((v) => /^\d{1,3}$/.test(v))) return null;
  const [h, m, s, f] = parts.map(Number);
  if (m > 59 || s > 59 || f >= x.base) return null;
  if (x.drop && s === 0 && f < x.drop && m % 10 !== 0) return null;
  return { h, m, s, f };
}

/** a + sign·b as a timecode string (sign 1 or −1); null when either input is not a valid timecode. Negative results get a leading minus. */
export function addTimecodes(a: string, b: string, sign: 1 | -1, x: Rate): string | null {
  const ta = parseTimecode(a, x), tb = parseTimecode(b, x);
  return ta && tb ? toTimecode(toFrames(ta, x) + sign * toFrames(tb, x), x) : null;
}

/** Real elapsed seconds of a frame count: the true rate, so 29.97 runs 0.1 % slower than 30. */
export const seconds = (frames: number, x: Rate): number => (frames * x.den) / x.num;
export const fromSeconds = (sec: number, x: Rate): number => Math.round((sec * x.num) / x.den);
