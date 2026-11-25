import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrSvg, defaultStyle, isFinder, logoBox, layout, MAX_LOGO } from '../src/tools/qr/style-logic.ts';

const N = 21;
const get = (r, c) => (r + c) % 2 === 0;
const style = (o = {}) => ({ ...defaultStyle, ...o });
const cells = (svg) => (svg.match(/h1v1h-1z/g) ?? []).length;

test('default style is a plain square code with a 2 module quiet zone', () => {
  const svg = qrSvg(N, get, style(), 400);
  assert.match(svg, /viewBox="0 0 25 25" width="400" height="400"/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.doesNotMatch(svg, /Gradient|<image|<text/);
});

test('finder areas are drawn apart, not as data modules', () => {
  assert.ok(isFinder(N, 0, 0) && isFinder(N, 6, 20) && isFinder(N, 20, 6));
  assert.ok(!isFinder(N, 10, 10) && !isFinder(N, 7, 7));
  let dark = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (get(r, c) && !isFinder(N, r, c)) dark++;
  // finders use 3 evenodd rounds of the square path, which is also h7/h5/h3, so only data cells are h1v1h-1z
  assert.equal(cells(qrSvg(N, get, style(), 100)), dark);
});

test('shapes change the module path', () => {
  assert.match(qrSvg(N, get, style({ shape: 'dots' }), 100), /a\.5 \.5 0 1 0 1 0/);
  assert.match(qrSvg(N, get, style({ shape: 'rounded' }), 100), /a0\.3 0\.3 0 0 1/);
  assert.doesNotMatch(qrSvg(N, get, style({ shape: 'dots' }), 100), /crispEdges/);
});

test('finder styles round the corners', () => {
  assert.doesNotMatch(qrSvg(N, get, style(), 100).split('fill-rule')[0].split('<path').pop(), /a\d/);
  assert.match(qrSvg(N, get, style({ finder: 'rounded' }), 100), /a2 2 0 0 1/);
  assert.match(qrSvg(N, get, style({ finder: 'circle' }), 100), /a3\.5 3\.5 0 0 1/);
});

test('gradients add a definition and paint with it', () => {
  const lin = qrSvg(N, get, style({ gradient: 'linear', fg2: '#ff0000' }), 100);
  assert.match(lin, /<linearGradient id="qg"/);
  assert.match(lin, /fill="url\(#qg\)"/);
  assert.match(lin, /stop-color="#ff0000"/);
  assert.match(qrSvg(N, get, style({ gradient: 'radial' }), 100), /<radialGradient id="qg"/);
});

test('centre image clears the modules under it and is capped', () => {
  const box = logoBox(N, 0.2);
  assert.equal(box.to - box.from, 4);
  assert.deepEqual(logoBox(N, 5), logoBox(N, MAX_LOGO), 'capped');
  const plain = cells(qrSvg(N, get, style(), 100));
  const svg = qrSvg(N, get, style({ logo: { href: 'data:image/png;base64,AAA', ratio: 0.2 } }), 100);
  assert.ok(cells(svg) < plain);
  assert.match(svg, /<image href="data:image\/png;base64,AAA"/);
});

test('frames add a border, and the label frame is taller with escaped text', () => {
  assert.deepEqual(layout(N, 'none'), { w: 25, h: 25, off: 0 });
  assert.equal(layout(N, 'box').w, 28);
  assert.equal(layout(N, 'label').h, 32.5);
  const svg = qrSvg(N, get, style({ frame: 'label', label: '<b>Hi & bye' }), 280);
  assert.match(svg, /viewBox="0 0 28 32\.5" width="280" height="325"/);
  assert.match(svg, /&lt;b&gt;Hi &amp; bye<\/text>/);
  assert.doesNotMatch(svg, /<b>/);
  assert.match(qrSvg(N, get, style({ frame: 'label', label: '  ' }), 100), />Scan me<\/text>/);
});
