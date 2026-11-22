import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRatio, cropRect, outSize, turned } from '../src/tools/crop/logic.ts';

test('ratios parse from several spellings', () => {
  assert.equal(parseRatio('16:9'), 16 / 9);
  assert.equal(parseRatio('4/3'), 4 / 3);
  assert.equal(parseRatio('1,5'), 1.5);
  assert.equal(parseRatio('2x1'), 2);
  for (const bad of ['', 'a:b', '0:5', '-1', '3:0']) assert.equal(parseRatio(bad), null, bad);
});

test('the crop is the largest rectangle of that ratio, centred by default', () => {
  assert.deepEqual(cropRect(4000, 3000, 1), { x: 500, y: 0, w: 3000, h: 3000 });
  assert.deepEqual(cropRect(4000, 3000, 16 / 9), { x: 0, y: 375, w: 4000, h: 2250 });
  assert.deepEqual(cropRect(1000, 2000, 1), { x: 0, y: 500, w: 1000, h: 1000 });
  assert.deepEqual(cropRect(4000, 3000, null), { x: 0, y: 0, w: 4000, h: 3000 });
});

test('zoom shrinks the box and the centre is kept inside the image', () => {
  assert.deepEqual(cropRect(4000, 3000, 1, 2), { x: 1250, y: 750, w: 1500, h: 1500 });
  assert.deepEqual(cropRect(4000, 3000, 1, 2, 0, 0), { x: 0, y: 0, w: 1500, h: 1500 });
  assert.deepEqual(cropRect(4000, 3000, 1, 2, 1, 1), { x: 2500, y: 1500, w: 1500, h: 1500 });
  assert.deepEqual(cropRect(4000, 3000, 1, 0.2), cropRect(4000, 3000, 1, 1));
  const tiny = cropRect(10, 10, 1, 1000);
  assert.deepEqual([tiny.w, tiny.h], [1, 1]);
});

test('output size scales to a width and is capped', () => {
  assert.deepEqual(outSize({ x: 0, y: 0, w: 3000, h: 2000 }), { w: 3000, h: 2000 });
  assert.deepEqual(outSize({ x: 0, y: 0, w: 3000, h: 2000 }, 600), { w: 600, h: 400 });
  assert.deepEqual(outSize({ x: 0, y: 0, w: 3000, h: 2000 }, 20000), { w: 8192, h: 5461 });
  assert.deepEqual(outSize({ x: 0, y: 0, w: 5, h: 5 }, 0), { w: 5, h: 5 });
});

test('quarter turns swap the sides', () => {
  assert.deepEqual(turned(400, 300, 90), { w: 300, h: 400 });
  assert.deepEqual(turned(400, 300, 180), { w: 400, h: 300 });
  assert.deepEqual(turned(400, 300, 270), { w: 300, h: 400 });
});
