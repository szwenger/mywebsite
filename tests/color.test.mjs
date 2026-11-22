import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, toHex, toHsl, toOklch, contrast, grades, formats } from '../src/tools/color/logic.ts';

test('parses hex in all lengths, rgb and hsl notations', () => {
  assert.deepEqual(parseColor('#f80'), { r: 255, g: 136, b: 0, a: 1 });
  assert.deepEqual(parseColor('6a78d1'), { r: 106, g: 120, b: 209, a: 1 });
  assert.equal(parseColor('#00000080').a, 0.5);
  assert.deepEqual(parseColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(parseColor('rgb(10 20 30 / 0.5)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(parseColor('hsl(120 100% 25%)'), { r: 0, g: 128, b: 0, a: 1 });
  assert.deepEqual(parseColor('hsl(0, 100%, 50%)'), { r: 255, g: 0, b: 0, a: 1 });
  assert.equal(parseColor('banana'), null);
  assert.equal(parseColor('#12'), null);
  assert.equal(parseColor('rgb(1 2)'), null);
});

test('hex and hsl conversions agree with known values', () => {
  const accent = parseColor('#6a78d1');
  assert.equal(toHex(accent), '#6a78d1');
  assert.deepEqual(toHsl(accent), { h: 232, s: 53, l: 62 });
  assert.deepEqual(toHsl({ r: 128, g: 128, b: 128, a: 1 }), { h: 0, s: 0, l: 50 });
  assert.equal(toHex({ r: 1, g: 2, b: 3, a: 0.5 }), '#01020380');
});

test('OKLCH of white, black and red match the CSS Color 4 reference values', () => {
  const w = toOklch({ r: 255, g: 255, b: 255, a: 1 });
  assert.ok(Math.abs(w.l - 1) < 0.001 && w.c < 0.001);
  assert.ok(toOklch({ r: 0, g: 0, b: 0, a: 1 }).l < 0.001);
  const r = toOklch({ r: 255, g: 0, b: 0, a: 1 });
  assert.ok(Math.abs(r.l - 0.628) < 0.002 && Math.abs(r.c - 0.2577) < 0.002 && Math.abs(r.h - 29.23) < 0.3, JSON.stringify(r));
});

test('WCAG contrast: black on white is 21, order does not matter, #777 on white just fails AA', () => {
  const white = parseColor('#fff'), black = parseColor('#000');
  assert.ok(Math.abs(contrast(black, white) - 21) < 0.001);
  assert.equal(contrast(black, white), contrast(white, black));
  const grey = contrast(parseColor('#777'), white);
  assert.ok(Math.abs(grey - 4.48) < 0.02, String(grey));
  assert.deepEqual(grades(grey), { aaNormal: false, aaLarge: true, aaaNormal: false, aaaLarge: false });
  assert.deepEqual(grades(7), { aaNormal: true, aaLarge: true, aaaNormal: true, aaaLarge: true });
});

test('formats shows alpha only when the colour is transparent', () => {
  assert.equal(formats(parseColor('#ff0000')).RGB, 'rgb(255 0 0)');
  assert.equal(formats(parseColor('rgb(255 0 0 / 0.5)')).RGB, 'rgb(255 0 0 / 0.5)');
  assert.match(formats(parseColor('#ff0000')).OKLCH, /^oklch\(62\.8% 0\.258 29\.2\)$/);
});
