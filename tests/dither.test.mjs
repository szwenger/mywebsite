import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dither, ALGOS } from '../src/tools/dither/logic.ts';

const BLACK = { r: 0, g: 0, b: 0 }, WHITE = { r: 255, g: 255, b: 255 };
const flat = (w, h, v, a = 255) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d.set([v, v, v, a], i * 4); return d; };
const ramp = (w, h) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set([(x * 255) / (w - 1), (x * 255) / (w - 1), (x * 255) / (w - 1), 255], (y * w + x) * 4); return d; };
const opts = (algo, levels = 2, dark = BLACK, light = WHITE) => ({ algo, levels, dark, light });
const whiteShare = (d) => { let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 127) n++; return n / (d.length / 4); };

test('every algorithm keeps pure black black and pure white white', () => {
  for (const a of ALGOS) {
    assert.ok(dither(flat(16, 16, 0), 16, 16, opts(a)).every((v, i) => i % 4 === 3 || v === 0), `${a} black`);
    assert.ok(dither(flat(16, 16, 255), 16, 16, opts(a)).every((v) => v === 255), `${a} white`);
  }
});

test('mid grey comes out about half white with the error-diffusion and ordered methods', () => {
  for (const a of ['floyd', 'atkinson', 'bayer']) {
    const share = whiteShare(dither(flat(64, 64, 128), 64, 64, opts(a)));
    assert.ok(share > 0.4 && share < 0.6, `${a} ${share}`);
  }
});

test('threshold splits at the middle', () => {
  assert.equal(whiteShare(dither(flat(4, 4, 100), 4, 4, opts('threshold'))), 0);
  assert.equal(whiteShare(dither(flat(4, 4, 200), 4, 4, opts('threshold'))), 1);
});

test('more levels use only the evenly spaced grey values', () => {
  const out = dither(ramp(64, 8), 64, 8, opts('floyd', 4));
  const seen = new Set();
  for (let i = 0; i < out.length; i += 4) seen.add(out[i]);
  assert.deepEqual([...seen].sort((a, b) => a - b), [0, 85, 170, 255]);
});

test('two colours replace black and white, and alpha is kept', () => {
  const d = flat(8, 8, 128, 77);
  const out = dither(d, 8, 8, opts('floyd', 2, { r: 200, g: 0, b: 0 }, { r: 0, g: 0, b: 200 }));
  const seen = new Set();
  for (let i = 0; i < out.length; i += 4) { seen.add(`${out[i]},${out[i + 1]},${out[i + 2]}`); assert.equal(out[i + 3], 77); }
  assert.deepEqual([...seen].sort(), ['0,0,200', '200,0,0']);
});

test('the input is not changed and the result is repeatable', () => {
  const d = ramp(32, 32), copy = Uint8ClampedArray.from(d);
  const a = dither(d, 32, 32, opts('atkinson')), b = dither(d, 32, 32, opts('atkinson'));
  assert.deepEqual(d, copy);
  assert.deepEqual(a, b);
});

test('error diffusion stays inside the image on a one-pixel-wide strip', () => {
  assert.equal(dither(flat(1, 9, 128), 1, 9, opts('floyd')).length, 36);
  assert.equal(dither(flat(9, 1, 128), 9, 1, opts('atkinson')).length, 36);
});
