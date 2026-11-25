import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAPERS, paperSize } from '../src/tools/paper/logic.ts';

test('A4 is 210 x 297 mm, 595 x 842 pt, 8.27 x 11.69 in', () => {
  const a4 = paperSize('A4', 300, false);
  assert.deepEqual(a4.mm, [210, 297]);
  assert.deepEqual(a4.pt, [595, 842]);
  assert.deepEqual(a4.inch, [8.27, 11.69]);
  assert.deepEqual(a4.px, [2480, 3508]);
});

test('landscape swaps the sides', () => assert.deepEqual(paperSize('A4', 96, true).mm, [297, 210]));

test('US Letter is 8.5 x 11 in, and pixels follow the PPI', () => {
  const l = paperSize('Letter', 96, false);
  assert.deepEqual(l.inch, [8.5, 11]);
  assert.deepEqual(l.px, [816, 1056]);
});

test('every A size halves the one before it (long side becomes the short side), A0 is one square metre', () => {
  for (let n = 1; n <= 8; n++) {
    const big = paperSize(`A${n - 1}`, 72, false).mm, small = paperSize(`A${n}`, 72, false).mm;
    assert.ok(Math.abs(big[1] / 2 - small[0]) <= 1 && Math.abs(big[0] - small[1]) <= 1, `A${n}`);
  }
  const [w, h] = paperSize('A0', 72, false).mm;
  assert.ok(Math.abs(w * h - 1e6) < 3000);
});

test('names are unique and an unknown name falls back to A4', () => {
  assert.equal(new Set(PAPERS.map((p) => p.name)).size, PAPERS.length);
  assert.deepEqual(paperSize('nope', 72, false).mm, [210, 297]);
});
