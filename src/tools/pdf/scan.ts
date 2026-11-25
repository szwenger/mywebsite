import { detectSkew, type Rect } from '../crop/logic.ts';

/** Clean-up of a photographed page: find the paper, then whiten it. All functions work on RGBA pixel data. */
export type Filter = 'scan' | 'color' | 'gray' | 'bw';
export interface Pt { x: number; y: number }
/** Corners of a page in a photo: top left, top right, bottom right, bottom left. */
export type Quad = [Pt, Pt, Pt, Pt];

/** Grey value (0-255) of every pixel. */
export function grayOf(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const g = new Uint8Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  return g;
}

/** Otsu's threshold: the grey level that best splits the picture into a dark and a bright group. */
export function otsu(gray: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (const v of gray) hist[v]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let wB = 0, sumB = 0, best = 0, top = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = gray.length - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const d = sumB / wB - (sum - sumB) / wF;
    const between = wB * wF * d * d;
    if (between > top) { top = between; best = t; }
  }
  return best;
}

/** The box around the bright page on a darker background, or null when the page already fills the picture (or nothing stands out). Axis-aligned, so straighten the picture first. */
export function paperBox(data: Uint8ClampedArray, w: number, h: number): Rect | null {
  const gray = grayOf(data, w, h);
  const t = otsu(gray);
  const rows = new Uint32Array(h), cols = new Uint32Array(w);
  let bright = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (gray[y * w + x] > t) { rows[y]++; cols[x]++; bright++; }
  if (bright < w * h * 0.15) return null;
  const span = (n: Uint32Array): [number, number] => {
    const need = Math.max(...n) * 0.4;
    let a = 0, b = n.length - 1;
    while (a < b && n[a] < need) a++;
    while (b > a && n[b] < need) b--;
    return [a, b];
  };
  const [y0, y1] = span(rows), [x0, x1] = span(cols);
  const box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  if (box.w * box.h < w * h * 0.2 || (box.w >= w * 0.97 && box.h >= h * 0.97)) return null;
  return box;
}

/** Scales (w, h) down so the long side is at most `max`. */
export function fitSide(w: number, h: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** Grey levels at the 1st and 99th percentile of the picture: black and white points for the stretch. */
function levels(gray: Uint8Array): [number, number] {
  const hist = new Uint32Array(256);
  for (const v of gray) hist[v]++;
  const find = (share: number) => { let n = 0; for (let i = 0; i < 256; i++) { n += hist[i]; if (n >= gray.length * share) return i; } return 255; };
  return [find(0.01), find(0.99)];
}

/** Changes the pixels in place: scan (shadows flattened, paper white, ink crisp, colour kept), colour (paper whitened, hue kept), grey (stretched) or black and white (shadows flattened first, so they do not turn the paper black). */
export function applyFilter(data: Uint8ClampedArray, w: number, h: number, mode: Filter): void {
  const gray = grayOf(data, w, h);
  if (mode === 'bw') {
    // Flatten the shadows like the scanner look does (without its curve), then anything clearly darker than the paper is ink.
    scannerLook(data, w, h, IDENTITY);
    for (let i = 0; i < w * h; i++) data.fill(data[i * 4 + 1] < 200 ? 0 : 255, i * 4, i * 4 + 3);
    return;
  }
  if (mode === 'scan') { scannerLook(data, w, h); return; }
  const [lo, hi] = levels(gray);
  const k = hi - lo >= 10 ? 255 / (hi - lo) : 1, base = hi - lo >= 10 ? lo : 0;
  for (let i = 0; i < w * h; i++) {
    if (mode === 'gray') { const v = (gray[i] - base) * k; data.fill(v < 0 ? 0 : v > 255 ? 255 : v, i * 4, i * 4 + 3); continue; }
    for (let c = 0; c < 3; c++) data[i * 4 + c] = (data[i * 4 + c] - base) * k;
  }
}

/** Grey picture with the surroundings of the page painted white: every dark pixel that connects to the picture's edge (the table, a shadow) goes, the ink inside the page stays. */
export function maskOutside(gray: Uint8Array, w: number, h: number, t: number): Uint8Array {
  const out = Uint8Array.from(gray);
  const stack: number[] = [];
  const push = (i: number) => { if (out[i] <= t && out[i] !== 255) { out[i] = 255; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!, x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  return out;
}

/** How far the text on a photographed page tilts, in degrees (positive: lines descend to the right), ignoring the table around the page. */
export function pageSkew(data: Uint8ClampedArray, w: number, h: number): number {
  const gray = grayOf(data, w, h);
  return detectSkew(maskOutside(gray, w, h, otsu(gray)), w, h);
}

const smooth = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
/** Pixel value after the scanner curve: paper (1.0) and near-white become 255, dark ink 0, the middle keeps its tone. */
const IDENTITY = Uint8Array.from({ length: 256 }, (_, v) => v);
const CURVE = Uint8Array.from({ length: 256 }, (_, v) => Math.round(255 * smooth((v / 255 - 0.38) / 0.52)));

/**
 * What a flatbed scanner does: estimate the paper colour under every spot (a high percentile of small blocks, so ink does not count),
 * divide it out so shadows and colour casts vanish, then push the near-white to white and the dark to black.
 */
function scannerLook(data: Uint8ClampedArray, w: number, h: number, curve: Uint8Array = CURVE): void {
  const B = Math.max(6, Math.round(Math.min(w, h) / 40));
  const gx = Math.ceil(w / B), gy = Math.ceil(h / B);
  const hist = new Uint32Array(256);
  for (let c = 0; c < 3; c++) {
    let grid = new Float32Array(gx * gy);
    for (let by = 0; by < gy; by++) for (let bx = 0; bx < gx; bx++) {
      hist.fill(0);
      let n = 0;
      for (let y = by * B; y < Math.min(h, by * B + B); y++) for (let x = bx * B; x < Math.min(w, bx * B + B); x++) { hist[data[(y * w + x) * 4 + c]]++; n++; }
      let acc = 0, v = 255;
      for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.8) { v = i; break; } }
      grid[by * gx + bx] = v;
    }
    // a 3x3 maximum bridges big dark things (a photo on the page), a 3x3 mean smooths the steps
    const pass = (src: Float32Array, grow: boolean) => {
      const dst = new Float32Array(src.length);
      for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) {
        let m = 0, cnt = 0;
        for (let j = Math.max(0, y - 1); j <= Math.min(gy - 1, y + 1); j++) for (let i = Math.max(0, x - 1); i <= Math.min(gx - 1, x + 1); i++) { const v = src[j * gx + i]; if (grow) m = Math.max(m, v); else { m += v; cnt++; } }
        dst[y * gx + x] = grow ? m : m / cnt;
      }
      return dst;
    };
    grid = pass(pass(grid, true), false);
    for (let y = 0; y < h; y++) {
      const fy = Math.min(gy - 1, Math.max(0, (y + 0.5) / B - 0.5)), y0 = Math.floor(fy), y1 = Math.min(gy - 1, y0 + 1), wy = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = Math.min(gx - 1, Math.max(0, (x + 0.5) / B - 0.5)), x0 = Math.floor(fx), x1 = Math.min(gx - 1, x0 + 1), wx = fx - x0;
        const bg = Math.max(60, (grid[y0 * gx + x0] * (1 - wx) + grid[y0 * gx + x1] * wx) * (1 - wy) + (grid[y1 * gx + x0] * (1 - wx) + grid[y1 * gx + x1] * wx) * wy);
        const o = (y * w + x) * 4 + c;
        data[o] = curve[Math.min(255, Math.round((data[o] * 255) / bg))];
      }
    }
  }
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Binary erosion (or dilation when `grow`) of a mask by a square of radius r, as two passes. */
function morph(mask: Uint8Array, w: number, h: number, r: number, grow: boolean): Uint8Array {
  const pass = (src: Uint8Array, along: number, across: number, len: number, lines: number) => {
    const dst = new Uint8Array(src.length);
    for (let l = 0; l < lines; l++) for (let i = 0; i < len; i++) {
      let hit = grow ? 0 : 1;
      for (let k = Math.max(0, i - r); k <= Math.min(len - 1, i + r); k++) { const v = src[l * across + k * along]; if (grow ? v : !v) { hit = grow ? 1 : 0; break; } }
      dst[l * across + i * along] = hit;
    }
    return dst;
  };
  return pass(pass(mask, 1, w, w, h), w, 1, h, w);
}

/**
 * The four corners of the page in a photo, or null when there is no page to find (it already fills the picture, or nothing stands out).
 * The page is the biggest bright blob; its corners are the points furthest out along the two diagonals, so this suits a page held roughly upright.
 */
export function pageQuad(data: Uint8ClampedArray, w: number, h: number): Quad | null {
  const gray = grayOf(data, w, h);
  const t = otsu(gray);
  let mask = new Uint8Array(w * h);
  let bright = 0;
  for (let i = 0; i < mask.length; i++) if (gray[i] > t) { mask[i] = 1; bright++; }
  if (bright < w * h * 0.15 || bright > w * h * 0.92) return null;
  const r = Math.max(1, Math.round(Math.min(w, h) / 100));
  mask = morph(morph(mask, w, h, r, false), w, h, r, true); // opening: cuts thin bridges to other bright things
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  let best: { size: number; tl: Pt; tr: Pt; br: Pt; bl: Pt } | null = null;
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s]) continue;
    const c = { size: 0, tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, br: { x: 0, y: 0 }, bl: { x: 0, y: 0 } };
    let lo = Infinity, hi = -Infinity, dlo = Infinity, dhi = -Infinity;
    seen[s] = 1; stack.push(s);
    while (stack.length) {
      const i = stack.pop()!, x = i % w, y = (i - x) / w;
      c.size++;
      if (x + y < lo) { lo = x + y; c.tl = { x, y }; }
      if (x + y > hi) { hi = x + y; c.br = { x, y }; }
      if (x - y > dhi) { dhi = x - y; c.tr = { x, y }; }
      if (x - y < dlo) { dlo = x - y; c.bl = { x, y }; }
      const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const n of next) if (n >= 0 && mask[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
    }
    if (!best || c.size > best.size) best = c;
  }
  if (!best) return null;
  const q: Quad = [best.tl, best.tr, best.br, best.bl];
  let area = 0;
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; area += a.x * b.y - b.x * a.y; }
  area = Math.abs(area) / 2;
  const edges = q.map((p, i) => dist(p, q[(i + 1) % 4]));
  if (area < w * h * 0.15 || area > w * h * 0.92 || best.size < area * 0.6 || Math.min(...edges) < Math.max(w, h) * 0.1) return null;
  return q;
}

/** Width and height for the flattened page: the longer of each pair of opposite edges, snapped to the A4 or Letter shape when within 6 %. */
export function quadSize(q: Quad): { w: number; h: number } {
  let w = Math.round(Math.max(dist(q[0], q[1]), dist(q[3], q[2])));
  let h = Math.round(Math.max(dist(q[0], q[3]), dist(q[1], q[2])));
  for (const std of [Math.SQRT2, 11 / 8.5]) {
    if (Math.abs(h / w / std - 1) < 0.06) { h = Math.round(w * std); break; }
    if (Math.abs((h / w) * std - 1) < 0.06) { w = Math.round(h * std); break; }
  }
  return { w, h };
}

/** Flattens the page inside `q` onto a w×h rectangle (perspective correction), with bilinear sampling. Returns RGBA pixels. */
export function warpQuad(src: { data: Uint8ClampedArray; width: number; height: number }, q: Quad, w: number, h: number): Uint8ClampedArray {
  const [p0, p1, p2, p3] = q;
  // unit square -> quad (Heckbert): X = (a u + b v + c) / (g u + h v + 1)
  const sx = p0.x - p1.x + p2.x - p3.x, sy = p0.y - p1.y + p2.y - p3.y;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = den ? (sx * dy2 - dx2 * sy) / den : 0, hh = den ? (dx1 * sy - sx * dy1) / den : 0;
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + hh * p3.x;
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + hh * p3.y;
  const out = new Uint8ClampedArray(w * h * 4);
  const { data, width: sw, height: sh } = src;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w, k = g * u + hh * v + 1;
      const fx = Math.min(sw - 1, Math.max(0, (a * u + b * v + p0.x) / k - 0.5)), fy = Math.min(sh - 1, Math.max(0, (d * u + e * v + p0.y) / k - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1), wx = fx - x0, wy = fy - y0;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        out[o + c] = (data[(y0 * sw + x0) * 4 + c] * (1 - wx) + data[(y0 * sw + x1) * 4 + c] * wx) * (1 - wy) + (data[(y1 * sw + x0) * 4 + c] * (1 - wx) + data[(y1 * sw + x1) * 4 + c] * wx) * wy;
      }
    }
  }
  return out;
}

/** The quad pulled `by` (0-1) of the way towards its centre, to stay clear of the page edge and whatever lies beyond it. */
/** True when the four corners form a proper (convex, untwisted) quadrilateral. */
export function isConvex(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross === 0) return false;
    if (sign && Math.sign(cross) !== sign) return false;
    sign = Math.sign(cross);
  }
  return true;
}

export function insetQuad(q: Quad, by: number): Quad {
  const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4, cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
  return q.map((p) => ({ x: p.x + (cx - p.x) * by, y: p.y + (cy - p.y) * by })) as Quad;
}
