/** Cron expressions (five fields, plus @daily-style aliases): parse, expand and list the next runs. */
export interface Cron { min: number[]; hour: number[]; dom: number[]; mon: number[]; dow: number[]; domAny: boolean; dowAny: boolean }

const ALIAS: Record<string, string> = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
const DAYS = 'sun mon tue wed thu fri sat'.split(' ');

function field(src: string, lo: number, hi: number, names?: string[]): number[] {
  const out = new Set<number>();
  const num = (x: string): number => {
    const i = names?.indexOf(x.toLowerCase()) ?? -1;
    const n = i >= 0 ? i + (names === MONTHS ? 1 : 0) : /^\d+$/.test(x) ? +x : NaN;
    if (!(n >= lo && n <= hi)) throw new Error(x);
    return n;
  };
  for (const part of src.split(',')) {
    const [range, step, extra] = part.split('/');
    if (extra !== undefined || (step !== undefined && !/^[1-9]\d*$/.test(step))) throw new Error(part);
    let a = lo, b = hi;
    if (range !== '*') {
      const [x, y, z] = range.split('-');
      if (z !== undefined) throw new Error(part);
      a = num(x);
      b = y === undefined ? (step === undefined ? a : hi) : num(y);
      if (b < a) throw new Error(part);
    }
    for (let i = a; i <= b; i += step === undefined ? 1 : +step) out.add(i);
  }
  return [...out].sort((p, q) => p - q);
}

/** Throws Error(<the offending text>) when the expression is not valid. */
export function parseCron(expr: string): Cron {
  const f = (ALIAS[expr.trim().toLowerCase()] ?? expr).trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`${f.length} fields`);
  const dow = [...new Set(field(f[4], 0, 7, DAYS).map((d) => d % 7))].sort((p, q) => p - q);
  return { min: field(f[0], 0, 59), hour: field(f[1], 0, 23), dom: field(f[2], 1, 31), mon: field(f[3], 1, 12, MONTHS), dow, domAny: f[2].startsWith('*'), dowAny: f[4].startsWith('*') };
}

/** The next `count` run times after `from`. Looks at most eight years ahead (enough for a 29 February). */
export function nextRuns(c: Cron, from: Date, count: number, utc: boolean): Date[] {
  const out: Date[] = [];
  const start = Math.floor(from.getTime() / 60000) * 60000 + 60000;
  const p = new Date(start);
  const d0 = utc ? Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate()) : Date.UTC(p.getFullYear(), p.getMonth(), p.getDate());
  for (let i = 0; i < 366 * 8 && out.length < count; i++) {
    const day = new Date(d0 + i * 86400000); // a calendar date only: its UTC fields are the date we want
    const y = day.getUTCFullYear(), mo = day.getUTCMonth(), d = day.getUTCDate(), wd = day.getUTCDay();
    if (!c.mon.includes(mo + 1)) continue;
    const domOk = c.dom.includes(d), dowOk = c.dow.includes(wd);
    const ok = c.domAny && c.dowAny ? true : c.domAny ? dowOk : c.dowAny ? domOk : domOk || dowOk;
    if (!ok) continue;
    for (const h of c.hour) for (const m of c.min) {
      const t = utc ? new Date(Date.UTC(y, mo, d, h, m)) : new Date(y, mo, d, h, m); // ponytail: a local time inside a DST gap runs an hour later
      if (t.getTime() >= start && out.length < count) out.push(t);
    }
  }
  return out;
}
