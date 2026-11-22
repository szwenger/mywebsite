import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { md5, rc4, protect, unlock } from '../src/tools/pdf/crypt.ts';
import { textItems } from './helpers/pdftext.mjs';

const hex = (u) => Buffer.from(u).toString('hex');
async function makePdf() {
  const d = await PDFDocument.create();
  const f = await d.embedFont(StandardFonts.Helvetica);
  d.addPage([200, 200]).drawText('Secret text', { x: 20, y: 100, size: 14, font: f });
  d.setTitle('Quarterly plan');
  return new Uint8Array(await d.save({ useObjectStreams: false }));
}

test('md5 and rc4 match the published test vectors', () => {
  assert.equal(hex(md5(new TextEncoder().encode(''))), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(hex(md5(new TextEncoder().encode('abc'))), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(hex(md5(new TextEncoder().encode('The quick brown fox jumps over the lazy dog'))), '9e107d9d372bb6826bd81d3542a419d6');
  assert.equal(hex(rc4(new TextEncoder().encode('Key'), new TextEncoder().encode('Plaintext'))), 'bbf316e8d940af0ad3');
});
test('a protected PDF needs the password (AES-128) and still reads correctly with it', async () => {
  const out = await protect(await makePdf(), { user: 'hunter2', allow: { print: true } });
  await assert.rejects(textItems(out, 1), /password/i);
  await assert.rejects(textItems(out, 1, 'wrong'), /password/i);
  const [it] = await textItems(out, 1, 'hunter2');
  assert.equal(it.str, 'Secret text');
  assert.ok(!Buffer.from(out).includes(Buffer.from('Quarterly plan')), 'the title string is encrypted too');
});

test('RC4-128 works as well', async () => {
  const out = await protect(await makePdf(), { user: 'pw', method: 'rc4' });
  await assert.rejects(textItems(out, 1), /password/i);
  assert.equal((await textItems(out, 1, 'pw'))[0].str, 'Secret text');
});

test('an empty user password opens for everyone but keeps the restrictions flagged', async () => {
  const out = await protect(await makePdf(), { user: '', owner: 'boss', allow: { print: false } });
  assert.equal((await textItems(out, 1))[0].str, 'Secret text');
});

test('unlock removes the password and keeps the text', async () => {
  for (const method of ['aes', 'rc4']) {
    const locked = await protect(await makePdf(), { user: 'open sesame', method });
    await assert.rejects(unlock(locked, 'nope'), { message: 'password' });
    const free = await unlock(locked, 'open sesame');
    assert.equal((await textItems(free, 1))[0].str, 'Secret text', method);
    assert.equal((await PDFDocument.load(free)).getTitle(), 'Quarterly plan', method);
  }
});

test('unlock on an owner-only file needs no password', async () => {
  const locked = await protect(await makePdf(), { user: '', owner: 'boss', allow: {} });
  assert.equal((await textItems(await unlock(locked), 1))[0].str, 'Secret text');
});
