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

import { gradient, harmony, shades, simulate, SCHEMES, KINDS } from '../src/tools/color/logic.ts';

const rgb = (r, g, b) => ({ r, g, b, a: 1 });

test('gradient runs through OKLab, keeps both ends and has the asked number of stops', () => {
  const g = gradient(rgb(255, 0, 0), rgb(0, 0, 255), 5);
  assert.equal(g.length, 5);
  assert.deepEqual(g[0], rgb(255, 0, 0));
  assert.deepEqual(g[4], rgb(0, 0, 255));
  assert.deepEqual(gradient(rgb(0, 0, 0), rgb(255, 255, 255), 3)[1], rgb(99, 99, 99)); // OKLab midpoint of black and white is about #636363
  assert.equal(gradient(rgb(1, 2, 3), rgb(9, 9, 9), 1).length, 2); // at least both ends
});

test('harmony rotates the hue and keeps saturation and lightness', () => {
  const base = parseColor('hsl(10 60% 50%)');
  const comp = harmony(base, 'complementary');
  assert.equal(comp.length, 2);
  assert.deepEqual(comp[0], base);
  assert.equal(toHsl(comp[1]).h, 190);
  assert.deepEqual(harmony(base, 'triadic').map((c) => toHsl(c).h), [10, 130, 250]);
  assert.deepEqual(harmony(base, 'analogous').map((c) => toHsl(c).h), [340, 10, 40]);
  for (const k of SCHEMES) assert.ok(harmony(base, k).length >= 2, k);
});

test('shade scale: eleven steps from light to dark, same hue, always inside sRGB', () => {
  const base = parseColor('#6a78d1');
  const sc = shades(base);
  assert.equal(sc.length, 11);
  const ls = sc.map((c) => toOklch(c).l);
  for (let i = 1; i < ls.length; i++) assert.ok(ls[i] < ls[i - 1], `step ${i}`);
  assert.ok(ls[0] > 0.9 && ls[10] < 0.35);
  for (const c of sc.slice(2, 9)) assert.ok(Math.abs(toOklch(c).h - toOklch(base).h) < 8, toHex(c));
  for (const c of sc) for (const v of [c.r, c.g, c.b]) assert.ok(Number.isInteger(v) && v >= 0 && v <= 255);
});

test('shade scale of a grey stays grey', () => {
  for (const c of shades(rgb(128, 128, 128))) assert.ok(c.r === c.g && c.g === c.b);
});

test('colour-blindness simulation leaves greys alone and collapses red and green', () => {
  for (const k of KINDS) {
    for (const v of [0, 90, 200, 255]) assert.deepEqual(simulate(rgb(v, v, v), k), rgb(v, v, v), `${k} ${v}`);
  }
  const red = simulate(rgb(255, 0, 0), 'protanopia');
  assert.ok(Math.abs(red.r - 109) <= 2 && Math.abs(red.g - 95) <= 2 && red.b <= 2, JSON.stringify(red));
  const a = simulate(rgb(255, 0, 0), 'deuteranopia'), b = simulate(rgb(0, 160, 0), 'deuteranopia');
  assert.ok(Math.abs(a.r - b.r) < 80 && a.r > a.b && b.r > b.b, 'both land in the yellow-brown range');
  const gray = simulate(rgb(255, 0, 0), 'achromatopsia');
  assert.ok(gray.r === gray.g && gray.g === gray.b);
  assert.ok(gray.r > 40 && gray.r < 130); // red is dark in luminance
});
