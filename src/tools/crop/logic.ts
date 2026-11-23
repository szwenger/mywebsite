export interface Rect { x: number; y: number; w: number; h: number }
export const PRESETS = ['1:1', '4:3', '3:2', '16:9', '21:9', '3:4', '2:3', '4:5', '9:16'] as const;

/** "16:9", "16/9", "1.5" or "1,5" to width ÷ height; null when it is not a positive number. */
export function parseRatio(text: string): number | null {
  const t = text.trim().replace(',', '.');
  const m = /^(\d+(?:\.\d+)?)\s*[:/x×]\s*(\d+(?:\.\d+)?)$/i.exec(t);
  const r = m ? Number(m[1]) / Number(m[2]) : /^\d+(?:\.\d+)?$/.test(t) ? Number(t) : NaN;
  return r > 0 && Number.isFinite(r) ? r : null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The largest rectangle of the given ratio that fits the image, shrunk by `zoom` (≥ 1) and centred on (cx, cy) as image fractions,
 *  then pushed back inside the image. A null ratio keeps the image's own. Sides are whole pixels ≥ 1. */
export function cropRect(iw: number, ih: number, ratio: number | null, zoom = 1, cx = 0.5, cy = 0.5): Rect {
  const r = ratio ?? iw / ih;
  let w = iw, h = iw / r;
  if (h > ih) { h = ih; w = ih * r; }
  const z = Math.max(1, zoom);
  w = Math.min(iw, Math.max(1, Math.round(w / z)));
  h = Math.min(ih, Math.max(1, Math.round(h / z)));
  return { x: Math.round(clamp(cx * iw - w / 2, 0, iw - w)), y: Math.round(clamp(cy * ih - h / 2, 0, ih - h)), w, h };
}

/** Output size: the crop itself, or scaled to a chosen width (never above `maxSide` on the long side). */
export function outSize(rect: Rect, width?: number, maxSide = 8192): { w: number; h: number } {
  let w = width && width >= 1 ? Math.round(width) : rect.w;
  let h = Math.max(1, Math.round((w * rect.h) / rect.w));
  const over = Math.max(w, h) / maxSide;
  if (over > 1) { w = Math.max(1, Math.round(w / over)); h = Math.max(1, Math.round(h / over)); }
  return { w, h };
}

/** Width and height after turning the image by a quarter-turn multiple. */
export const turned = (w: number, h: number, deg: number): { w: number; h: number } => (deg % 180 ? { w: h, h: w } : { w, h });

/** The box around everything that is not border. The border is taken from the top-left pixel: transparent, or a solid colour within `tolerance` (0-255 per channel). null when the whole image is border or there is nothing to trim. */
export function trimBox(data: Uint8ClampedArray, w: number, h: number, tolerance = 8): Rect | null {
  const [r0, g0, b0, a0] = data;
  const border = (i: number): boolean => a0 <= 8
    ? data[i + 3] <= 8
    : data[i + 3] > 8 && Math.max(Math.abs(data[i] - r0), Math.abs(data[i + 1] - g0), Math.abs(data[i + 2] - b0)) <= tolerance;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (border((y * w + x) * 4)) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y;
  }
  if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === w - 1 && y1 === h - 1)) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** How far the lines of text in a grey image tilt, in degrees (positive: they descend to the right), found by the angle at which the dark pixels line up in the fewest rows. Rotate by the negative of this to straighten. */
export function detectSkew(gray: Uint8Array, w: number, h: number, maxDeg = 15): number {
  let lo = 255, hi = 0;
  for (const v of gray) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (hi - lo < 40) return 0;
  const cut = (lo + hi) / 2;
  const xs: number[] = [], ys: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (gray[y * w + x] < cut) { xs.push(x - w / 2); ys.push(y - h / 2); }
  if (xs.length < 20) return 0;
  const reach = Math.ceil(Math.hypot(w, h) / 2) + 2;
  const score = (deg: number): number => {
    const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
    const bins = new Uint32Array(reach * 2 + 1);
    for (let i = 0; i < xs.length; i++) bins[Math.round(ys[i] * c - xs[i] * s) + reach]++;
    let sum = 0;
    for (const n of bins) sum += n * n;
    return sum;
  };
  const search = (from: number, to: number, step: number): number => {
    let best = from, top = -1;
    for (let a = from; a <= to + 1e-9; a += step) { const v = score(a); if (v > top) { top = v; best = a; } }
    return best;
  };
  const coarse = search(-maxDeg, maxDeg, 0.5);
  const fine = search(coarse - 0.5, coarse + 0.5, 0.1);
  return Math.round(fine * 10) / 10;
}

/** The bounding box of a w×h image turned by any angle. */
export function rotatedSize(w: number, h: number, deg: number): { w: number; h: number } {
  const t = (deg * Math.PI) / 180, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
  return { w: Math.round(w * c + h * s), h: Math.round(w * s + h * c) };
}
