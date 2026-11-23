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

import { trimBox, detectSkew, rotatedSize } from '../src/tools/crop/logic.ts';

/** w×h RGBA buffer, every pixel `fill`, then `paint(x, y)` may return a replacement. */
const img = (w, h, fill, paint = () => null) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(paint(x, y) ?? fill, (y * w + x) * 4);
  return d;
};

test('trimBox finds the opaque content of an image with a transparent border', () => {
  const d = img(20, 10, [0, 0, 0, 0], (x, y) => (x >= 5 && x < 12 && y >= 2 && y < 8 ? [200, 10, 10, 255] : null));
  assert.deepEqual(trimBox(d, 20, 10), { x: 5, y: 2, w: 7, h: 6 });
});

test('trimBox also trims a solid border colour, and ignores noise within the tolerance', () => {
  const white = [255, 255, 255, 255];
  const d = img(20, 10, white, (x, y) => (x === 0 && y === 0 ? [250, 250, 250, 255] : x >= 4 && x < 10 && y >= 3 && y < 5 ? [0, 0, 0, 255] : null));
  assert.deepEqual(trimBox(d, 20, 10, 12), { x: 4, y: 3, w: 6, h: 2 });
});

test('trimBox gives null for an image that is all border, or has no border to trim', () => {
  assert.equal(trimBox(img(8, 8, [0, 0, 0, 0]), 8, 8), null);
  assert.equal(trimBox(img(8, 8, [9, 9, 9, 255]), 8, 8), null);
});

/** Grey buffer of dark text-like lines that tilt by `deg` (positive: descending to the right). */
const lines = (w, h, deg) => {
  const g = new Uint8Array(w * h).fill(255);
  const t = Math.tan((deg * Math.PI) / 180);
  for (let y0 = 20; y0 < h - 20; y0 += 14) for (let x = 15; x < w - 15; x++) for (let k = 0; k < 3; k++) {
    const y = Math.round(y0 + (x - w / 2) * t) + k;
    if (y >= 0 && y < h) g[y * w + x] = 0;
  }
  return g;
};

test('detectSkew measures how far lines of text tilt, within a quarter of a degree', () => {
  for (const deg of [0, 2.5, -4, 7, -9.5]) assert.ok(Math.abs(detectSkew(lines(360, 260, deg), 360, 260) - deg) <= 0.4, `${deg}`);
});

test('detectSkew returns 0 for a blank or flat image', () => {
  assert.equal(detectSkew(new Uint8Array(100 * 100).fill(255), 100, 100), 0);
  assert.equal(detectSkew(new Uint8Array(100 * 100).fill(120), 100, 100), 0);
});

test('rotatedSize is the bounding box of the turned image', () => {
  assert.deepEqual(rotatedSize(100, 50, 0), { w: 100, h: 50 });
  assert.deepEqual(rotatedSize(100, 50, 90), { w: 50, h: 100 });
  const r = rotatedSize(100, 100, 45);
  assert.ok(Math.abs(r.w - 142) <= 1 && Math.abs(r.h - 142) <= 1);
});
