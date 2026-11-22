export type Unit = 's' | 'ms' | 'us' | 'ns';

/** Guesses the unit of a Unix timestamp from its size: seconds until 2286, then milliseconds, microseconds, nanoseconds. */
export function unitOf(n: number): Unit {
  const a = Math.abs(n);
  return a < 1e11 ? 's' : a < 1e14 ? 'ms' : a < 1e17 ? 'us' : 'ns';
}
const PER_MS: Record<Unit, number> = { s: 1 / 1000, ms: 1, us: 1000, ns: 1e6 };

/** Accepts a Unix timestamp (any unit) or a date string; returns milliseconds since 1970, or null. */
export function parseStamp(input: string, unit?: Unit): { ms: number; unit: Unit | null } | null {
  const t = input.trim();
  if (!t) return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    const u = unit ?? unitOf(n);
    const ms = n / PER_MS[u];
    return Number.isFinite(ms) && Math.abs(ms) <= 8.64e15 ? { ms, unit: u } : null;
  }
  // Date.parse reads a date-only ISO string as UTC but "2026-03-01 10:00" as local time; both are the usual expectation.
  const ms = Date.parse(t.replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2'));
  return Number.isNaN(ms) ? null : { ms, unit: null };
}

/** The same instant in every unit, as integers (nanoseconds as a decimal string, since it exceeds 2^53). */
export function stamps(ms: number): Record<Unit, string> {
  const whole = Math.floor(ms);
  return { s: String(Math.floor(ms / 1000)), ms: String(whole), us: String(whole * 1000), ns: String(BigInt(whole) * 1000000n) };
}

/** ISO 8601 in UTC, or null outside the range a Date can hold. */
export const iso = (ms: number): string | null => { const d = new Date(ms); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

/** Week number by ISO 8601 (weeks start Monday, week 1 holds the first Thursday). */
export function isoWeek(ms: number): { year: number; week: number } {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7;
  const thu = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3);
  const year = new Date(thu).getUTCFullYear();
  return { year, week: Math.floor((thu - Date.UTC(year, 0, 1)) / 864e5 / 7) + 1 };
}
