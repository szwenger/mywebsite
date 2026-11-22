import { PDFDocument, degrees, type PDFEmbeddedPage } from 'pdf-lib';
import { shown } from './stamp.ts';

const MM = 72 / 25.4;
export const PAGE_SIZES: Record<string, [number, number]> = {
  A3: [297 * MM, 420 * MM], A4: [210 * MM, 297 * MM], A5: [148 * MM, 210 * MM], A6: [105 * MM, 148 * MM],
  Letter: [612, 792], Legal: [612, 1008], Tabloid: [792, 1224],
};

const range = (n: number) => [...Array(n).keys()];

// ---- page orders (all 0-based, usable with extract) ----
export const reverseOrder = (n: number): number[] => range(n).reverse();
/** Pages 1, 3, 5… (`odd`) or 2, 4, 6… */
export const everyOther = (n: number, odd: boolean): number[] => range(n).filter((i) => (i % 2 === 0) === odd);

/** Groups of pages for splitting: `every` N pages, or one group per comma-separated range, or each page alone. */
export function splitGroups(n: number, mode: { every: number } | { ranges: number[][] }): number[][] {
  if ('ranges' in mode) return mode.ranges;
  const k = Math.max(1, Math.floor(mode.every));
  const out: number[][] = [];
  for (let i = 0; i < n; i += k) out.push(range(Math.min(k, n - i)).map((j) => i + j));
  return out;
}

/** Padded to a multiple of 4 with blanks (-1), then ordered so that printing double-sided, folding and nesting the sheets gives a booklet.
 *  Each entry is [left, right] of one side of a sheet: sheet 1 front is [last, first], its back [second, second-to-last], and so on. */
export function bookletSides(n: number): [number, number][] {
  const total = Math.ceil(n / 4) * 4;
  const page = (i: number) => (i < n ? i : -1);
  const sides: [number, number][] = [];
  for (let s = 0; s < total / 4; s++) {
    sides.push([page(total - 1 - 2 * s), page(2 * s)]);
    sides.push([page(2 * s + 1), page(total - 2 - 2 * s)]);
  }
  return sides;
}

/** Splits one set of pages into sheets of grid cells. Cells are filled row by row; -1 stays empty. */
export const sheetsOf = (order: number[], perSheet: number): number[][] => {
  const out: number[][] = [];
  for (let i = 0; i < order.length; i += perSheet) out.push(order.slice(i, i + perSheet));
  return out;
};

// ---- crop ----
export interface Margins { top: number; right: number; bottom: number; left: number }

/** Cuts the given margins (points, measured on the displayed page) from the chosen pages. Throws Error('too-much') when nothing would be left. */
export async function cropPages(file: Uint8Array, m: Margins, pages: number[] | null): Promise<Uint8Array> {
  const doc = await PDFDocument.load(file);
  doc.getPages().forEach((p, i) => {
    if (pages && !pages.includes(i)) return;
    const { x, y, width, height } = p.getCropBox();
    const { rot } = shown(p);
    // The margins are named for the displayed page; map them onto the unrotated box.
    const [l, b, r, t] = rot === 0 ? [m.left, m.bottom, m.right, m.top] : rot === 90 ? [m.top, m.left, m.bottom, m.right] : rot === 180 ? [m.right, m.top, m.left, m.bottom] : [m.bottom, m.right, m.top, m.left];
    if (l + r >= width - 1 || t + b >= height - 1) throw new Error('too-much');
    p.setCropBox(x + l, y + b, width - l - r, height - t - b);
    p.setMediaBox(x + l, y + b, width - l - r, height - t - b);
  });
  return doc.save();
}

// ---- resize, N-up and booklet ----
export interface SheetOpts { size: [number, number] | 'first'; landscape: boolean; cols: number; rows: number; margin: number; gap: number; border: boolean }

/** Puts source pages onto new sheets, scaled to fit their cell and centred. `sheets` lists source pages per sheet in cell order (-1 = empty cell). */
export async function layoutSheets(file: Uint8Array, sheets: number[][], o: SheetOpts): Promise<Uint8Array> {
  const src = await PDFDocument.load(file);
  // pdf-lib cannot embed a page that has no content stream (a blank page); give those an invisible mark.
  for (const p of src.getPages()) if (!p.node.Contents()) p.drawRectangle({ x: 0, y: 0, width: 0.1, height: 0.1, opacity: 0, borderOpacity: 0 });
  const out = await PDFDocument.create();
  const embedded = await out.embedPdf(src, src.getPageIndices());
  const first = shown(src.getPages()[0]);
  let [W, H] = o.size === 'first' ? [first.w, first.h] : o.size;
  if (o.size !== 'first' && o.landscape !== W > H) [W, H] = [H, W];
  const cw = (W - 2 * o.margin - (o.cols - 1) * o.gap) / o.cols;
  const ch = (H - 2 * o.margin - (o.rows - 1) * o.gap) / o.rows;
  for (const sheet of sheets) {
    const page = out.addPage([W, H]);
    sheet.forEach((idx, cell) => {
      if (idx < 0 || idx >= embedded.length) return;
      const e: PDFEmbeddedPage = embedded[idx];
      const turn = ((src.getPages()[idx].getRotation().angle % 360) + 360) % 360;
      const sw = turn % 180 ? e.height : e.width;
      const sh = turn % 180 ? e.width : e.height;
      const k = Math.min(cw / sw, ch / sh);
      const col = cell % o.cols, row = Math.floor(cell / o.cols);
      const cx = o.margin + col * (cw + o.gap) + cw / 2;
      const cy = H - o.margin - row * (ch + o.gap) - ch / 2;
      // Place the page's centre at the cell centre, turning it like the page itself is displayed.
      const rad = (turn * Math.PI) / 180;
      const hw = (e.width * k) / 2, hh = (e.height * k) / 2;
      const ox = cx - (hw * Math.cos(rad) - hh * Math.sin(rad));
      const oy = cy - (hw * Math.sin(rad) + hh * Math.cos(rad));
      page.drawPage(e, { x: ox, y: oy, width: e.width * k, height: e.height * k, rotate: degrees(turn) });
      if (o.border) page.drawRectangle({ x: cx - (sw * k) / 2, y: cy - (sh * k) / 2, width: sw * k, height: sh * k, borderWidth: 0.5, opacity: 0, borderOpacity: 0.6 });
    });
  }
  return out.save();
}

/** N pages per sheet in reading order. */
export const nUp = (file: Uint8Array, count: number, o: Omit<SheetOpts, 'cols' | 'rows'> & { cols: number; rows: number }) =>
  PDFDocument.load(file).then((d) => layoutSheets(file, sheetsOf(d.getPageIndices(), count), o));

/** A booklet: two pages per side on landscape sheets in printing order (print double-sided, flip on the short edge). */
export async function booklet(file: Uint8Array, size: [number, number] | 'first'): Promise<Uint8Array> {
  const doc = await PDFDocument.load(file);
  // "first": a sheet exactly two first-page widths wide, so each half is a full page.
  const first = shown(doc.getPages()[0]);
  return layoutSheets(file, bookletSides(doc.getPageCount()), { size: size === 'first' ? [first.w * 2, first.h] : size, landscape: true, cols: 2, rows: 1, margin: 0, gap: 0, border: false });
}

/** Adds blank pages of the same size as the page before them (or the first page) after each listed 0-based index; -1 puts one at the start. */
export async function insertBlanks(file: Uint8Array, after: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(file);
  const at = [...new Set(after)].sort((a, b) => b - a); // from the back so earlier indexes stay valid
  for (const i of at) {
    const ref = doc.getPages()[Math.max(0, Math.min(i, doc.getPageCount() - 1))];
    const { w, h } = shown(ref);
    doc.insertPage(i + 1, [w, h]);
  }
  return doc.save();
}
