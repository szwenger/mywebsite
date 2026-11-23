import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPalette, exportPalette, sampleSize } from '../src/tools/color/fromimage.ts';

const fill = (parts) => Uint8ClampedArray.from(parts.flatMap(([n, r, g, b, a = 255]) => Array.from({ length: n }, () => [r, g, b, a]).flat()));

test('two flat colours come out with their shares, biggest first', () => {
  const pal = extractPalette(fill([[75, 255, 0, 0], [25, 0, 0, 255]]), 2);
  assert.deepEqual(pal.map((p) => p.hex), ['#ff0000', '#0000ff']);
  assert.deepEqual(pal.map((p) => p.share), [0.75, 0.25]);
});

test('asking for more colours than the picture has stops at what exists', () => {
  const pal = extractPalette(fill([[10, 10, 20, 30]]), 8);
  assert.equal(pal.length, 1);
  assert.equal(pal[0].hex, '#0a141e');
  assert.equal(pal[0].share, 1);
});

test('transparent pixels are ignored', () => {
  const pal = extractPalette(fill([[50, 255, 255, 255, 0], [50, 0, 128, 0]]), 3);
  assert.equal(pal.length, 1);
  assert.equal(pal[0].hex, '#008000');
});

test('text colour is the one with more contrast', () => {
  const pal = extractPalette(fill([[10, 255, 255, 0], [10, 0, 0, 40]]), 2);
  const by = Object.fromEntries(pal.map((p) => [p.hex, p.text]));
  assert.equal(by['#ffff00'], '#000000');
  assert.equal(by['#000028'], '#ffffff');
});

test('the result is the same every time and shares add up to 1', () => {
  const data = Uint8ClampedArray.from({ length: 4000 }, (_, i) => (i % 4 === 3 ? 255 : (i * 37) % 256));
  const a = extractPalette(data, 5), b = extractPalette(data, 5);
  assert.deepEqual(a.map((x) => x.hex), b.map((x) => x.hex));
  assert.ok(Math.abs(a.reduce((s, x) => s + x.share, 0) - 1) < 1e-9);
  assert.equal(a.length, 5);
});

test('an empty or fully transparent picture gives no colours', () => {
  assert.deepEqual(extractPalette(new Uint8ClampedArray(0), 4), []);
  assert.deepEqual(extractPalette(fill([[4, 1, 2, 3, 0]]), 4), []);
});

test('export formats', () => {
  const sw = extractPalette(fill([[3, 255, 0, 0], [1, 0, 0, 255]]), 2);
  assert.equal(exportPalette(sw, 'list'), '#ff0000\n#0000ff');
  assert.equal(exportPalette(sw, 'css'), ':root {\n  --color-1: #ff0000;\n  --color-2: #0000ff;\n}');
  assert.deepEqual(JSON.parse(exportPalette(sw, 'json')), ['#ff0000', '#0000ff']);
});

test('sampleSize shrinks the long side to the limit and never enlarges', () => {
  assert.deepEqual(sampleSize(4000, 2000), { w: 160, h: 80 });
  assert.deepEqual(sampleSize(100, 50), { w: 100, h: 50 });
  assert.deepEqual(sampleSize(10000, 1), { w: 160, h: 1 });
});

test('slivers under half a percent are dropped', () => {
  const pal = extractPalette(fill([[500, 255, 0, 0], [496, 0, 0, 255], [4, 0, 255, 0]]), 3);
  assert.deepEqual(pal.map((p) => p.hex), ['#ff0000', '#0000ff']);
  assert.equal(extractPalette(fill([[500, 255, 0, 0], [496, 0, 0, 255], [4, 0, 255, 0]]), 3, 125, 0).length, 3);
});
