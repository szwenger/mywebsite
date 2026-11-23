/** Colour conversion (HEX, RGB, HSL, OKLCH) and the WCAG contrast ratio. */
export interface Rgb { r: number; g: number; b: number; a: number }

export function parseColor(src: string): Rgb | null {
  const s = src.trim().toLowerCase();
  let m = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (m) {
    const h = m[1].length < 6 ? [...m[1]].map((c) => c + c).join('') : m[1];
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? Math.round((n(6) / 255) * 100) / 100 : 1 };
  }
  m = /^(rgba?|hsla?)\(\s*([^)]+)\)$/.exec(s);
  if (!m) return null;
  const v = m[2].split(/[\s,/]+/).filter(Boolean).map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x)));
  const pct = m[2].split(/[\s,/]+/).filter(Boolean).map((x) => x.endsWith('%'));
  if (v.length < 3 || v.length > 4 || v.some(Number.isNaN)) return null;
  const a = v[3] === undefined ? 1 : Math.min(1, Math.max(0, v[3]));
  if (m[1].startsWith('rgb')) {
    const c = v.slice(0, 3).map((x, i) => Math.round(Math.min(255, Math.max(0, pct[i] ? x * 255 : x))));
    return { r: c[0], g: c[1], b: c[2], a };
  }
  const [r, g, b] = hslToRgb(((v[0] % 360) + 360) % 360, Math.min(1, pct[1] ? v[1] : v[1] / 100), Math.min(1, pct[2] ? v[2] : v[2] / 100));
  return { r, g, b, a };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round((l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255);
  return [f(0), f(8), f(4)];
}

export function toHex(c: Rgb): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${c.a < 1 ? h(Math.round(c.a * 255)) : ''}`;
}

export function toHsl(c: Rgb): { h: number; s: number; l: number } {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (!d) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: Math.round(((h * 60) + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const lin = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };

export function toOklch(c: Rgb): { l: number; c: number; h: number } {
  const [r, g, b] = [lin(c.r), lin(c.g), lin(c.b)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  return { l: L, c: C, h: C < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

export const luminance = (c: Rgb): number => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

/** WCAG 2 contrast ratio, 1 to 21. Transparency is ignored. */
export function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export const grades = (ratio: number) => ({ aaNormal: ratio >= 4.5, aaLarge: ratio >= 3, aaaNormal: ratio >= 7, aaaLarge: ratio >= 4.5 });

export function formats(c: Rgb): Record<string, string> {
  const hsl = toHsl(c), ok = toOklch(c), alpha = c.a < 1 ? ` / ${c.a}` : '';
  return {
    HEX: toHex(c),
    RGB: `rgb(${c.r} ${c.g} ${c.b}${alpha})`,
    HSL: `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%${alpha})`,
    OKLCH: `oklch(${(ok.l * 100).toFixed(1)}% ${ok.c.toFixed(3)} ${ok.h.toFixed(1)}${alpha})`,
  };
}

// ---- gradients, harmonies, shade scales and colour-blindness simulation ----
const gamma = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const byte = (v: number): number => Math.round(Math.min(1, Math.max(0, gamma(Math.min(1, Math.max(0, v))))) * 255);

function toOklab(c: Rgb): [number, number, number] {
  const [r, g, b] = [lin(c.r), lin(c.g), lin(c.b)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** OKLab to linear sRGB, not yet clamped: a value outside 0..1 means the colour is outside the sRGB gamut. */
function oklabToLinear(L: number, A: number, B: number): [number, number, number] {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

const fromLinear = ([r, g, b]: number[]): Rgb => ({ r: byte(r), g: byte(g), b: byte(b), a: 1 });

/** n colours (at least both ends) blended in OKLab, which keeps the middle of a gradient from turning muddy the way plain sRGB blending does. */
export function gradient(a: Rgb, b: Rgb, n: number): Rgb[] {
  const steps = Math.max(2, Math.round(n));
  const [A, B] = [toOklab(a), toOklab(b)];
  return Array.from({ length: steps }, (_, i) => {
    if (i === 0) return { ...a, a: 1 };
    if (i === steps - 1) return { ...b, a: 1 };
    const t = i / (steps - 1);
    return fromLinear(oklabToLinear(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t));
  });
}

export const SCHEMES = ['complementary', 'analogous', 'triadic', 'split', 'tetradic'] as const;
export type Scheme = (typeof SCHEMES)[number];
const TURNS: Record<Scheme, number[]> = { complementary: [0, 180], analogous: [-30, 0, 30], triadic: [0, 120, 240], split: [0, 150, 210], tetradic: [0, 90, 180, 270] };

/** Colours whose hue is turned by the scheme's angles; saturation and lightness stay. The base colour itself comes back untouched. */
export function harmony(c: Rgb, scheme: Scheme): Rgb[] {
  const { h, s, l } = toHsl(c);
  return TURNS[scheme].map((turn) => {
    if (turn === 0) return { ...c, a: 1 };
    const [r, g, b] = hslToRgb((((h + turn) % 360) + 360) % 360, s / 100, l / 100);
    return { r, g, b, a: 1 };
  });
}

/** Eleven steps (50, 100 … 900, 950) from near-white to near-black at the colour's own hue, with the chroma pulled back wherever sRGB cannot show it. */
export function shades(c: Rgb, n = 11): Rgb[] {
  const [, A, B] = toOklab(c);
  const chroma = Math.hypot(A, B), hue = Math.atan2(B, A);
  return Array.from({ length: n }, (_, i) => {
    const L = 0.97 - (0.97 - 0.24) * (i / (n - 1));
    for (let k = 1; ; k -= 0.02) {
      const cc = chroma * Math.max(k, 0);
      const lin3 = oklabToLinear(L, cc * Math.cos(hue), cc * Math.sin(hue));
      if (k <= 0 || lin3.every((v) => v >= -0.0005 && v <= 1.0005)) return fromLinear(lin3);
    }
  });
}

export const KINDS = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const;
export type Kind = (typeof KINDS)[number];
// Machado, Oliveira and Fernandes (2009), full severity, applied to linear RGB.
const MATRIX: Record<Exclude<Kind, 'achromatopsia'>, number[][]> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

/** How a person with that kind of colour vision sees the colour. Greys are left exactly as they are. */
export function simulate(c: Rgb, kind: Kind): Rgb {
  const v = [lin(c.r), lin(c.g), lin(c.b)];
  if (kind === 'achromatopsia') { const g = byte(luminance(c)); return { r: g, g, b: g, a: c.a }; }
  const out = MATRIX[kind].map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
  const grey = c.r === c.g && c.g === c.b;
  return grey ? { ...c } : { r: byte(out[0]), g: byte(out[1]), b: byte(out[2]), a: c.a };
}
