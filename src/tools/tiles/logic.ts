export interface Rect { x: number; y: number; w: number; h: number }
export interface Size { w: number; h: number }

/** The tiles of a cols × rows grid, row by row. Edges are rounded, so the leftover pixels are spread and every pixel lands in exactly one tile. */
export function gridRects(w: number, h: number, cols: number, rows: number): Rect[] {
  const c = Math.min(w, Math.max(1, Math.floor(cols) || 1)), r = Math.min(h, Math.max(1, Math.floor(rows) || 1));
  const out: Rect[] = [];
  for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) {
    const x0 = Math.round((i * w) / c), x1 = Math.round(((i + 1) * w) / c), y0 = Math.round((j * h) / r), y1 = Math.round(((j + 1) * h) / r);
    out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return out;
}

/** holiday.jpg, tile 4 of 3 columns → holiday-r2c2.png (rows and columns count from 1). */
export function tileName(base: string, index: number, cols: number, ext: string): string {
  const stem = base.replace(/\.[^.\/\\]+$/, '');
  const row = Math.floor(index / cols) + 1, col = (index % cols) + 1;
  return `${stem}-r${row}c${col}.${ext}`;
}

/** Places pictures side by side ('h') or one above the other ('v'). With `match`, every picture is scaled to the largest height (or width), so the edge is straight; without it sizes stay and the smaller ones are centred. */
export function stitchLayout(sizes: Size[], dir: 'h' | 'v', gap: number, match: boolean): { w: number; h: number; items: Rect[] } {
  if (!sizes.length) return { w: 0, h: 0, items: [] };
  const across = dir === 'h' ? Math.max(...sizes.map((s) => s.h)) : Math.max(...sizes.map((s) => s.w)); // the shared side
  let pos = 0;
  const items = sizes.map((s) => {
    const k = match ? across / (dir === 'h' ? s.h : s.w) : 1;
    const w = Math.round(s.w * k), h = Math.round(s.h * k);
    const item = dir === 'h' ? { x: pos, y: Math.round((across - h) / 2), w, h } : { x: Math.round((across - w) / 2), y: pos, w, h };
    pos += (dir === 'h' ? w : h) + gap;
    return item;
  });
  const along = pos - gap;
  return dir === 'h' ? { w: along, h: across, items } : { w: across, h: along, items };
}
