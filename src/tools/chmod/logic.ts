/** Mode as a number: 0o755, including setuid (4000), setgid (2000) and sticky (1000). */
export const symbolic = (mode: number): string => {
  const c = 'rwx';
  const out = [0, 1, 2].map((g) => [0, 1, 2].map((b) => (mode & (1 << (8 - g * 3 - b)) ? c[b] : '-')));
  // s/t replace x; capital S/T mean the special bit is set without execute.
  for (const [g, bit, ch] of [[0, 0o4000, 's'], [1, 0o2000, 's'], [2, 0o1000, 't']] as const) {
    if (mode & bit) out[g][2] = out[g][2] === 'x' ? ch : ch.toUpperCase();
  }
  return out.map((g) => g.join('')).join('');
};

/** Reads "755", "0644", "4755" or "rwxr-xr-x" (also rwsr-xr-x, rwxr-xr-t). Returns null when it is neither. */
export function parseMode(input: string): number | null {
  const t = input.trim().replace(/^[-dlcbps]?(?=[rwxsStT-]{9}$)/, '');
  if (/^[0-7]{3,4}$/.test(t)) return parseInt(t, 8);
  const m = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/.exec(t);
  if (!m) return null;
  let mode = 0;
  for (let i = 0; i < 9; i++) {
    const ch = m[i + 1];
    if (ch !== '-') mode |= 1 << (8 - i);
    if (ch === 's' || ch === 'S' || ch === 't' || ch === 'T') {
      mode &= ~(1 << (8 - i)) | (ch === 's' || ch === 't' ? 1 << (8 - i) : 0); // lowercase keeps x, uppercase has none
      mode |= i === 2 ? 0o4000 : i === 5 ? 0o2000 : 0o1000;
    }
  }
  return mode;
}

/** Octal text, three digits, or four when a special bit is set. */
export const octal = (mode: number): string => (mode > 0o777 ? mode.toString(8).padStart(4, '0') : mode.toString(8).padStart(3, '0'));

/** "u=rwx,g=rx,o=rx" for chmod's symbolic form. */
export function chmodWords(mode: number): string {
  const part = (who: string, v: number, extra: string) => `${who}=${(v & 4 ? 'r' : '') + (v & 2 ? 'w' : '') + (v & 1 ? 'x' : '') + extra}`;
  return [part('u', (mode >> 6) & 7, mode & 0o4000 ? 's' : ''), part('g', (mode >> 3) & 7, mode & 0o2000 ? 's' : ''), part('o', mode & 7, mode & 0o1000 ? 't' : '')].join(',');
}
