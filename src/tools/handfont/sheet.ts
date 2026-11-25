// The handwriting sheet: which characters go where on an A4 page, how a page says what it is, and the printable SVG.

export const PAGE = { w: 210, h: 297 };
/** Registration squares (centres, mm) in the page corners; their size is MARK. */
export const MARK = 5;
export const MARKS = [{ x: 9, y: 9 }, { x: 201, y: 9 }, { x: 201, y: 288 }, { x: 9, y: 288 }] as const;
export const GRID = { x: 14, y: 18, cell: 26, cols: 7, rows: 10 };
const LABEL = 5;
/** Writing area inside a cell, relative to the cell's top-left corner. */
export const WRITE = { x: 1.5, y: LABEL + 0.5, w: GRID.cell - 3, h: GRID.cell - LABEL - 1.5 };
/** Baseline, x-height and cap height guide lines, mm below the top of the writing area. */
export const GUIDE = { cap: 3.5, x: 6.5, base: 13 };
export const UNITS_PER_MM = 60;

export interface CharSet { id: string; bit: number; chars: string }
export const CHARSETS: CharSet[] = [
  { id: 'lower', bit: 0, chars: 'abcdefghijklmnopqrstuvwxyz' },
  { id: 'upper', bit: 1, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { id: 'digits', bit: 2, chars: '0123456789' },
  { id: 'punct', bit: 3, chars: '.,;:!?\'"-()&@#%/+=*€' },
  { id: 'german', bit: 4, chars: 'äöüßÄÖÜ' },
  { id: 'cyrillic', bit: 5, chars: 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' },
];

export interface SheetConfig { sets: number; variants: number }
export interface Cell { page: number; col: number; row: number; ch: string; variant: number }

export const MAX_VARIANTS = 4;

export function charsOf(sets: number): string[] {
  return CHARSETS.filter((c) => sets & (1 << c.bit)).flatMap((c) => [...c.chars]);
}

export const CELLS_PER_PAGE = GRID.cols * GRID.rows;

/** Every cell of every page, in reading order; the variants of a character sit next to each other. */
export function cellsOf(cfg: SheetConfig): Cell[] {
  const cells: Cell[] = [];
  let i = 0;
  for (const ch of charsOf(cfg.sets)) {
    for (let variant = 0; variant < cfg.variants; variant++, i++) {
      const inPage = i % CELLS_PER_PAGE;
      cells.push({ page: Math.floor(i / CELLS_PER_PAGE), col: inPage % GRID.cols, row: Math.floor(inPage / GRID.cols), ch, variant });
    }
  }
  return cells;
}

export function pageCount(cfg: SheetConfig): number {
  return Math.max(1, Math.ceil(cellsOf(cfg).length / CELLS_PER_PAGE));
}

/** The page ID boxes: 6 set flags, 2 bits of variants-1, 4 bits of page index, 1 parity bit. */
export const ID_BITS = 13;
export const ID_BOX = { x0: 69, y: 283, size: 3.5, step: 5.5 };

export function encodeId(cfg: SheetConfig, page: number): boolean[] {
  const v = cfg.variants - 1;
  const bits: boolean[] = [];
  for (let b = 0; b < 6; b++) bits.push(!!(cfg.sets & (1 << b)));
  bits.push(!!(v & 2), !!(v & 1));
  for (let b = 3; b >= 0; b--) bits.push(!!(page & (1 << b)));
  bits.push(bits.filter(Boolean).length % 2 === 1);
  return bits;
}

export function decodeId(bits: boolean[]): { cfg: SheetConfig; page: number } | null {
  if (bits.length !== ID_BITS || bits.filter(Boolean).length % 2 !== 0) return null;
  let sets = 0;
  for (let b = 0; b < 6; b++) if (bits[b]) sets |= 1 << b;
  const variants = 1 + (bits[6] ? 2 : 0) + (bits[7] ? 1 : 0);
  let page = 0;
  for (let b = 0; b < 4; b++) page = (page << 1) | (bits[8 + b] ? 1 : 0);
  if (!sets || variants > MAX_VARIANTS) return null;
  const cfg = { sets, variants };
  return page < pageCount(cfg) ? { cfg, page } : null;
}

/** Top-left of a cell, mm. */
export function cellOrigin(col: number, row: number): { x: number; y: number } {
  return { x: GRID.x + col * GRID.cell, y: GRID.y + row * GRID.cell };
}

/** The writing area of a cell, mm on the page. */
export function writeRect(col: number, row: number): { x: number; y: number; w: number; h: number } {
  const o = cellOrigin(col, row);
  return { x: o.x + WRITE.x, y: o.y + WRITE.y, w: WRITE.w, h: WRITE.h };
}

const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** One printable A4 page as SVG in millimetres. */
export function templateSvg(cfg: SheetConfig, page: number, title: string): string {
  const n = pageCount(cfg);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}mm" height="${PAGE.h}mm" font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif">`;
  s += `<rect width="${PAGE.w}" height="${PAGE.h}" fill="#fff"/>`;
  for (const m of MARKS) s += `<rect x="${m.x - MARK / 2}" y="${m.y - MARK / 2}" width="${MARK}" height="${MARK}" fill="#000"/>`;
  s += `<text x="24" y="14" font-size="4.2" font-weight="700" fill="#222">${esc(title)}</text>`;
  s += `<text x="186" y="14" font-size="3.2" text-anchor="end" fill="#555">${page + 1} / ${n}</text>`;
  encodeId(cfg, page).forEach((on, i) => {
    const x = ID_BOX.x0 + i * ID_BOX.step;
    s += `<rect x="${x}" y="${ID_BOX.y - ID_BOX.size / 2}" width="${ID_BOX.size}" height="${ID_BOX.size}" fill="${on ? '#000' : '#fff'}" stroke="#000" stroke-width=".3"/>`;
  });
  for (const c of cellsOf(cfg).filter((c) => c.page === page)) {
    const o = cellOrigin(c.col, c.row);
    const w = writeRect(c.col, c.row);
    s += `<rect x="${o.x}" y="${o.y}" width="${GRID.cell}" height="${GRID.cell}" fill="none" stroke="#999" stroke-width=".25"/>`;
    s += `<text x="${o.x + 1.5}" y="${o.y + 3.6}" font-size="3.4" fill="#222">${esc(c.ch)}${cfg.variants > 1 ? `<tspan font-size="2.2" fill="#777" dx=".6">${c.variant + 1}</tspan>` : ''}</text>`;
    const guide = (dy: number, col: string) => `<line x1="${w.x}" x2="${w.x + w.w}" y1="${w.y + dy}" y2="${w.y + dy}" stroke="${col}" stroke-width=".25"/>`;
    s += guide(GUIDE.cap, '#e3e3e3') + guide(GUIDE.x, '#e3e3e3') + guide(GUIDE.base, '#c9c9c9');
  }
  return s + '</svg>';
}
