import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridRects, tileName, stitchLayout } from '../src/tools/tiles/logic.ts';

test('gridRects cuts the image into rows × columns that cover every pixel exactly once', () => {
  for (const [w, h, c, r] of [[100, 60, 3, 2], [1080, 1350, 3, 4], [7, 5, 7, 5], [10, 10, 1, 1], [101, 99, 4, 7]]) {
    const rects = gridRects(w, h, c, r);
    assert.equal(rects.length, c * r);
    assert.equal(rects.reduce((a, t) => a + t.w * t.h, 0), w * h, `${w}x${h} ${c}x${r}`);
    const seen = new Uint8Array(w * h);
    for (const t of rects) for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) seen[y * w + x]++;
    assert.ok(seen.every((n) => n === 1));
  }
});

test('gridRects spreads the leftover pixels and lists tiles row by row', () => {
  assert.deepEqual(gridRects(100, 10, 3, 1).map((t) => t.w), [33, 34, 33]);
  assert.deepEqual(gridRects(4, 4, 2, 2).map((t) => [t.x, t.y]), [[0, 0], [2, 0], [0, 2], [2, 2]]);
});

test('gridRects keeps the counts sensible: at least 1, no more than one tile per pixel', () => {
  assert.equal(gridRects(10, 10, 0, -3).length, 1);
  assert.equal(gridRects(3, 2, 50, 50).length, 6);
});

test('tileName numbers rows and columns from 1', () => {
  assert.equal(tileName('holiday.jpg', 0, 3, 'png'), 'holiday-r1c1.png');
  assert.equal(tileName('holiday.jpg', 4, 3, 'jpg'), 'holiday-r2c2.jpg');
  assert.equal(tileName('a', 5, 3, 'webp'), 'a-r2c3.webp');
});

test('stitchLayout side by side: matching heights scales the others to the tallest', () => {
  const l = stitchLayout([{ w: 100, h: 50 }, { w: 100, h: 100 }], 'h', 10, true);
  assert.deepEqual(l, { w: 100 * 2 + 100 + 10, h: 100, items: [{ x: 0, y: 0, w: 200, h: 100 }, { x: 210, y: 0, w: 100, h: 100 }] });
});

test('stitchLayout one above the other: matching widths scales to the widest', () => {
  const l = stitchLayout([{ w: 50, h: 40 }, { w: 100, h: 30 }], 'v', 0, true);
  assert.deepEqual(l, { w: 100, h: 80 + 30, items: [{ x: 0, y: 0, w: 100, h: 80 }, { x: 0, y: 80, w: 100, h: 30 }] });
});

test('stitchLayout without matching keeps sizes and centres the shorter ones', () => {
  const l = stitchLayout([{ w: 40, h: 20 }, { w: 40, h: 60 }], 'h', 5, false);
  assert.deepEqual(l, { w: 85, h: 60, items: [{ x: 0, y: 20, w: 40, h: 20 }, { x: 45, y: 0, w: 40, h: 60 }] });
  assert.deepEqual(stitchLayout([], 'h', 5, true), { w: 0, h: 0, items: [] });
});
