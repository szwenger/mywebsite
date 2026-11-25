// Photo or scan of a sheet to a flat, upright grayscale page (browser only: needs canvas).
import { fitSide, grayOf, pageQuad, warpQuad, type Pt, type Quad } from '../pdf/scan.ts';
import { MARKS, PAGE, type SheetConfig } from './sheet.ts';
import { findMarkers, readPageId, SPAN, type Flat } from './read.ts';

/** The page outline found in a photo can sit a few mm inside the real page, so the first pass looks at a slightly bigger area. */
const GROW = 1.08;
const COARSE = 6; // px per mm for the first, whole-page pass
const FINE = 8; // px per mm of the result

export interface Sheet { flat: Flat; cfg: SheetConfig; page: number }

function pixels(bmp: ImageBitmap, max: number) {
  const { w, h } = fitSide(bmp.width, bmp.height, max);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  return { data: d.data, width: w, height: h };
}

/** Finds the page in the picture, flattens it, locks on to the four corner squares and reads the page ID. Tries all four ways up. */
export async function flattenSheet(file: Blob): Promise<Sheet | null> {
  const bmp = await createImageBitmap(file);
  const big = pixels(bmp, 3200);
  const small = pixels(bmp, 900);
  bmp.close();
  const k = big.width / small.width;
  const found = pageQuad(small.data, small.width, small.height);
  const w = big.width - 1, h = big.height - 1;
  const quad: Quad = found
    ? (found.map((p: Pt) => ({ x: p.x * k, y: p.y * k })) as Quad)
    : [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];

  const mid = { x: quad.reduce((s, p) => s + p.x, 0) / 4, y: quad.reduce((s, p) => s + p.y, 0) / 4 };
  const wide = quad.map((p) => ({ x: mid.x + (p.x - mid.x) * GROW, y: mid.y + (p.y - mid.y) * GROW })) as Quad;

  const cw = Math.round(PAGE.w * COARSE), ch = Math.round(PAGE.h * COARSE);
  for (let r = 0; r < 4; r++) {
    const q = [0, 1, 2, 3].map((i) => wide[(i + r) % 4]) as Quad;
    const coarse = warpQuad(big, q, cw, ch);
    const cg = grayOf(coarse, cw, ch);
    const marks = findMarkers(cg, cw, ch, COARSE);
    const lock: Quad = marks ? (marks as Quad) : (MARKS.map((m) => ({ x: m.x * COARSE, y: m.y * COARSE })) as Quad);
    const fw = Math.round(SPAN.w * FINE), fh = Math.round(SPAN.h * FINE);
    const fine = warpQuad({ data: coarse, width: cw, height: ch }, lock, fw, fh);
    const flat: Flat = { gray: grayOf(fine, fw, fh), w: fw, h: fh, ppmm: FINE };
    const id = readPageId(flat);
    if (id) return { flat, ...id };
  }
  return null;
}
