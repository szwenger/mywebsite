import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { readJpeg, stripJpeg, readPng, stripPng, stripPdf, readPdf } from '../src/tools/meta/logic.ts';

const u8 = (...a) => Uint8Array.from(a);
const cat = (...p) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
const ascii = (s) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
const le16 = (n) => u8(n & 255, n >> 8), le32 = (n) => u8(n & 255, (n >> 8) & 255, (n >> 16) & 255, n >>> 24);

/** Little-endian TIFF with Make, Orientation and a GPS block (51°30'0" N, 0°7'30" W). */
function exif({ orientation = 1 } = {}) {
  const make = ascii('Acme\0');
  // IFD0 at 8: 3 entries (Make, Orientation, GPS ptr) = 2 + 36 + 4 = 42 -> ends at 50; make at 50..55; GPS IFD at 56
  const gpsAt = 56;
  const ifd0 = cat(le16(3),
    le16(0x010f), le16(2), le32(5), le32(50),
    le16(0x0112), le16(3), le32(1), le16(orientation), le16(0),
    le16(0x8825), le16(4), le32(1), le32(gpsAt), le32(0));
  // GPS IFD: 4 entries = 2 + 48 + 4 = 54 -> rationals at 56+54 = 110
  const latAt = 110, lonAt = 134;
  const gps = cat(le16(4),
    le16(1), le16(2), le32(2), ascii('N\0\0\0'),
    le16(2), le16(5), le32(3), le32(latAt),
    le16(3), le16(2), le32(2), ascii('W\0\0\0'),
    le16(4), le16(5), le32(3), le32(lonAt), le32(0));
  const rat = (n, d) => cat(le32(n), le32(d));
  const tiff = cat(ascii('II'), le16(42), le32(8), ifd0, make, u8(0), gps, rat(51, 1), rat(30, 1), rat(0, 1), rat(0, 1), rat(7, 1), rat(30, 1));
  return tiff;
}
const seg = (marker, body) => cat(u8(0xff, marker), u8((body.length + 2) >> 8, (body.length + 2) & 255), body);
const jpeg = (opts) => cat(u8(0xff, 0xd8), seg(0xe0, ascii('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')), seg(0xe1, cat(ascii('Exif\0\0'), exif(opts))), seg(0xfe, ascii('hello')), seg(0xe2, ascii('ICC_PROFILE\0data')), u8(0xff, 0xda, 0, 4, 1, 2, 9, 9, 9, 0xff, 0xd9));

test('readJpeg reads camera, orientation and GPS from EXIF', () => {
  const m = readJpeg(jpeg({ orientation: 6 }));
  assert.equal(m.find((e) => e.key === 'Make').value, 'Acme');
  assert.equal(m.find((e) => e.key === 'Orientation').value, '6');
  const gps = m.find((e) => e.key === 'GPS');
  assert.equal(gps.value, '51.500000, -0.125000');
  assert.ok(m.some((e) => e.key === 'Comment'));
});

test('stripJpeg removes EXIF, GPS and comments but keeps JFIF, the colour profile and the image data', () => {
  const out = stripJpeg(jpeg());
  const m = readJpeg(out);
  assert.equal(m.length, 0);
  const s = Buffer.from(out).toString('latin1');
  assert.ok(s.includes('JFIF') && s.includes('ICC_PROFILE') && !s.includes('Exif') && !s.includes('hello'));
  assert.deepEqual([...out.slice(-5)], [9, 9, 9, 0xff, 0xd9]);
});

test('stripJpeg keeps a rotated photo upright by leaving an orientation-only EXIF block', () => {
  const out = stripJpeg(jpeg({ orientation: 6 }));
  const m = readJpeg(out);
  assert.deepEqual(m.map((e) => e.key), ['Orientation']);
  assert.equal(m[0].value, '6');
});

test('stripJpeg leaves non-JPEG input alone by throwing', () => {
  assert.throws(() => stripJpeg(u8(1, 2, 3)));
});

const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const be32 = (n) => u8(n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255);
const chunk = (type, data) => cat(be32(data.length), ascii(type), data, be32(crc(cat(ascii(type), data))));
const png = () => cat(u8(137, 80, 78, 71, 13, 10, 26, 10), chunk('IHDR', u8(0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0)), chunk('tEXt', ascii('Author\0Jane')), chunk('tIME', u8(7, 234, 1, 2, 3, 4, 5)), chunk('gAMA', u8(0, 1, 0, 0)), chunk('IDAT', u8(1, 2, 3)), chunk('IEND', u8()));

test('readPng lists text chunks and the modification time', () => {
  const m = readPng(png());
  assert.equal(m.find((e) => e.key === 'Author').value, 'Jane');
  assert.ok(m.some((e) => e.key === 'Modified'));
});

test('stripPng drops text and time chunks and keeps the ones the picture needs', () => {
  const out = stripPng(png());
  const s = Buffer.from(out).toString('latin1');
  assert.ok(!s.includes('tEXt') && !s.includes('tIME') && !s.includes('Jane'));
  for (const t of ['IHDR', 'gAMA', 'IDAT', 'IEND']) assert.ok(s.includes(t), t);
  assert.equal(readPng(out).length, 0);
});

test('PDF: title, author and producer are read and then blanked', async () => {
  const d = await PDFDocument.create();
  d.addPage(); d.setTitle('Secret plan'); d.setAuthor('Jane'); d.setCreator('Word');
  const bytes = await d.save();
  const before = await readPdf(bytes);
  assert.equal(before.find((e) => e.key === 'Title').value, 'Secret plan');
  const after = await readPdf(await stripPdf(bytes));
  assert.ok(!after.some((e) => ['Title', 'Author', 'Creator'].includes(e.key)), JSON.stringify(after));
});
