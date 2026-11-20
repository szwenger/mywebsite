import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetSize, outName, accepts } from '../src/tools/image/logic.ts';

test('targetSize keeps the aspect ratio and fits the width', () => {
  assert.deepEqual(targetSize(4000, 3000, 1000), { w: 1000, h: 750 });
});

test('targetSize never upscales', () => {
  assert.deepEqual(targetSize(400, 300, 1000), { w: 400, h: 300 });
});

test('targetSize fits the height when only a max height is given', () => {
  assert.deepEqual(targetSize(4000, 3000, undefined, 600), { w: 800, h: 600 });
});

test('targetSize never rounds a side below 1', () => {
  assert.deepEqual(targetSize(10000, 1, 100), { w: 100, h: 1 });
});

test('targetSize leaves the size alone with no limits', () => {
  assert.deepEqual(targetSize(640, 480), { w: 640, h: 480 });
});

test('outName replaces the extension and uses .jpg for jpeg', () => {
  assert.equal(outName('Foto.final.PNG', 'jpeg'), 'Foto.final.jpg');
  assert.equal(outName('pic.jpeg', 'png'), 'pic.png');
});

test('outName adds an extension when there is none', () => {
  assert.equal(outName('scan', 'webp'), 'scan.webp');
});

test('accepts takes png, jpeg, webp, gif and bmp only', () => {
  for (const t of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']) assert.equal(accepts({ type: t }), true, t);
  for (const t of ['application/pdf', 'image/svg+xml', 'image/tiff', '']) assert.equal(accepts({ type: t }), false, t);
});
