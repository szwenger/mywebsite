import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, degrees } from 'pdf-lib';
import { wordOps, toUnicodeCMap, addTextLayer } from '../src/tools/pdf/ocrlayer.ts';
import { toUser, shown } from '../src/tools/pdf/stamp.ts';
import { textItems } from './helpers/pdftext.mjs';

const W = (text, x0, y0, x1, y1) => ({ text, x0, y0, x1, y1 });
const hex = (s) => [...s].map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join('');
const nums = (ops) => /\[?\s*([-\d. ]+) Tm/.exec(ops)[1].trim().split(/\s+/).map(Number);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 0.01, `${m}: ${a} vs ${b}`);

async function pdf(size = [612, 792], rotate = 0, pages = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage(size);
    p.drawText('original', { x: 20, y: 20, size: 10 });
    if (rotate) p.setRotation(degrees(rotate));
  }
  return new Uint8Array(await doc.save());
}
const pageTo = async (bytes, i = 0) => { const p = (await PDFDocument.load(bytes)).getPage(i); return { p, to: (dx, dy) => toUser(p, dx, dy), s: shown(p) }; };

test('places a word inside its box: position, size from box height, Tz stretches it to the box width', async () => {
  const { to } = await pageTo(await pdf());
  const ops = wordOps(W('Hello', 100, 200, 300, 240), { sx: 0.5, sy: 0.5 }, to);
  assert.match(ops, /\b3 Tr\b/);
  assert.ok(ops.includes(`<${hex('Hello')}> Tj`), ops);
  const m = nums(ops);
  near(m[4], 50, 'x'); near(m[5], 792 - (120 - 0.2 * 20), 'baseline y');
  near(m[0], 1, 'a'); near(m[3], 1, 'd');
  const size = Number(/([\d.]+) Tf/.exec(ops)[1]);
  near(size, 20, 'font size');
  const tz = Number(/([\d.]+) Tz/.exec(ops)[1]);
  near(5 * size * tz / 100, 100, 'word width in points'); // 5 chars at 1000/1000 em each
});

test('rotated pages: the word lands on the visible words (90 and 270)', async () => {
  for (const rot of [90, 270, 180]) {
    const { to, s } = await pageTo(await pdf([400, 600], rot));
    const k = { sx: s.w / 800, sy: s.h / 1200 };
    const ops = wordOps(W('Hi', 100, 200, 140, 230), k, to);
    const m = nums(ops);
    const base = to(100 * k.sx, 230 * k.sy - 0.2 * 30 * k.sy);
    near(m[4], base.x, `x at ${rot}`); near(m[5], base.y, `y at ${rot}`);
    const ex = to(1, 0), o = to(0, 0), ey = to(0, -1);
    near(m[0], ex.x - o.x, `a at ${rot}`); near(m[1], ex.y - o.y, `b at ${rot}`);
    near(m[2], ey.x - o.x, `c at ${rot}`); near(m[3], ey.y - o.y, `d at ${rot}`);
  }
  // concrete: at 90 degrees the text runs up the page's own y axis
  const { to } = await pageTo(await pdf([400, 600], 90));
  const m = nums(wordOps(W('Hi', 0, 0, 40, 30), { sx: 1, sy: 1 }, to));
  assert.deepEqual([m[0], m[1], m[2], m[3]].map((v) => Math.round(v)), [0, 1, -1, 0]);
});

test('mixed sizes: every page is scaled from its own image size', async () => {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]); doc.addPage([400, 400]);
  const out = await addTextLayer(new Uint8Array(await doc.save()), [
    { index: 0, imgW: 400, imgH: 400, words: [W('A', 40, 40, 80, 80)] },
    { index: 1, imgW: 400, imgH: 400, words: [W('B', 40, 40, 80, 80)] },
  ]);
  const a = (await textItems(out, 1))[0], b = (await textItems(out, 2))[0];
  near(a.t[4], 20, 'page 1 x'); near(b.t[4], 40, 'page 2 x');
  near(Math.abs(a.t[3]), 20, 'page 1 size'); near(Math.abs(b.t[3]), 40, 'page 2 size');
});

test('nothing is escaped away or dropped: brackets, backslash, angle brackets, umlauts, Cyrillic, emoji', async () => {
  const { to } = await pageTo(await pdf());
  for (const t of ['a(b)c', 'a\b', '<x>', 'Grüße', 'Привет', '😀']) {
    const ops = wordOps(W(t, 0, 0, 100, 20), { sx: 1, sy: 1 }, to);
    const units = [...t].flatMap((c) => [...Array(c.length).keys()].map((i) => c.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'))).join('');
    assert.ok(ops.includes(`<${units}> Tj`), t);
  }
  const hexOf = (t) => /<([0-9A-F]+)> Tj/.exec(wordOps(W(t, 0, 0, 100, 20), { sx: 1, sy: 1 }, to))[1];
  assert.equal(hexOf('😀'), 'D83DDE00');
});

test('empty and blank words are skipped; a page with no words gets no content stream', async () => {
  const { to } = await pageTo(await pdf());
  assert.equal(wordOps(W('   ', 0, 0, 10, 10), { sx: 1, sy: 1 }, to), '');
  assert.equal(wordOps(W('', 0, 0, 10, 10), { sx: 1, sy: 1 }, to), '');
  assert.equal(wordOps(W('x', 5, 5, 5, 10), { sx: 1, sy: 1 }, to), ''); // zero width
  const src = await pdf([300, 300], 0, 2);
  const out = await addTextLayer(src, [{ index: 0, imgW: 300, imgH: 300, words: [] }, { index: 1, imgW: 300, imgH: 300, words: [W(' ', 0, 0, 10, 10)] }]);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 2);
  const fonts = (i) => doc.getPage(i).node.Resources()?.lookup(PDFName.of('Font'));
  assert.ok(!fonts(0)?.has(PDFName.of('OcrF')) && !fonts(1)?.has(PDFName.of('OcrF')), 'no font added when there is nothing to write');
});

test('toUnicode maps every code to itself: Latin, umlauts, Cyrillic', () => {
  const c = toUnicodeCMap();
  assert.match(c, /<0000>\s*<FFFF>/);
  assert.match(c, /beginbfrange\s*<0000>\s*<FFFF>\s*<0000>\s*endbfrange/);
  assert.match(c, /begincodespacerange\s*<0000>\s*<FFFF>\s*endcodespacerange/);
});

test('the result loads, keeps the original page content, and pdf.js reads the new text back (incl. Cyrillic) in place', async () => {
  const src = await pdf([612, 792], 0, 2);
  const out = await addTextLayer(src, [{ index: 0, imgW: 1224, imgH: 1584, words: [W('Привет', 100, 200, 300, 240), W('Grüße', 320, 200, 500, 240)] }]);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 2);
  const font = doc.getPage(0).node.Resources().lookup(PDFName.of('Font')).lookup(PDFName.of('OcrF'));
  assert.ok(font.has(PDFName.of('ToUnicode')) && font.lookup(PDFName.of('Encoding')).toString() === '/Identity-H', 'Identity-H font with a ToUnicode map');
  const items = (await textItems(out, 1)).map((i) => i.str).join(' ');
  assert.match(items, /Привет/); assert.match(items, /Grüße/); assert.match(items, /original/);
  const second = (await textItems(out, 2)).map((i) => i.str).join(' ');
  assert.equal(second.trim(), 'original');
  const hello = (await textItems(out, 1)).find((i) => i.str.includes('Привет'));
  near(hello.t[4], 50, 'x in user space');
});
