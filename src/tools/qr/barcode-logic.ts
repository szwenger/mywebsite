export type Kind = 'code128' | 'ean13' | 'ean8' | 'upca';

// Code 128: bar/space widths per symbol (six digits, 11 modules); STOP has seven digits (13 modules).
const C128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
  '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
  '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
  '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
  '114131 311141 411131 211412 211214 211232 2331112').split(' ');
export const WIDTHS = C128;

const START_B = 104, START_C = 105, CODE_B = 100, CODE_C = 99, STOP = 106;

const runs = (widths: string): string => [...widths].map((w, i) => (i % 2 ? '0' : '1').repeat(Number(w))).join('');

/** Code 128 symbol values for printable ASCII (32–126). Digit pairs switch to subset C, which halves the width of long numbers.
 *  Throws Error('chars') for anything else, Error('empty') for no text. */
export function code128Values(text: string): number[] {
  if (!text) throw new Error('empty');
  if (!/^[\x20-\x7e]+$/.test(text)) throw new Error('chars');
  const out: number[] = [];
  let mode: 'B' | 'C' | null = null;
  for (let i = 0; i < text.length;) {
    const run = /^\d*/.exec(text.slice(i))![0].length;
    // Subset C packs two digits per symbol: worth it from 4 digits on, or for an all-digit text of even length.
    if (run >= 4 || (run >= 2 && run === text.length && run % 2 === 0)) {
      if (mode !== 'C') { out.push(mode === null ? START_C : CODE_C); mode = 'C'; }
      const n = run - (run % 2); // an odd last digit goes to subset B
      for (let k = 0; k < n; k += 2) out.push(Number(text.slice(i + k, i + k + 2)));
      i += n;
    } else {
      if (mode !== 'B') { out.push(mode === null ? START_B : CODE_B); mode = 'B'; }
      out.push(text.charCodeAt(i) - 32);
      i++;
    }
  }
  return out;
}

/** Full module string ('1' bar, '0' space) for Code 128, with checksum and stop (the STOP row already ends in its 2-wide bar). */
export function code128(text: string): string {
  const v = code128Values(text);
  const sum = v.reduce((acc, x, i) => acc + x * (i === 0 ? 1 : i), 0) % 103;
  return [...v, sum, STOP].map((x) => runs(C128[x])).join('');
}

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const R = L.map((x) => [...x].map((b) => (b === '1' ? '0' : '1')).join(''));
const G = R.map((x) => [...x].reverse().join(''));
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** GS1 check digit for a number without its last digit (EAN-13, EAN-8, UPC-A): weights 3,1,3,1… counted from the right. */
export function checkDigit(body: string): number {
  const sum = [...body].reverse().reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

/** Accepts the digits with or without the check digit. Returns the full number. Throws Error('digits'|'length'|'check'). */
export function withCheck(text: string, len: number): string {
  const t = text.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(t)) throw new Error('digits');
  if (t.length === len - 1) return t + checkDigit(t);
  if (t.length !== len) throw new Error('length');
  if (checkDigit(t.slice(0, -1)) !== Number(t.at(-1))) throw new Error('check');
  return t;
}

export function ean13(num: string): string {
  const n = withCheck(num, 13);
  const p = PARITY[Number(n[0])];
  const left = [...n.slice(1, 7)].map((d, i) => (p[i] === 'L' ? L : G)[Number(d)]).join('');
  const right = [...n.slice(7)].map((d) => R[Number(d)]).join('');
  return `101${left}01010${right}101`;
}
export function ean8(num: string): string {
  const n = withCheck(num, 8);
  return `101${[...n.slice(0, 4)].map((d) => L[Number(d)]).join('')}01010${[...n.slice(4)].map((d) => R[Number(d)]).join('')}101`;
}
/** UPC-A is EAN-13 with a leading zero. */
export const upca = (num: string): string => ean13('0' + withCheck(num, 12));

/** The number as printed under the bars (UPC-A keeps its 12 digits). */
export function label(kind: Kind, text: string): string {
  if (kind === 'ean13') return withCheck(text, 13);
  if (kind === 'ean8') return withCheck(text, 8);
  if (kind === 'upca') return withCheck(text, 12);
  return text;
}

export function encode(kind: Kind, text: string): string {
  return kind === 'code128' ? code128(text) : kind === 'ean13' ? ean13(text) : kind === 'ean8' ? ean8(text) : upca(text);
}

/** SVG text for a module string. `module` is the width of one module in px, quiet zone 10 modules each side. */
export function toSvg(modules: string, text: string, opts: { module?: number; height?: number } = {}): string {
  const m = opts.module ?? 2;
  const h = opts.height ?? 90;
  const quiet = 10 * m;
  const w = modules.length * m + quiet * 2;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let path = '';
  for (let i = 0; i < modules.length;) {
    if (modules[i] !== '1') { i++; continue; }
    let j = i;
    while (modules[j] === '1') j++;
    path += `M${quiet + i * m} 0h${(j - i) * m}v${h}h-${(j - i) * m}z`;
    i = j;
  }
  const total = h + 22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${total}" viewBox="0 0 ${w} ${total}"><rect width="${w}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/>` +
    `<text x="${w / 2}" y="${h + 17}" text-anchor="middle" font-family="monospace" font-size="14" fill="#000">${esc(text)}</text></svg>`;
}
