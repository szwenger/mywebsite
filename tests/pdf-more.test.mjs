import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, crc32 } from 'node:zlib';
import { PDFDocument, StandardFonts, PDFName } from 'pdf-lib';
import { listFields, fillForm, flattenForm, getInfo, setInfo, stripInfo, stripAnnotations, alternate, overlay, recompressImages, optimize } from '../src/tools/pdf/more.ts';
import { inkRatio, isBlank, contentBox, toGray, invert } from '../src/tools/pdf/pixels.ts';
import { buildDocx, pageText } from '../src/tools/pdf/textout.ts';
import { textItems } from './helpers/pdftext.mjs';

const pdfWith = async (texts) => {
  const d = await PDFDocument.create();
  const f = await d.embedFont(StandardFonts.Helvetica);
  for (const t of texts) d.addPage([200, 200]).drawText(t, { x: 20, y: 100, size: 14, font: f });
  return new Uint8Array(await d.save());
};
const texts = async (b, n) => { const out = []; for (let i = 1; i <= n; i++) out.push((await textItems(b, i))[0]?.str ?? ''); return out; };

test('form fields can be listed, filled and flattened', async () => {
  const d = await PDFDocument.create();
  const p = d.addPage([300, 300]);
  const form = d.getForm();
  form.createTextField('name').addToPage(p, { x: 20, y: 240, width: 150, height: 20 });
  form.createCheckBox('agree').addToPage(p, { x: 20, y: 200, width: 15, height: 15 });
  const dd = form.createDropdown('size'); dd.addOptions(['S', 'M', 'L']); dd.addToPage(p, { x: 20, y: 160, width: 80, height: 20 });
  const file = new Uint8Array(await d.save());
  const fields = await listFields(file);
  assert.deepEqual(fields.map((f) => [f.name, f.type]), [['name', 'text'], ['agree', 'check'], ['size', 'dropdown']]);
  assert.deepEqual(fields[2].options, ['S', 'M', 'L']);
  const r = await fillForm(file, { name: 'Ann Example', agree: true, size: 'M', missing: 'x' }, false);
  assert.deepEqual(r.skipped, ['missing']);
  const filled = await listFields(r.bytes);
  assert.deepEqual(filled.map((f) => f.value), ['Ann Example', true, 'M']);
  const flat = await flattenForm(r.bytes);
  assert.equal((await listFields(flat)).length, 0);
  assert.ok((await textItems(flat, 1)).some((i) => i.str.includes('Ann Example')), 'the filled text is now page content');
});

test('document information: read, write, strip', async () => {
  const file = await pdfWith(['x']);
  const out = await setInfo(file, { title: 'Plan', author: 'Ann', subject: 'S', keywords: 'a, b; c', creator: 'me', producer: 'tool' });
  assert.deepEqual(await getInfo(out), { title: 'Plan', author: 'Ann', subject: 'S', keywords: 'a b c', creator: 'me', producer: 'tool' });
  const bare = await getInfo(await stripInfo(out));
  assert.deepEqual(Object.values(bare), ['', '', '', '', '', '']);
});

test('annotations can be removed', async () => {
  const d = await PDFDocument.create();
  const p = d.addPage([100, 100]);
  p.node.set(PDFName.of('Annots'), d.context.obj([d.context.obj({ Type: 'Annot', Subtype: 'Text', Rect: [0, 0, 10, 10] })]));
  const out = await stripAnnotations(new Uint8Array(await d.save()));
  assert.equal((await PDFDocument.load(out)).getPages()[0].node.has(PDFName.of('Annots')), false);
});

test('alternate interleaves two documents, optionally with the second reversed', async () => {
  const a = await pdfWith(['a1', 'a2', 'a3']);
  const b = await pdfWith(['b1', 'b2']);
  assert.deepEqual(await texts(await alternate(a, b), 5), ['a1', 'b1', 'a2', 'b2', 'a3']);
  assert.deepEqual(await texts(await alternate(a, b, true), 5), ['a1', 'b2', 'a2', 'b1', 'a3']);
});

test('overlay puts one document on every page of another', async () => {
  const base = await pdfWith(['page1', 'page2', 'page3']);
  const top = await pdfWith(['STAMP']);
  const out = await overlay(base, top, { under: false, cycle: false, opacity: 1 });
  assert.equal((await PDFDocument.load(out)).getPageCount(), 3);
  for (let i = 1; i <= 3; i++) assert.deepEqual((await textItems(out, i)).map((x) => x.str).sort(), [`page${i}`, 'STAMP'].sort());
});

function pngRgb(w, h) {
  const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]); const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let i = 0; i < raw.length; i++) raw[i] = i % (w * 3 + 1) === 0 ? 0 : (i * 37) & 255; // noisy: compresses badly
  return new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 0 })), chunk('IEND', Buffer.alloc(0))]));
}

test('image recompression swaps big images for the encoder output and leaves small gains alone', async () => {
  const d = await PDFDocument.create();
  const img = await d.embedPng(pngRgb(64, 64));
  d.addPage([100, 100]).drawImage(img, { x: 0, y: 0, width: 100, height: 100 });
  const file = new Uint8Array(await d.save());
  const seen = [];
  const r = await recompressImages(file, async (i) => { seen.push([i.kind, i.width, i.height, i.comps, i.bytes.length]); return { bytes: new Uint8Array(500).fill(7), width: 32, height: 32 }; });
  assert.deepEqual(seen, [['raw', 64, 64, 3, 64 * 64 * 3]]);
  assert.equal(r.replaced, 1);
  assert.ok(r.bytes.length < file.length);
  const back = await PDFDocument.load(r.bytes);
  assert.equal(back.getPageCount(), 1);
  const none = await recompressImages(file, async () => ({ bytes: new Uint8Array(20000), width: 64, height: 64 }));
  assert.equal(none.replaced, 0);
  assert.equal((await recompressImages(file, async () => null)).replaced, 0);
});

test('optimize keeps the pages', async () => {
  const out = await optimize(await pdfWith(['a', 'b']));
  assert.deepEqual(await texts(out, 2), ['a', 'b']);
});

test('pixel helpers', () => {
  const w = 10, h = 10;
  const white = new Uint8ClampedArray(w * h * 4).fill(255);
  assert.equal(isBlank(white), true);
  assert.equal(contentBox(white, w, h), null);
  const page = white.slice();
  for (const [x, y] of [[2, 3], [6, 7], [4, 5]]) { const i = (y * w + x) * 4; page[i] = page[i + 1] = page[i + 2] = 0; }
  assert.equal(inkRatio(page), 0.03);
  assert.equal(isBlank(page), false);
  assert.deepEqual(contentBox(page, w, h), { x: 2, y: 3, w: 5, h: 5 });
  const px = Uint8ClampedArray.of(200, 100, 50, 255);
  toGray(px); assert.deepEqual([...px], [124, 124, 124, 255]);
  invert(px); assert.deepEqual([...px], [131, 131, 131, 255]);
});

test('docx builder and text joining', () => {
  const z = buildDocx(['Hello & <you>\nline two', 'page two']);
  const s = Buffer.from(z).toString('latin1');
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']) assert.ok(s.includes(name), name);
  assert.ok(s.includes('Hello &amp; &lt;you&gt;') && s.includes('w:type="page"'));
  assert.equal(pageText([{ str: 'Hello ', hasEOL: false }, { str: 'world ', hasEOL: true }, { str: 'next' }]), 'Hello world\nnext');
});
