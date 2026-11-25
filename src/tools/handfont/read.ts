// Reading a filled-in sheet: find the registration squares, read the page ID, cut out each cell and turn the ink into a glyph.
import { GUIDE, ID_BITS, ID_BOX, MARK, MARKS, UNITS_PER_MM, decodeId, writeRect, type SheetConfig } from './sheet.ts';
import { boundaryLoops, cleanMask, toContours } from './trace.ts';
import type { Contour } from './ttf.ts';

/** A rectified sheet: grayscale pixels where pixel (0,0) is the centre of the top-left registration square. */
export interface Flat { gray: Uint8Array; w: number; h: number; ppmm: number }
export const ORIGIN = { x: MARKS[0].x, y: MARKS[0].y };
/** Size in mm of the area between the registration squares' centres. */
export const SPAN = { w: MARKS[1].x - MARKS[0].x, h: MARKS[2].y - MARKS[0].y };

/** Pixel position of a page coordinate (mm). */
const px = (mm: number, o: number, ppmm: number) => (mm - o) * ppmm;

/**
 * Centres (px) of the four registration squares in an image of the whole A4 page, or null if one is missing.
 * Each is the solid dark square of about the right size in a window around where it should be
 * (so the table beyond the page edge, text and handwriting are not taken for it).
 */
export function findMarkers(gray: Uint8Array, w: number, h: number, ppmm: number): { x: number; y: number }[] | null {
  const R = Math.round(16 * ppmm); // the first flattening can be several mm off
  const want = (MARK * ppmm) ** 2;
  const out: { x: number; y: number }[] = [];
  for (const m of MARKS) {
    const x0 = Math.max(0, Math.round(m.x * ppmm) - R), x1 = Math.min(w, Math.round(m.x * ppmm) + R);
    const y0 = Math.max(0, Math.round(m.y * ppmm) - R), y1 = Math.min(h, Math.round(m.y * ppmm) + R);
    const seen = new Uint8Array(w * h);
    let best: { x: number; y: number; d: number } | null = null;
    for (let sy = y0; sy < y1; sy++) {
      for (let sx = x0; sx < x1; sx++) {
        const s = sy * w + sx;
        if (seen[s] || gray[s] >= 110) continue;
        let n = 0, cx = 0, cy = 0, bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
        const stack = [s];
        seen[s] = 1;
        while (stack.length) {
          const i = stack.pop()!, x = i % w, y = (i / w) | 0;
          n++; cx += x; cy += y;
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
          for (const j of [i - 1, i + 1, i - w, i + w]) {
            const jx = j % w, jy = (j / w) | 0;
            if (jx >= x0 && jx < x1 && jy >= y0 && jy < y1 && !seen[j] && gray[j] < 110) { seen[j] = 1; stack.push(j); }
          }
        }
        const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1, side = MARK * ppmm;
        const square = bw > side * 0.6 && bw < side * 1.6 && bh > side * 0.6 && bh < side * 1.6 && n / (bw * bh) > 0.75;
        const d = Math.abs(n - want);
        if (square && (!best || d < best.d)) best = { x: cx / n, y: cy / n, d };
      }
    }
    if (!best) return null;
    out.push({ x: best.x, y: best.y });
  }
  return out;
}

/** The ID boxes as bits, or null when the parity or contents make no sense. */
export function readPageId(f: Flat): { cfg: SheetConfig; page: number } | null {
  const bits: boolean[] = [];
  for (let i = 0; i < ID_BITS; i++) {
    const x0 = px(ID_BOX.x0 + i * ID_BOX.step + ID_BOX.size * 0.2, ORIGIN.x, f.ppmm);
    const y0 = px(ID_BOX.y - ID_BOX.size * 0.3, ORIGIN.y, f.ppmm);
    const s = ID_BOX.size * 0.6 * f.ppmm;
    let sum = 0, n = 0;
    for (let y = Math.round(y0); y < y0 + s; y++) for (let x = Math.round(x0); x < x0 + s; x++) if (x >= 0 && y >= 0 && x < f.w && y < f.h) { sum += f.gray[y * f.w + x]; n++; }
    bits.push(n > 0 && sum / n < 110);
  }
  return decodeId(bits);
}

/** Ink = clearly darker than the paper around it, so shadows and the light guide lines drop out. */
export function inkMask(gray: Uint8Array, w: number, h: number, radius: number, ratio = 0.72): Uint8Array {
  const W = w + 1;
  const sat = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += gray[y * w + x]; sat[(y + 1) * W + x + 1] = sat[y * W + x + 1] + row; }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(w, x + radius + 1);
      const mean = (sat[y1 * W + x1] - sat[y0 * W + x1] - sat[y1 * W + x0] + sat[y0 * W + x0]) / ((x1 - x0) * (y1 - y0));
      const v = gray[y * w + x];
      if (v < mean * ratio && v < 170) out[y * w + x] = 1;
    }
  }
  return out;
}

export interface CellInk { mask: Uint8Array; w: number; h: number; ink: number; cut: boolean }

/** The ink inside one cell's writing area, with blobs that touch its edge removed (`cut` says some did, with real ink). */
export function cellInk(ink: Uint8Array, f: Flat, col: number, row: number): CellInk {
  const r = writeRect(col, row);
  const x0 = Math.max(0, Math.round(px(r.x, ORIGIN.x, f.ppmm))), y0 = Math.max(0, Math.round(px(r.y, ORIGIN.y, f.ppmm)));
  const w = Math.min(f.w - x0, Math.round(r.w * f.ppmm)), h = Math.min(f.h - y0, Math.round(r.h * f.ppmm));
  const raw = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * w + x] = ink[(y0 + y) * f.w + x0 + x];
  const mask = cleanMask(raw, w, h);
  let n = 0, rawN = 0;
  for (let i = 0; i < mask.length; i++) { n += mask[i]; rawN += raw[i]; }
  return { mask, w, h, ink: n, cut: rawN - n > f.ppmm * f.ppmm * 0.8 };
}

export interface GlyphOut { advance: number; contours: Contour[] }

/** Ink to font units: x from the left edge of the ink plus a side bearing, y relative to the baseline guide. */
export function glyphFromMask(c: CellInk, ppmm: number, bearing: number, smooth = 2): GlyphOut | null {
  if (c.ink < 12) return null;
  let minX = Infinity, maxX = -Infinity;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.mask[y * c.w + x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x + 1); }
  const k = UNITS_PER_MM / ppmm;
  const base = GUIDE.base * ppmm; // the baseline guide, px below the top of the writing area
  const contours: Contour[] = [];
  for (const t of toContours(boundaryLoops(c.mask, c.w, c.h), { smooth })) {
    // Screen y points down and font y up, but the picture stays upright, so outer loops stay clockwise as TrueType wants.
    const pts = t.pts.map((p, i) => ({ x: (p.x - minX) * k + bearing, y: (base - p.y) * k, on: t.on[i] }));
    contours.push(pts);
  }
  if (!contours.length) return null;
  return { advance: (maxX - minX) * k + 2 * bearing, contours };
}
