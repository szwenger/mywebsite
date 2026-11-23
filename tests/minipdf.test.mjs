import test from 'node:test';
import assert from 'node:assert/strict';
import { imagePdf } from '../src/tools/minipdf.ts';

test('imagePdf writes a PDF whose xref offsets point at the objects', async () => {
  const rgb = new Uint8Array(2 * 2 * 3).fill(255);
  const pdf = await imagePdf(rgb, 2, 2, 150, 75.5);
  const text = Buffer.from(pdf).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.match(text, /\/MediaBox \[0 0 150 75\.5\]/);
  assert.match(text, /\/Width 2 \/Height 2/);
  const table = /xref\n0 (\d+)\n([\s\S]*?)trailer/.exec(text);
  assert.equal(Number(table[1]), 6);
  const rows = table[2].trim().split('\n').slice(1);
  rows.forEach((row, i) => {
    const off = Number(row.slice(0, 10));
    assert.ok(text.slice(off).startsWith(`${i + 1} 0 obj`), `object ${i + 1}`);
  });
  const start = Number(/startxref\n(\d+)/.exec(text)[1]);
  assert.ok(text.slice(start).startsWith('xref'));
});
