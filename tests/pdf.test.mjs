import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, crc32 } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { parseRanges } from '../src/tools/pdf/ranges.ts';
import { merge, extract, rotate, imagesToPdf, loadInfo } from '../src/tools/pdf/ops.ts';

/** A PDF whose page i has width 100 + i * 10 and height 200, so pages can be told apart. */
async function makePdf(pages = 3, offset = 0) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([100 + (i + offset) * 10, 200]);
  return new Uint8Array(await doc.save());
}
const sizes = async (bytes) => (await PDFDocument.load(bytes)).getPages().map((p) => p.getWidth());

/** Minimal valid PNG: w×h, 8-bit grey, all black. */
function makePng(w, h) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; // depth 8, colour type 0
  const raw = Buffer.alloc((w + 1) * h); // filter byte 0 + w zero pixels per row
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}

test('parseRanges: lists, ranges, reversed ranges and duplicates, 1-based in and 0-based out', () => {
  assert.deepEqual(parseRanges('1-3,5', 5), { pages: [0, 1, 2, 4] });
  assert.deepEqual(parseRanges(' 1-3 , 5 ', 5), { pages: [0, 1, 2, 4] });
  assert.deepEqual(parseRanges('3-1', 5), { pages: [2, 1, 0] });
  assert.deepEqual(parseRanges('2,2,1', 5), { pages: [1, 1, 0] });
});

test('parseRanges: empty, syntax and out-of-range errors', () => {
  assert.deepEqual(parseRanges('', 5), { error: 'empty' });
  assert.deepEqual(parseRanges('  ', 5), { error: 'empty' });
  assert.deepEqual(parseRanges('a-b', 5), { error: 'syntax' });
  assert.deepEqual(parseRanges('1-', 5), { error: 'syntax' });
  assert.deepEqual(parseRanges('1,,2', 5), { error: 'syntax' });
  assert.deepEqual(parseRanges('0', 5), { error: 'out-of-range' });
  assert.deepEqual(parseRanges('6', 5), { error: 'out-of-range' });
  assert.deepEqual(parseRanges('4-9', 5), { error: 'out-of-range' });
});

test('merge puts two 3-page PDFs into one 6-page PDF, in order', async () => {
  const out = await merge([await makePdf(3, 0), await makePdf(3, 10)]);
  assert.deepEqual(await sizes(out), [100, 110, 120, 200, 210, 220]);
});

test('extract keeps the requested pages in the requested order', async () => {
  const out = await extract(await makePdf(3), [2, 0]);
  assert.deepEqual(await sizes(out), [120, 100]);
});

test('rotate turns only the chosen pages and adds to an existing rotation', async () => {
  const once = await rotate(await makePdf(3), [1], 90);
  const rot = async (b) => (await PDFDocument.load(b)).getPages().map((p) => p.getRotation().angle);
  assert.deepEqual(await rot(once), [0, 90, 0]);
  assert.deepEqual(await rot(await rotate(once, [1], 270)), [0, 0, 0], '90 + 270 wraps to 0');
});

test('imagesToPdf makes one page per image, sized to the image', async () => {
  const out = await imagesToPdf([{ bytes: makePng(10, 20), type: 'image/png' }, { bytes: makePng(30, 5), type: 'image/png' }]);
  const pages = (await PDFDocument.load(out)).getPages();
  assert.deepEqual(pages.map((p) => [p.getWidth(), p.getHeight()]), [[10, 20], [30, 5]]);
});

test('loadInfo reports the page count, and invalid for bytes that are not a PDF', async () => {
  assert.deepEqual(await loadInfo(await makePdf(3)), { pageCount: 3 });
  assert.deepEqual(await loadInfo(new Uint8Array([1, 2, 3, 4, 5])), { error: 'invalid' });
  assert.deepEqual(await loadInfo(new Uint8Array(0)), { error: 'invalid' });
});

test('loadInfo reports encrypted for a PDF whose trailer has /Encrypt', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.context.trailerInfo.Encrypt = doc.context.register(doc.context.obj({ Filter: 'Standard' }));
  const bytes = new Uint8Array(await doc.save());
  assert.deepEqual(await loadInfo(bytes), { error: 'encrypted' });
});

test('oneAtATime: calls made while one is running are dropped, so no edit is built on a stale document', async () => {
  const { oneAtATime } = await import('../src/tools/pdf/busy.ts');
  let release;
  const calls = [];
  const run = oneAtATime(async (n) => { calls.push(n); if (n === 1) await new Promise((r) => { release = r; }); });
  const first = run(1);
  assert.equal(await run(2), false, 'second click while busy is ignored');
  release();
  assert.equal(await first, true);
  assert.equal(await run(3), true, 'free again afterwards');
  assert.deepEqual(calls, [1, 3]);
  const failing = oneAtATime(async () => { throw new Error('boom'); });
  await assert.rejects(failing());
  assert.equal(await oneAtATime(async () => {})(), true);
  await assert.rejects(failing(), 'a failure releases the lock');
});
