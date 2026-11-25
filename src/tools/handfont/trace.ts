// Bitmap to outline: ink pixels become closed, smoothed contours for a glyph.

export interface P { x: number; y: number }
export interface FontPt { x: number; y: number; on: boolean }

/** Drops ink blobs that touch the border of the mask (guide lines, a neighbour's stroke) or have fewer than `min` pixels. */
export function cleanMask(mask: Uint8Array, w: number, h: number, min = 12): Uint8Array {
  const out = new Uint8Array(mask);
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!out[s] || seen[s]) continue;
    const blob: number[] = [];
    let border = false;
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      blob.push(i);
      const x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (out[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (border || blob.length < min) for (const i of blob) out[i] = 0;
  }
  return out;
}

/** Pixel-edge loops around ink, as lists of corner points. Ink is on the right of the direction of travel (y down). */
export function boundaryLoops(mask: Uint8Array, w: number, h: number): P[][] {
  const ink = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  const key = (x: number, y: number) => y * (w + 1) + x;
  const out = new Map<number, P[]>();
  const add = (a: P, b: P) => { const k = key(a.x, a.y); (out.get(k) ?? out.set(k, []).get(k)!).push(b); };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!ink(x, y)) continue;
      if (!ink(x, y - 1)) add({ x, y }, { x: x + 1, y });
      if (!ink(x + 1, y)) add({ x: x + 1, y }, { x: x + 1, y: y + 1 });
      if (!ink(x, y + 1)) add({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
      if (!ink(x - 1, y)) add({ x, y: y + 1 }, { x, y });
    }
  }
  const loops: P[][] = [];
  for (const [k0, list] of out) {
    while (list.length) {
      const start: P = { x: k0 % (w + 1), y: (k0 / (w + 1)) | 0 };
      const loop: P[] = [start];
      let cur = list.pop()!;
      while (cur.x !== start.x || cur.y !== start.y) {
        loop.push(cur);
        const next = out.get(key(cur.x, cur.y))!;
        cur = next.pop()!;
      }
      loops.push(loop);
    }
  }
  return loops;
}

/** Removes points in the middle of straight runs. */
function dropCollinear(p: P[]): P[] {
  const n = p.length;
  return p.filter((a, i) => {
    const b = p[(i + 1) % n], z = p[(i + n - 1) % n];
    return (a.x - z.x) * (b.y - a.y) - (a.y - z.y) * (b.x - a.x) !== 0;
  });
}

/** Corner cutting: every pass rounds the stair steps a little more. */
export function chaikin(p: P[], passes: number): P[] {
  let cur = p;
  for (let k = 0; k < passes; k++) {
    const next: P[] = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i], b = cur[(i + 1) % cur.length];
      next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    cur = next;
  }
  return cur;
}

function segDist(p: P, a: P, b: P): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ramer-Douglas-Peucker on a closed loop (split at the two points farthest apart along the index). */
export function simplify(p: P[], eps: number): P[] {
  if (p.length < 8) return p;
  const rdp = (a: number, b: number, pts: P[]): P[] => {
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segDist(pts[i], pts[a], pts[b]);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst <= eps) return [pts[a]];
    return [...rdp(a, at, pts), ...rdp(at, b, pts)];
  };
  const half = p.length >> 1;
  const open = [...p, p[0]];
  return [...rdp(0, half, open), ...rdp(half, open.length - 1, open)];
}

export function signedArea(p: P[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; }
  return s / 2;
}

/**
 * Turns the loops into contours with on/off-curve flags. Gentle bends become off-curve points
 * (TrueType puts the curve through the midpoints), sharp turns stay on-curve so corners survive.
 */
export function toContours(loops: P[][], opts: { smooth?: number; eps?: number; minArea?: number } = {}): { pts: P[]; on: boolean[] }[] {
  const { smooth = 2, eps = 0.4, minArea = 6 } = opts;
  const res: { pts: P[]; on: boolean[] }[] = [];
  for (const raw of loops) {
    if (Math.abs(signedArea(raw)) < minArea) continue;
    const pts = simplify(chaikin(dropCollinear(raw), smooth), eps);
    if (pts.length < 3) continue;
    const n = pts.length;
    const on = pts.map((b, i) => {
      const a = pts[(i + n - 1) % n], c = pts[(i + 1) % n];
      const v1 = { x: b.x - a.x, y: b.y - a.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
      const cos = (v1.x * v2.x + v1.y * v2.y) / ((Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1);
      return cos < 0.5; // turning more than 60 degrees
    });
    res.push({ pts, on });
  }
  return res;
}
