import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleFor, fitDpi, pageFile } from '../src/tools/pdf/images.ts';

test('scale and dpi', () => {
  assert.equal(scaleFor(72), 1);
  assert.equal(scaleFor(144), 2);
  assert.equal(fitDpi(595, 842, 150), 150); // A4 at 150 dpi is about 2.1 MP
  assert.ok(fitDpi(595, 842, 600) <= 600); // 8.4 MP... still fits
  const big = fitDpi(5000, 5000, 300); // a 5000 pt square at 300 dpi would be 300 MP
  assert.ok(big < 300 && big >= 1);
  assert.ok(5000 * 5000 * (big / 72) ** 2 <= 16_777_216);
});

test('file names are padded to the page count', () => {
  assert.equal(pageFile('report.pdf', 3, 12, 'png'), 'report-03.png');
  assert.equal(pageFile('Report.PDF', 7, 7, 'jpg'), 'Report-7.jpg');
  assert.equal(pageFile('a', 10, 100, 'webp'), 'a-010.webp');
});

test('export formats: jpeg is saved as .jpg, the others keep their name', async () => {
  const { imageFormat } = await import('../src/tools/pdf/images.ts');
  assert.deepEqual(imageFormat('jpeg'), { type: 'image/jpeg', ext: 'jpg' });
  assert.deepEqual(imageFormat('png'), { type: 'image/png', ext: 'png' });
  assert.deepEqual(imageFormat('webp'), { type: 'image/webp', ext: 'webp' });
});
