import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toImageXY, pixelAt, loupePlacement } from '../src/tools/color/pixel-logic.ts';

test('toImageXY maps a point on the shown picture to a pixel, clamped to the edges', () => {
  const box = { w: 200, h: 100 }, img = { w: 400, h: 200 };
  assert.deepEqual(toImageXY(0, 0, box, img), { x: 0, y: 0 });
  assert.deepEqual(toImageXY(100, 50, box, img), { x: 200, y: 100 });
  assert.deepEqual(toImageXY(199.9, 99.9, box, img), { x: 399, y: 199 });
  assert.deepEqual(toImageXY(-20, 500, box, img), { x: 0, y: 199 });
});

test('toImageXY copes with a box of zero size', () => assert.deepEqual(toImageXY(5, 5, { w: 0, h: 0 }, { w: 10, h: 10 }), { x: 0, y: 0 }));

test('pixelAt reads RGBA at x, y', () => {
  const d = new Uint8ClampedArray([1, 2, 3, 255, 10, 20, 30, 128]);
  assert.deepEqual(pixelAt(d, 2, 1, 0), { r: 10, g: 20, b: 30, a: 128 / 255 });
  assert.deepEqual(pixelAt(d, 2, 0, 0), { r: 1, g: 2, b: 3, a: 1 });
});

test('the loupe sits above the pointer, and drops below it near the top, and stays inside the box', () => {
  assert.deepEqual(loupePlacement(300, 300, 600, 120), { left: 240, top: 150 });
  assert.equal(loupePlacement(300, 40, 600, 120).top, 40 + 30, 'below the pointer');
  assert.equal(loupePlacement(5, 300, 600, 120).left, 0);
  assert.equal(loupePlacement(595, 300, 600, 120).left, 480);
});
