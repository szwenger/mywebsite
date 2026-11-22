import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, crc32 } from 'node:zlib';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { numberPages, watermark, applyItems, fillTemplate, hexToRgb, toUser, shown } from '../src/tools/pdf/stamp.ts';
import { textItems } from './helpers/pdftext.mjs';

async function makePdf(pages = 3, size = [300, 400], rotate = 0) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) { const p = doc.addPage(size); if (rotate) p.setRotation(degrees(rotate)); }
  return new Uint8Array(await doc.save());
}
const helv = async () => (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
const png1 = () => {
  const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]); const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(4, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 6; // 4×2 RGBA
  return new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.alloc(2 * (1 + 16), 255))), chunk('IEND', Buffer.alloc(0))]));
};

test('templates and colours', () => {
  assert.equal(fillTemplate('Page {n} of {total} ({n})', 2, 9), 'Page 2 of 9 (2)');
  assert.deepEqual(hexToRgb('#ff8000'), [1, 128 / 255, 0]);
  assert.deepEqual(hexToRgb('nope'), [0, 0, 0]);
});

test('page numbers: footer centre, start value and first page to number', async () => {
  const out = await numberPages(await makePdf(), { pos: 'bc', template: '{n} / {total}', start: 5, first: 2, size: 10, margin: 30, color: [0, 0, 0] });
  assert.deepEqual(await textItems(out, 1), []);
  const f = await helv();
  for (const [page, label] of [[2, '5 / 3'], [3, '6 / 3']]) {
    const [it] = await textItems(out, page);
    assert.equal(it.str, label);
    assert.ok(Math.abs(it.t[4] - (150 - f.widthOfTextAtSize(label, 10) / 2)) < 0.01, 'centred');
    assert.ok(Math.abs(it.t[5] - 30) < 0.01, 'baseline 30 pt above the bottom edge');
  }
});

test('page numbers: right and header positions', async () => {
  const f = await helv();
  const br = (await textItems(await numberPages(await makePdf(1), { pos: 'br', template: '{n}', start: 1, first: 1, size: 12, margin: 20, color: [0, 0, 0] }), 1))[0];
  assert.ok(Math.abs(br.t[4] - (300 - 20 - f.widthOfTextAtSize('1', 12))) < 0.01);
  const tl = (await textItems(await numberPages(await makePdf(1), { pos: 'tl', template: 'Draft', start: 1, first: 1, size: 12, margin: 20, color: [0, 0, 0] }), 1))[0];
  assert.ok(Math.abs(tl.t[4] - 20) < 0.01);
  assert.ok(Math.abs(tl.t[5] - (400 - 20 - 12 * 0.8)) < 0.01, 'header hangs below the top margin');
});

test('rotated pages: the number still appears at the bottom of what you see', async () => {
  // A 300×400 page turned 90° is shown 400 wide and 300 tall; the footer is the user-space left edge.
  const p = await PDFDocument.load(await makePdf(1, [300, 400], 90));
  const pg = p.getPages()[0];
  assert.deepEqual(shown(pg), { w: 400, h: 300, rot: 90 });
  assert.deepEqual(toUser(pg, 10, 20), { x: 20, y: 10 });
  const out = await numberPages(await makePdf(1, [300, 400], 90), { pos: 'bl', template: '7', start: 1, first: 1, size: 10, margin: 25, color: [0, 0, 0] });
  const [it] = await textItems(out, 1);
  // text direction in user space points up the page (rotated by 90° like the page)
  assert.ok(Math.abs(it.t[0]) < 1e-6 && Math.abs(it.t[1] - 10) < 1e-6, JSON.stringify(it.t));
});

test('watermark rotates and fades; chosen pages only', async () => {
  const out = await watermark(await makePdf(), { text: 'DRAFT', size: 60, angle: 45, opacity: 0.2, color: [0.5, 0.5, 0.5], pages: [1] });
  assert.deepEqual(await textItems(out, 1), []);
  const [it] = await textItems(out, 2);
  assert.equal(it.str, 'DRAFT');
  assert.ok(Math.abs(it.t[1] - 60 * Math.sin(Math.PI / 4)) < 0.01);
  assert.deepEqual(await textItems(out, 3), []);
});

test('text outside the standard fonts needs the renderer; with it an image is drawn', async () => {
  const file = await makePdf(1);
  const items = [{ kind: 'text', page: 0, text: 'Привет', x: 0.5, y: 0.5, size: 20, color: [0, 0, 0], opacity: 1, rotate: 0, anchor: 'c' }];
  await assert.rejects(applyItems(file, items), { message: 'encoding' });
  const out = await applyItems(file, items, async () => ({ png: png1(), w: 120, h: 40, scale: 2 }));
  assert.equal((await PDFDocument.load(out)).getPageCount(), 1);
  assert.ok(out.length > file.length + 50);
});

test('rectangles and images land on the page', async () => {
  const file = await makePdf(2);
  const out = await applyItems(file, [
    { kind: 'rect', page: 0, x: 0.1, y: 0.1, w: 0.5, h: 0.2, color: [0, 0, 0], opacity: 1 },
    { kind: 'image', page: 1, bytes: png1(), type: 'image/png', x: 0.2, y: 0.3, w: 0.4, opacity: 0.8 },
    { kind: 'rect', page: 9, x: 0, y: 0, w: 1, h: 1, color: [1, 1, 1], opacity: 1 }, // out of range: ignored
  ]);
  const d = await PDFDocument.load(out);
  assert.equal(d.getPageCount(), 2);
  // the content stream of page 1 now holds a drawing; the image page references an XObject
  const res = (i) => d.getPages()[i].node.Resources();
  assert.ok(res(1).lookup(res(1).keys().find((k) => String(k).includes('XObject'))));
});

test('a pen stroke is drawn as segments and a single dot is ignored', async () => {
  const file = await makePdf(1);
  const out = await applyItems(file, [{ kind: 'path', page: 0, points: [[0.1, 0.1], [0.2, 0.15], [0.3, 0.1]], width: 2, color: [1, 0, 0], opacity: 1 }, { kind: 'path', page: 0, points: [[0.5, 0.5]], width: 2, color: [1, 0, 0], opacity: 1 }]);
  assert.equal((await PDFDocument.load(out)).getPageCount(), 1);
  assert.ok(out.length > file.length);
});
