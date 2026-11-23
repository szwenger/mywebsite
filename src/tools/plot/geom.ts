/** Geometry for the function grapher, in pixel space. Pure, no DOM. */

export type Seg = [number, number, number, number];

/** Line segments of the zero set of `val` (marching squares) over a w x h pixel area, sampled every `cell` pixels. */
export function contour(val: (x: number, y: number) => number, w: number, h: number, cell: number): Seg[] {
  const nx = Math.ceil(w / cell) + 1, ny = Math.ceil(h / cell) + 1;
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = val(i * cell, j * cell);
  const out: Seg[] = [];
  const at = (a: number, b: number, pa: number, pb: number) => pa + ((pb - pa) * a) / (a - b);
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
      if (!(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(d))) continue;
      const k = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const x0 = i * cell, x1 = x0 + cell, y0 = j * cell, y1 = y0 + cell;
      const P: Record<string, [number, number]> = {
        T: [at(a, b, x0, x1), y0], R: [x1, at(b, c, y0, y1)], B: [at(d, c, x0, x1), y1], L: [x0, at(a, d, y0, y1)],
      };
      const link = (p: string, q: string) => out.push([P[p][0], P[p][1], P[q][0], P[q][1]]);
      const centre = (a + b + c + d) / 4 > 0;
      switch (k) {
        case 1: case 14: link('L', 'B'); break;
        case 2: case 13: link('B', 'R'); break;
        case 3: case 12: link('L', 'R'); break;
        case 4: case 11: link('T', 'R'); break;
        case 6: case 9: link('T', 'B'); break;
        case 7: case 8: link('T', 'L'); break;
        case 5: if (centre) { link('T', 'L'); link('B', 'R'); } else { link('T', 'R'); link('L', 'B'); } break;
        default: if (centre) { link('T', 'R'); link('L', 'B'); } else { link('T', 'L'); link('B', 'R'); }
      }
    }
  }
  return out;
}

/** Rectangles [x, y, w, h] covering the cells where `test` holds, runs in a row merged. */
export function cells(test: (x: number, y: number) => boolean, w: number, h: number, cell: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let y = 0; y < h; y += cell) {
    let start = -1;
    for (let x = 0; x <= w; x += cell) {
      const on = x < w && test(x + cell / 2, y + cell / 2);
      if (on && start < 0) start = x;
      if (!on && start >= 0) { out.push([start, y, x - start, cell]); start = -1; }
    }
  }
  return out;
}

const CLAMP = 1e5;
const clamp = (v: number) => Math.max(-CLAMP, Math.min(CLAMP, v));

/** Polylines of y = f(x): `ypx(px)` gives the pixel row for pixel column px (NaN where undefined). Breaks at gaps and at poles such as tan. */
export function trace(ypx: (x: number) => number, w: number, h: number, step = 1): number[][] {
  const lines: number[][] = [];
  let cur: number[] = [];
  let px = NaN, py = NaN;
  const flush = () => { if (cur.length >= 4) lines.push(cur); cur = []; };
  for (let x = 0; x <= w + step; x += step) {
    const y = ypx(x);
    if (!Number.isFinite(y)) { flush(); px = py = NaN; continue; }
    if (Number.isFinite(py) && Math.abs(y - py) > h) {
      const mid = ypx((x + px) / 2);
      const lo = Math.min(y, py), hi = Math.max(y, py);
      if (!(mid >= lo && mid <= hi)) flush();
    }
    cur.push(x, clamp(y));
    px = x; py = y;
  }
  flush();
  return lines;
}

/** Polylines of a parametric curve sampled at n+1 values of the parameter from t0 to t1; `pt` returns pixel coordinates. */
export function traceParam(pt: (t: number) => [number, number], t0: number, t1: number, n: number): number[][] {
  const lines: number[][] = [];
  let cur: number[] = [];
  const flush = () => { if (cur.length >= 4) lines.push(cur); cur = []; };
  for (let i = 0; i <= n; i++) {
    const [x, y] = pt(t0 + ((t1 - t0) * i) / n);
    if (!Number.isFinite(x) || !Number.isFinite(y)) { flush(); continue; }
    cur.push(clamp(x), clamp(y));
  }
  flush();
  return lines;
}
