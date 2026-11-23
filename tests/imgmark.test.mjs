import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchor, tiles, fontSize, logoSize, markedName, POSITIONS } from '../src/tools/imgmark/logic.ts';

test('anchor puts a 100 x 40 mark at each of the nine places on a 1000 x 600 picture', () => {
  const at = (p) => anchor(p, 1000, 600, 100, 40, 20);
  assert.deepEqual(at('tl'), { x: 20, y: 20 });
  assert.deepEqual(at('tc'), { x: 450, y: 20 });
  assert.deepEqual(at('tr'), { x: 880, y: 20 });
  assert.deepEqual(at('ml'), { x: 20, y: 280 });
  assert.deepEqual(at('c'), { x: 450, y: 280 });
  assert.deepEqual(at('mr'), { x: 880, y: 280 });
  assert.deepEqual(at('bl'), { x: 20, y: 540 });
  assert.deepEqual(at('bc'), { x: 450, y: 540 });
  assert.deepEqual(at('br'), { x: 880, y: 540 });
  assert.equal(POSITIONS.length, 9);
});

test('tiles cover the picture, keep the gap and centre the pattern', () => {
  const t = tiles(1000, 600, 100, 40, 20);
  assert.ok(t.length > 40);
  assert.ok(t.some((s) => s.x === 450 && s.y === 280), 'one tile sits dead centre');
  const xs = [...new Set(t.filter((s) => s.y === 280).map((s) => s.x))].sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) assert.equal(xs[i] - xs[i - 1], 120);
  for (const s of t) assert.ok(s.x + 100 > 0 && s.x < 1000 && s.y + 40 > 0 && s.y < 600);
});

test('staggered rows are shifted by half a step', () => {
  const t = tiles(1000, 600, 100, 40, 20, true);
  const row = (y) => t.filter((s) => s.y === y).map((s) => s.x).sort((a, b) => a - b);
  const a = row(280), b = row(280 + 60);
  assert.equal((b[0] - a[0] + 120) % 120, 60);
});

test('tiles never loop on a zero-size mark', () => {
  assert.ok(tiles(50, 50, 0, 0, 0).length <= 60 * 60);
});

test('fontSize makes a line of text about the asked share of the width', () => {
  const size = fontSize(1000, 30, 10); // 300 px for 10 characters at ~0.55 em each
  assert.ok(size >= 50 && size <= 60, String(size));
  assert.equal(fontSize(100, 1, 50), 8);
});

test('logoSize scales to the width and is capped by the height', () => {
  assert.deepEqual(logoSize(1000, 600, 200, 100, 20), { w: 200, h: 100 });
  assert.deepEqual(logoSize(1000, 100, 200, 400, 50), { w: 50, h: 100 });
});

test('markedName swaps the extension and adds a suffix', () => {
  assert.equal(markedName('holiday.photo.jpeg', 'jpg'), 'holiday.photo-marked.jpg');
  assert.equal(markedName('noext', 'png'), 'noext-marked.png');
});
