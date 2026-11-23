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
