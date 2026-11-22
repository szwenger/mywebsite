/** Random generators on crypto.getRandomValues. Nothing here uses Math.random. */
const rnd = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

/** Uniform integer in [0, max) by rejection sampling, so no value is more likely than another. */
export function randomInt(max: number): number {
  if (max <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = 2 ** 32 - (2 ** 32 % max);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % max;
}

const SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/' };
const AMBIGUOUS = /[oOlI01|`'"]/g;
export interface PasswordOpts { length: number; lower: boolean; upper: boolean; digits: boolean; symbols: boolean; ambiguous: boolean }

export function poolSets(o: PasswordOpts): string[] {
  return (['lower', 'upper', 'digits', 'symbols'] as const).filter((k) => o[k]).map((k) => (o.ambiguous ? SETS[k] : SETS[k].replace(AMBIGUOUS, ''))).filter(Boolean);
}

export function password(o: PasswordOpts): string {
  const sets = poolSets(o);
  if (!sets.length) return '';
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]); // one from each chosen set
  while (chars.length < o.length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.slice(0, Math.max(o.length, 0)).join('');
}

export const entropyBits = (pool: number, length: number): number => (pool > 1 ? length * Math.log2(pool) : 0);

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const dashed = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;

export function uuid4(): string {
  const b = rnd(16);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  return dashed(hex(b));
}

/** UUID v7: 48-bit millisecond timestamp first, so ids sort by creation time (good database keys). */
export function uuid7(now = Date.now()): string {
  const b = rnd(16);
  for (let i = 0; i < 6; i++) b[i] = Math.floor(now / 2 ** (8 * (5 - i))) & 0xff;
  b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
  return dashed(hex(b));
}

export function token(bytes: number, enc: 'hex' | 'base64' | 'base64url'): string {
  const b = rnd(bytes);
  if (enc === 'hex') return hex(b);
  const s = btoa(String.fromCharCode(...b));
  return enc === 'base64' ? s : s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
