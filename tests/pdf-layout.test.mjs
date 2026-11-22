import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, degrees } from 'pdf-lib';
import { PAGE_SIZES, reverseOrder, everyOther, splitGroups, bookletSides, sheetsOf, cropPages, layoutSheets, nUp, booklet, insertBlanks } from '../src/tools/pdf/layout.ts';
import { shown } from '../src/tools/pdf/stamp.ts';

async function makePdf(sizes) {
  const doc = await PDFDocument.create();
  for (const s of sizes) doc.addPage(s);
  return new Uint8Array(await doc.save());
}
const dims = async (bytes) => (await PDFDocument.load(bytes)).getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);

test('page orders', () => {
  assert.deepEqual(reverseOrder(4), [3, 2, 1, 0]);
  assert.deepEqual(everyOther(5, true), [0, 2, 4]);
  assert.deepEqual(everyOther(5, false), [1, 3]);
});

test('split groups', () => {
  assert.deepEqual(splitGroups(7, { every: 3 }), [[0, 1, 2], [3, 4, 5], [6]]);
  assert.deepEqual(splitGroups(2, { every: 1 }), [[0], [1]]);
  assert.deepEqual(splitGroups(2, { every: 0 }), [[0], [1]]);
  assert.deepEqual(splitGroups(9, { ranges: [[0, 1], [8]] }), [[0, 1], [8]]);
});

test('booklet order for 8 pages and for a count that needs padding', () => {
  // 8 pages: sheet 1 front 8|1, back 2|7; sheet 2 front 6|3, back 4|5 (1-based)
  assert.deepEqual(bookletSides(8).map(([a, b]) => [a + 1, b + 1]), [[8, 1], [2, 7], [6, 3], [4, 5]]);
  assert.deepEqual(bookletSides(5).map(([a, b]) => [a, b]), [[-1, 0], [1, -1], [-1, 2], [3, 4]]);
  assert.deepEqual(sheetsOf([0, 1, 2, 3, 4], 2), [[0, 1], [2, 3], [4]]);
});

test('cropping shrinks the boxes; rotated pages map the margins to what you see', async () => {
  const out = await cropPages(await makePdf([[200, 300], [200, 300]]), { top: 10, right: 20, bottom: 30, left: 40 }, [0]);
  assert.deepEqual(await dims(out), [[140, 260], [200, 300]]);
  const doc = await PDFDocument.load(out);
  const box = doc.getPages()[0].getCropBox();
  assert.deepEqual([box.x, box.y], [40, 30]);
  // page turned 90° clockwise: the displayed top is the user-space left edge
  const r = await PDFDocument.create();
  r.addPage([200, 300]).setRotation(degrees(90));
  const out2 = await PDFDocument.load(await cropPages(new Uint8Array(await r.save()), { top: 10, right: 0, bottom: 0, left: 0 }, null));
  const b2 = out2.getPages()[0].getCropBox();
  assert.deepEqual([b2.x, b2.y, b2.width, b2.height], [10, 0, 190, 300]);
  await assert.rejects(cropPages(await makePdf([[100, 100]]), { top: 0, right: 60, bottom: 0, left: 60 }, null), { message: 'too-much' });
});

test('resize to A4 puts every page on an A4 sheet', async () => {
  const f = await makePdf([[100, 100], [600, 300], [300, 600]]);
  const out = await layoutSheets(f, [[0], [1], [2]], { size: PAGE_SIZES.A4, landscape: false, cols: 1, rows: 1, margin: 0, gap: 0, border: false });
  assert.deepEqual(await dims(out), [[595, 842], [595, 842], [595, 842]]);
});

test('N-up: 4 per sheet, last sheet partly empty; a landscape sheet swaps the size', async () => {
  const f = await makePdf(Array(5).fill([300, 400]));
  const out = await nUp(f, 4, { size: PAGE_SIZES.A4, landscape: true, cols: 2, rows: 2, margin: 10, gap: 5, border: true });
  assert.deepEqual(await dims(out), [[842, 595], [842, 595]]);
  const first = await nUp(f, 2, { size: 'first', landscape: false, cols: 2, rows: 1, margin: 0, gap: 0, border: false });
  assert.deepEqual(await dims(first), [[300, 400], [300, 400], [300, 400]]);
});

test('booklet makes landscape sheets, two pages per side', async () => {
  const out = await booklet(await makePdf(Array(6).fill([200, 300])), 'first');
  assert.equal((await PDFDocument.load(out)).getPageCount(), 4); // 6 pages -> padded to 8 -> 4 sides
  assert.deepEqual((await dims(out))[0], [400, 300]);
});

test('blank pages copy the size of the page before', async () => {
  const f = await makePdf([[100, 100], [200, 300], [50, 50]]);
  const out = await insertBlanks(f, [0, 1]);
  assert.deepEqual(await dims(out), [[100, 100], [100, 100], [200, 300], [200, 300], [50, 50]]);
  assert.deepEqual(await dims(await insertBlanks(f, [-1])), [[100, 100], [100, 100], [200, 300], [50, 50]]);
  assert.deepEqual(shown((await PDFDocument.load(f)).getPages()[1]), { w: 200, h: 300, rot: 0 });
});
