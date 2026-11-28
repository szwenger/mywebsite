// Puts recognised words onto the original pages as invisible text, so the page stays exactly as it was and becomes searchable and copyable.
// Same technique as Tesseract's own PDF writer: text render mode 3, a Type0 Identity-H font whose glyphs are all empty, and a ToUnicode map.
import { PDFDocument, PDFName, PDFRef } from 'pdf-lib';
import { buildTtf } from '../handfont/ttf.ts';
import { shown, toUser } from './stamp.ts';

/** A word and its box in pixels, origin top left of the rendered image. */
export interface OcrWord { text: string; x0: number; y0: number; x1: number; y1: number }
/** The words of one page (`index` counts from 0 in the document) and the pixel size of the image they were measured on. */
export interface OcrPage { index: number; imgW: number; imgH: number; words: OcrWord[] }

const FONT = 'OcrF';
const DESCENT = 0.2; // part of the box height below the baseline

const num = (v: number) => String(Math.round(v * 1000) / 1000);
const hex4 = (s: string) => Array.from({ length: s.length }, (_, i) => s.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')).join('');

/** Content-stream text for one word. `k` is displayed points per image pixel, `to` maps displayed points (right/down from the top left) to page space.
 *  Returns '' for words that cannot be placed. */
export function wordOps(w: OcrWord, k: { sx: number; sy: number }, to: (dx: number, dy: number) => { x: number; y: number }): string {
  const text = w.text.trim();
  const bw = (w.x1 - w.x0) * k.sx, bh = (w.y1 - w.y0) * k.sy;
  if (!text || !(bw > 0) || !(bh > 0)) return '';
  const n = text.length; // one 2-byte code per UTF-16 unit, each 1 em wide
  const tz = (100 * bw) / (n * bh);
  const o = to(0, 0), ex = to(1, 0), ey = to(0, -1); // the displayed right and up directions in page space
  const p = to(w.x0 * k.sx, w.y1 * k.sy - DESCENT * bh);
  const m = [ex.x - o.x, ex.y - o.y, ey.x - o.x, ey.y - o.y, p.x, p.y].map(num).join(' ');
  return `BT 3 Tr /${FONT} ${num(bh)} Tf ${num(tz)} Tz ${m} Tm <${hex4(text)}> Tj ET\n`;
}

/** Every 2-byte code means the same Unicode value, so copying gives back the text that was written. */
export function toUnicodeCMap(): string {
  return `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
1 beginbfrange
<0000> <FFFF> <0000>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end
`;
}

function addFont(doc: PDFDocument): PDFRef {
  const cx = doc.context;
  const ttf = buildTtf({ family: 'GlyphLess', unitsPerEm: 1000, ascender: 1000, descender: 0, spaceAdvance: 1000, chars: [] });
  const fontFile = cx.register(cx.flateStream(ttf, { Length1: ttf.length }));
  const toUni = cx.register(cx.flateStream(toUnicodeCMap()));
  const cidToGid = cx.register(cx.flateStream(new Uint8Array(131072))); // every code to glyph 0
  const descriptor = cx.register(cx.obj({
    Type: 'FontDescriptor', FontName: 'GlyphLessFont', Flags: 5, FontBBox: [0, 0, 500, 1000],
    ItalicAngle: 0, Ascent: 1000, Descent: 0, CapHeight: 1000, StemV: 80, FontFile2: fontFile,
  }));
  const cid = cx.register(cx.obj({
    Type: 'Font', Subtype: 'CIDFontType2', BaseFont: 'GlyphLessFont',
    CIDSystemInfo: { Registry: 'Adobe', Ordering: 'Identity', Supplement: 0 },
    FontDescriptor: descriptor, DW: 1000, CIDToGIDMap: cidToGid,
  }));
  return cx.register(cx.obj({
    Type: 'Font', Subtype: 'Type0', BaseFont: 'GlyphLessFont', Encoding: 'Identity-H', DescendantFonts: [cid], ToUnicode: toUni,
  }));
}

/** Adds the invisible text to the listed pages. Pages without placeable words are left alone; the pages' own content is never touched. */
export async function addTextLayer(pdf: Uint8Array, pages: OcrPage[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf);
  const cx = doc.context;
  let font: PDFRef | undefined;
  for (const op of pages) {
    const page = doc.getPages()[op.index];
    if (!page || !(op.imgW > 0) || !(op.imgH > 0)) continue;
    const s = shown(page);
    const k = { sx: s.w / op.imgW, sy: s.h / op.imgH };
    const to = (dx: number, dy: number) => toUser(page, dx, dy);
    const ops = op.words.map((w) => wordOps(w, k, to)).join('');
    if (!ops) continue;
    font ??= addFont(doc);
    // q/Q around the original content, so a page that leaves its graphics state unbalanced cannot skew our text.
    page.node.wrapContentStreams(cx.register(cx.stream('q\n')), cx.register(cx.stream('Q\n')));
    page.node.setFontDictionary(PDFName.of(FONT), font);
    page.node.addContentStream(cx.register(cx.stream(`q\n${ops}Q\n`)));
  }
  return doc.save();
}
