import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetSize, outName, accepts, isHeic } from '../src/tools/image/logic.ts';

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

test('fitsCanvas: within the 16.7 MP iOS canvas limit, judged on the output size', async () => {
  const { fitsCanvas, MAX_PIXELS } = await import('../src/tools/image/logic.ts');
  assert.equal(MAX_PIXELS, 16_777_216);
  assert.equal(fitsCanvas({ w: 4096, h: 4096 }), true);
  assert.equal(fitsCanvas({ w: 4096, h: 4097 }), false);
  assert.equal(fitsCanvas(targetSize(8000, 6000)), false, '48 MP phone photo, no limit set');
  assert.equal(fitsCanvas(targetSize(8000, 6000, 4000)), true, 'same photo with a max width');
});

test('isHeic accepts the HEIC types and, for an empty type, the extension', () => {
  assert.ok(isHeic({ name: 'a.bin', type: 'image/heic' }));
  assert.ok(isHeic({ name: 'a.bin', type: 'image/heif' }));
  assert.ok(isHeic({ name: 'IMG_0001.HEIC', type: '' }));
  assert.ok(isHeic({ name: 'x.heif', type: '' }));
  assert.ok(!isHeic({ name: 'x.png', type: 'image/png' }));
  assert.ok(!isHeic({ name: 'heic.txt', type: '' }));
});
