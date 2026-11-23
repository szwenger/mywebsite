import test from 'node:test';
import assert from 'node:assert/strict';
import { cells, contour, trace, traceParam } from '../src/tools/plot/geom.ts';

test('contour of a circle stays on the circle', () => {
  const segs = contour((x, y) => Math.hypot(x - 50, y - 50) - 30, 100, 100, 4);
  assert.ok(segs.length > 30);
  for (const [x0, y0, x1, y1] of segs) {
    assert.ok(Math.abs(Math.hypot(x0 - 50, y0 - 50) - 30) < 0.5);
    assert.ok(Math.abs(Math.hypot(x1 - 50, y1 - 50) - 30) < 0.5);
  }
});

test('contour of a line, and nothing where the value never changes sign or is undefined', () => {
  const line = contour((x) => x - 20, 100, 40, 5);
  assert.ok(line.length > 0 && line.every((s) => Math.abs(s[0] - 20) < 1e-9 && Math.abs(s[2] - 20) < 1e-9));
  assert.equal(contour(() => 1, 50, 50, 5).length, 0);
  assert.equal(contour(() => NaN, 50, 50, 5).length, 0);
});

test('cells merges runs', () => {
  const r = cells((x) => x < 20, 40, 8, 4);
  assert.deepEqual(r, [[0, 0, 20, 4], [0, 4, 20, 4]]);
});

test('trace: a smooth line is one polyline, a gap splits it, a pole splits it', () => {
  assert.equal(trace((x) => x, 100, 100).length, 1);
  assert.equal(trace((x) => (x > 40 && x < 60 ? NaN : x), 100, 100).length, 2);
  // tan-like pole in pixel space: climbs far above the view, then comes back from far below
  const pole = trace((x) => (x < 50 ? -1 / (x - 50) * 1e3 * -1 : -1 / (x - 50.5) * 1e3 * -1), 100, 100, 1);
  assert.ok(pole.length >= 2);
});

test('trace: a steep but straight line is not broken', () => {
  assert.equal(trace((x) => x * 1000 - 20000, 100, 100).length, 1);
});

test('traceParam splits at undefined points', () => {
  const l = traceParam((t) => [t, t === 5 ? NaN : t], 0, 10, 10);
  assert.equal(l.length, 2);
});

import { crossings } from '../src/tools/plot/geom.ts';

// A 400 x 400 pixel view of x, y in [-10, 10].
const V = { w: 400, h: 400, at: (px, py) => [-10 + px / 20, 10 - py / 20], to: (x, y) => [(x + 10) * 20, (10 - y) * 20] };
const near = (p, x, y, eps = 1e-6) => Math.abs(p[0] - x) < eps && Math.abs(p[1] - y) < eps;

test('crossings: two lines meet once', () => {
  const pts = crossings((x, y) => y - x, (x, y) => y + x - 2, V.w, V.h, V.at, V.to);
  assert.equal(pts.length, 1);
  assert.ok(near(pts[0], 1, 1), String(pts[0]));
});

test('crossings: circle and line give two exact points', () => {
  const pts = crossings((x, y) => x * x + y * y - 9, (x, y) => y - x / 2 - 1, V.w, V.h, V.at, V.to);
  assert.equal(pts.length, 2);
  for (const [x, y] of pts) { assert.ok(Math.abs(x * x + y * y - 9) < 1e-6); assert.ok(Math.abs(y - x / 2 - 1) < 1e-6); }
});

test('crossings: sin and cos meet at pi/4 + k pi', () => {
  const pts = crossings((x, y) => y - Math.sin(x), (x, y) => y - Math.cos(x), V.w, V.h, V.at, V.to);
  assert.equal(pts.length, 6); // -7pi/4 .. 9pi/4 inside [-10, 10]: -5.5, -2.36, 0.785, 3.93, 7.07, (10.2 is out)
  assert.ok(pts.some((p) => near(p, Math.PI / 4, Math.SQRT1_2)));
});

test('crossings: parallel and identical curves give none, a pole is not a crossing', () => {
  assert.equal(crossings((x, y) => y - x, (x, y) => y - x - 3, V.w, V.h, V.at, V.to).length, 0);
  assert.equal(crossings((x, y) => y - x, (x, y) => y - x, V.w, V.h, V.at, V.to).length, 0);
  // tan(x) against the x axis: only the real zeros -pi, 0, pi, never the poles
  const pts = crossings((x, y) => y - Math.tan(x), (x, y) => y, V.w, V.h, V.at, V.to);
  assert.deepEqual(pts.map((p) => Math.round(p[0] / Math.PI)).sort((a, b) => a - b), [-3, -2, -1, 0, 1, 2, 3]);
});

test('crossings: undefined values (NaN) are skipped', () => {
  const pts = crossings((x, y) => (x > 0 ? y - Math.sqrt(x) : NaN), (x, y) => y - 1, V.w, V.h, V.at, V.to);
  assert.equal(pts.length, 1);
  assert.ok(near(pts[0], 1, 1));
});
