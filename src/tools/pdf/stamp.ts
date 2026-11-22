import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/** Everything that draws onto existing pages: page numbers, headers and footers, watermarks, signatures, text, boxes.
 *  Positions are fractions of the page as it is displayed, measured from the top left, so a rotated page works too. */
export type RGB = [number, number, number];
export type Item = { page: number } & (
  | { kind: 'text'; text: string; x: number; y: number; size: number; color: RGB; opacity: number; rotate: number; anchor: 'l' | 'c' | 'r'; bold?: boolean }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; color: RGB; opacity: number }
  | { kind: 'path'; points: [number, number][]; width: number; color: RGB; opacity: number }
  | { kind: 'image'; bytes: Uint8Array; type: 'image/png' | 'image/jpeg'; x: number; y: number; w: number; opacity: number }
);
/** Draws text a built-in font cannot encode (Cyrillic, Greek, CJK…) into a PNG. `scale` is pixels per point. */
export type TextRenderer = (text: string, size: number, color: RGB, bold: boolean) => Promise<{ png: Uint8Array; w: number; h: number; scale: number }>;

export const hexToRgb = (hex: string): RGB => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** The page's displayed size in points (the page's /Rotate swaps width and height at 90 and 270). */
export function shown(page: PDFPage): { w: number; h: number; rot: 0 | 90 | 180 | 270 } {
  const rot = ((page.getRotation().angle % 360) + 360) % 360 as 0 | 90 | 180 | 270;
  const { width, height } = page.getSize();
  return rot % 180 ? { w: height, h: width, rot } : { w: width, h: height, rot };
}

/** A point measured on the displayed page (right and down from its top-left, in points) to the page's own coordinates. */
export function toUser(page: PDFPage, dx: number, dy: number): { x: number; y: number } {
  const { width: W, height: H } = page.getSize();
  const { rot } = shown(page);
  if (rot === 90) return { x: dy, y: dx };
  if (rot === 180) return { x: W - dx, y: dy };
  if (rot === 270) return { x: W - dy, y: H - dx };
  return { x: dx, y: H - dy };
}


/** Draws the items onto an already loaded document. `render` is only called for text the standard fonts cannot encode. */
export async function drawItems(doc: PDFDocument, items: Item[], render?: TextRenderer): Promise<void> {
  const pages = doc.getPages();
  const fonts = new Map<boolean, PDFFont>();
  const font = async (bold: boolean) => {
    if (!fonts.has(bold)) fonts.set(bold, await doc.embedFont(bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica));
    return fonts.get(bold)!;
  };
  for (const it of items) {
    const page = pages[it.page];
    if (!page) continue;
    const sz = shown(page);
    const rot = sz.rot;
    if (it.kind === 'rect') {
      const a = toUser(page, it.x * sz.w, it.y * sz.h);
      const b = toUser(page, (it.x + it.w) * sz.w, (it.y + it.h) * sz.h);
      page.drawRectangle({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y), color: rgb(...it.color), opacity: it.opacity, borderWidth: 0 });
    } else if (it.kind === 'path') {
      // A freehand stroke: short round-capped segments between the points.
      const pts = it.points.map(([x, y]) => toUser(page, x * sz.w, y * sz.h));
      for (let k = 1; k < pts.length; k++) page.drawLine({ start: pts[k - 1], end: pts[k], thickness: it.width, color: rgb(...it.color), opacity: it.opacity, lineCap: 1 });
    } else if (it.kind === 'image') {
      const img = it.type === 'image/png' ? await doc.embedPng(it.bytes) : await doc.embedJpg(it.bytes);
      const w = it.w * sz.w;
      const h = (w * img.height) / img.width;
      const o = toUser(page, it.x * sz.w, it.y * sz.h + h); // displayed bottom-left corner
      page.drawImage(img, { x: o.x, y: o.y, width: w, height: h, rotate: degrees(rot), opacity: it.opacity });
    } else {
      const f = await font(!!it.bold);
      let width: number;
      let rendered: Awaited<ReturnType<TextRenderer>> | null = null;
      try { width = f.widthOfTextAtSize(it.text, it.size); } catch {
        if (!render) throw new Error('encoding');
        rendered = await render(it.text, it.size, it.color, !!it.bold);
        width = rendered.w / rendered.scale;
      }
      // Start of the text on the displayed page, moved back along the text direction for centred or right-aligned text.
      const a = (it.rotate * Math.PI) / 180;
      const back = it.anchor === 'c' ? width / 2 : it.anchor === 'r' ? width : 0;
      const dx = it.x * sz.w - back * Math.cos(a);
      const dy = it.y * sz.h + back * Math.sin(a);
      const angle = degrees(it.rotate + rot);
      if (rendered) {
        const h = rendered.h / rendered.scale;
        const img = await doc.embedPng(rendered.png);
        // The picture's baseline sits about a fifth of its height above its bottom edge.
        const lift = h * 0.22;
        const o = toUser(page, dx + lift * Math.sin(a), dy + lift * Math.cos(a));
        page.drawImage(img, { x: o.x, y: o.y, width, height: h, rotate: angle, opacity: it.opacity });
      } else {
        const o = toUser(page, dx, dy);
        page.drawText(it.text, { x: o.x, y: o.y, size: it.size, font: f, color: rgb(...it.color), opacity: it.opacity, rotate: angle });
      }
    }
  }
}

export async function applyItems(file: Uint8Array, items: Item[], render?: TextRenderer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(file);
  await drawItems(doc, items, render);
  return doc.save();
}

// ---- page numbers, headers and footers ----
export type Pos = 'tl' | 'tc' | 'tr' | 'bl' | 'bc' | 'br';
export interface NumberOpts { pos: Pos; template: string; start: number; first: number; size: number; margin: number; color: RGB }

/** "{n}" is the page number, "{total}" the number of pages. */
export const fillTemplate = (t: string, n: number, total: number): string => t.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total));

export async function numberPages(file: Uint8Array, o: NumberOpts, render?: TextRenderer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(file);
  const pages = doc.getPages();
  const items: Item[] = [];
  pages.forEach((p, i) => {
    if (i < o.first - 1) return;
    const { w, h } = shown(p);
    const top = o.pos[0] === 't';
    // The baseline of a footer sits `margin` above the bottom edge; a header's text hangs `margin` below the top edge.
    const y = top ? (o.margin + o.size * 0.8) / h : 1 - o.margin / h;
    const col = o.pos[1];
    const x = col === 'l' ? o.margin / w : col === 'r' ? 1 - o.margin / w : 0.5;
    items.push({ kind: 'text', page: i, text: fillTemplate(o.template, o.start + i - (o.first - 1), pages.length), x, y, size: o.size, color: o.color, opacity: 1, rotate: 0, anchor: col === 'l' ? 'l' : col === 'r' ? 'r' : 'c' });
  });
  await drawItems(doc, items, render);
  return doc.save();
}

export interface WatermarkOpts { text: string; size: number; angle: number; opacity: number; color: RGB; pages: number[] | null }

/** One line of text across the middle of each chosen page (all pages when `pages` is null). */
export async function watermark(file: Uint8Array, o: WatermarkOpts, render?: TextRenderer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(file);
  const items: Item[] = [];
  doc.getPages().forEach((p, i) => {
    if (o.pages && !o.pages.includes(i)) return;
    // Centre the text's middle, not its baseline: lift the baseline by a third of the size along the text's perpendicular.
    const { w, h } = shown(p);
    const a = (o.angle * Math.PI) / 180;
    const lift = o.size / 3;
    items.push({ kind: 'text', page: i, text: o.text, x: 0.5 + (lift * Math.sin(a)) / w, y: 0.5 + (lift * Math.cos(a)) / h, size: o.size, color: o.color, opacity: o.opacity, rotate: o.angle, anchor: 'c', bold: true });
  });
  await drawItems(doc, items, render);
  return doc.save();
}
