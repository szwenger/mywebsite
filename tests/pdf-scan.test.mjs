import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grayOf, otsu, paperBox, applyFilter, fitSide, pageSkew, pageQuad, warpQuad, quadSize, insetQuad, isConvex } from '../src/tools/pdf/scan.ts';

/** An RGBA image of w×h filled by fn(x, y) -> [r, g, b]. */
function image(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x, y);
    d.set([r, g, b, 255], (y * w + x) * 4);
  }
  return d;
}
const grey = (v) => [v, v, v];

test('otsu: the threshold falls between two clusters', () => {
  const t = otsu(Uint8Array.from([...Array(50).fill(30), ...Array(50).fill(210)]));
  assert.ok(t >= 30 && t < 210, String(t));
});

test('grayOf: luminance weights', () => {
  assert.deepEqual([...grayOf(image(2, 1, (x) => (x ? [0, 255, 0] : [255, 0, 0])), 2, 1)], [76, 150]);
});

test('paperBox: finds a bright page on a dark table, text and all', () => {
  const w = 100, h = 80;
  const d = image(w, h, (x, y) => {
    const on = x >= 20 && x < 80 && y >= 10 && y < 70;
    if (!on) return grey(40);
    return y % 8 === 0 && x > 25 && x < 74 ? grey(30) : grey(200);
  });
  const b = paperBox(d, w, h);
  assert.ok(b, 'a box');
  assert.ok(Math.abs(b.x - 20) <= 1 && Math.abs(b.y - 10) <= 1 && Math.abs(b.w - 60) <= 2 && Math.abs(b.h - 60) <= 2, JSON.stringify(b));
});

test('paperBox: null when the page already fills the picture, or there is no contrast', () => {
  const text = image(100, 80, (x, y) => (y % 6 === 0 && x % 3 ? grey(30) : grey(210)));
  assert.equal(paperBox(text, 100, 80), null);
  assert.equal(paperBox(image(100, 80, () => grey(128)), 100, 80), null);
});

test('black and white: shadow on the paper does not turn it black, text stays black', () => {
  const w = 120, h = 40;
  const bg = (x) => 120 + x; // darker on the left, like a shadow
  const d = image(w, h, (x) => grey(x % 12 === 6 ? Math.round(bg(x) * 0.4) : bg(x)));
  applyFilter(d, w, h, 'bw');
  for (let x = 10; x < w - 10; x++) assert.equal(d[(20 * w + x) * 4], x % 12 === 6 ? 0 : 255, `x=${x}`);
});

test('grey: stretches a flat low-contrast photo to the full range', () => {
  const d = image(20, 10, (x) => grey(x < 10 ? 100 : 140));
  applyFilter(d, 20, 10, 'gray');
  assert.ok(d[0] <= 5 && d[(0 * 20 + 15) * 4] >= 250);
  assert.equal(d[0], d[1]);
});

test('colour: whitens the paper but keeps hue', () => {
  const d = image(20, 10, (x) => (x < 2 ? [20, 20, 120] : [200, 190, 180]));
  applyFilter(d, 20, 10, 'color');
  const paper = (10 * 4);
  assert.equal(d[paper], 255);
  assert.ok(d[paper] >= d[paper + 2], 'warm paper stays warm or white');
  assert.ok(d[2] > d[0], 'blue ink stays blue');
});

test('fitSide: scales the long side down, never up', () => {
  assert.deepEqual(fitSide(4000, 3000, 2000), { w: 2000, h: 1500 });
  assert.deepEqual(fitSide(800, 600, 2000), { w: 800, h: 600 });
});

/** A dark table with a bright page on it, turned by `deg` degrees (positive: clockwise, so lines descend to the right), with bars of ink. */
function photo(w, h, deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return image(w, h, (x, y) => {
    const dx = x - w / 2, dy = y - h / 2;
    const u = dx * c + dy * s, v = -dx * s + dy * c; // page coordinates
    if (Math.abs(u) > w * 0.35 || Math.abs(v) > h * 0.42) return grey(50);
    return Math.round(v) % 12 === 0 && Math.abs(u) < w * 0.3 ? grey(30) : grey(215);
  });
}

test('pageSkew: reads the tilt of a page on a dark table, sign included', () => {
  for (const deg of [6, -6, 0]) {
    const got = pageSkew(photo(400, 300, deg), 400, 300);
    assert.ok(Math.abs(got - deg) <= 1, `${deg} read as ${got}`);
  }
});

/** The point (x, y) lies inside the quad p0..p3 (convex, clockwise on screen). */
function inside(q, x, y) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (cross !== 0) { if (sign && Math.sign(cross) !== sign) return false; sign = Math.sign(cross); }
  }
  return true;
}
const SHOT = [{ x: 80, y: 40 }, { x: 330, y: 60 }, { x: 350, y: 270 }, { x: 50, y: 250 }];

test('pageQuad: finds the four corners of a page seen at an angle, wood-coloured blob and all', () => {
  const d = image(400, 300, (x, y) => {
    if (inside(SHOT, x, y)) return y % 14 === 0 && x > 100 && x < 300 ? grey(40) : grey(200);
    if (x < 70 && y < 60) return grey(130); // a coaster next to the page
    return grey(60);
  });
  const q = pageQuad(d, 400, 300);
  assert.ok(q, 'a quad');
  q.forEach((p, i) => assert.ok(Math.hypot(p.x - SHOT[i].x, p.y - SHOT[i].y) <= 6, `corner ${i}: ${JSON.stringify(p)}`));
});

test('pageQuad: null when the page fills the picture or there is no page', () => {
  assert.equal(pageQuad(image(200, 150, (x, y) => (y % 6 === 0 && x % 3 ? grey(30) : grey(210))), 200, 150), null);
  assert.equal(pageQuad(image(200, 150, () => grey(100)), 200, 150), null);
});

test('warpQuad: an axis-aligned quad is a plain crop', () => {
  const w = 100, h = 80;
  const src = { width: w, height: h, data: image(w, h, (x, y) => [x * 2, y * 3, 7]) };
  const out = warpQuad(src, [{ x: 10, y: 20 }, { x: 90, y: 20 }, { x: 90, y: 70 }, { x: 10, y: 70 }], 80, 50);
  for (const [i, j] of [[0, 0], [40, 25], [70, 40]]) {
    const o = (j * 80 + i) * 4;
    assert.ok(Math.abs(out[o] - (10 + i) * 2) <= 3 && Math.abs(out[o + 1] - (20 + j) * 3) <= 4, `${i},${j}: ${out[o]},${out[o + 1]}`);
  }
});

test('warpQuad: the four corners of a skewed quad land on the four corners of the output', () => {
  const w = 400, h = 300;
  const src = { width: w, height: h, data: image(w, h, (x, y) => (Math.hypot(x - SHOT[0].x, y - SHOT[0].y) < 12 ? [255, 0, 0] : Math.hypot(x - SHOT[1].x, y - SHOT[1].y) < 12 ? [0, 255, 0] : Math.hypot(x - SHOT[2].x, y - SHOT[2].y) < 12 ? [0, 0, 255] : Math.hypot(x - SHOT[3].x, y - SHOT[3].y) < 12 ? [255, 255, 0] : grey(90))) };
  const W = 200, H = 280;
  const out = warpQuad(src, SHOT, W, H);
  const at = (x, y) => [...out.slice((y * W + x) * 4, (y * W + x) * 4 + 3)];
  assert.ok(at(3, 3)[0] > 200 && at(3, 3)[1] < 60, 'top left is red');
  assert.ok(at(W - 4, 3)[1] > 200 && at(W - 4, 3)[0] < 60, 'top right is green');
  assert.ok(at(W - 4, H - 4)[2] > 200 && at(W - 4, H - 4)[0] < 60, 'bottom right is blue');
  assert.ok(at(3, H - 4)[0] > 200 && at(3, H - 4)[1] > 200, 'bottom left is yellow');
});

test('quadSize: longest opposite edges, snapped to A4 or Letter when close', () => {
  const a4 = quadSize([{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 860 }, { x: 0, y: 860 }]);
  assert.equal(a4.w, 600);
  assert.equal(a4.h, Math.round(600 * Math.SQRT2));
  const odd = quadSize([{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 300 }, { x: 0, y: 300 }]);
  assert.deepEqual(odd, { w: 500, h: 300 });
  const wide = quadSize([{ x: 0, y: 0 }, { x: 860, y: 0 }, { x: 860, y: 600 }, { x: 0, y: 600 }]);
  assert.equal(wide.h, 600);
  assert.equal(wide.w, Math.round(600 * Math.SQRT2));
});

test('scanner filter: shadows go, paper turns white, ink stays dark', () => {
  const w = 160, h = 120;
  const shade = (x, y) => 110 + (x / w) * 110 + (y / h) * 20; // a strong gradient, 110 to 240
  const d = image(w, h, (x, y) => grey(Math.round(y % 15 === 7 && x > 20 && x < 140 ? shade(x, y) * 0.3 : shade(x, y))));
  applyFilter(d, w, h, 'scan');
  let paperMin = 255, inkMax = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = d[(y * w + x) * 4];
    if (y % 15 === 7 && x > 20 && x < 140) inkMax = Math.max(inkMax, v);
    else if (y % 15 > 1 && y % 15 < 13 && x > 8 && x < w - 8 && y > 8 && y < h - 8) paperMin = Math.min(paperMin, v);
  }
  assert.ok(paperMin >= 240, `paper ${paperMin}`);
  assert.ok(inkMax <= 90, `ink ${inkMax}`);
});

test('scanner filter: removes a colour cast from the paper', () => {
  const d = image(120, 90, () => [170, 180, 205]); // bluish grey paper
  applyFilter(d, 120, 90, 'scan');
  for (let c = 0; c < 3; c++) assert.ok(d[(45 * 120 + 60) * 4 + c] >= 245, `channel ${c}: ${d[(45 * 120 + 60) * 4 + c]}`);
});

test('insetQuad: every corner moves towards the centre', () => {
  const q = insetQuad([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 200 }, { x: 0, y: 200 }], 0.1);
  assert.deepEqual(q.map((p) => [p.x, p.y]), [[5, 10], [95, 10], [95, 190], [5, 190]]);
});

test('isConvex: accepts a page outline, rejects a twisted one', () => {
  const q = [{ x: 0, y: 0 }, { x: 10, y: 1 }, { x: 11, y: 12 }, { x: -1, y: 10 }];
  assert.equal(isConvex(q), true);
  assert.equal(isConvex([q[0], q[2], q[1], q[3]]), false); // bow-tie
});
