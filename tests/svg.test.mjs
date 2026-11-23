import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minifySvg, roundNumbers, svgSize, outputSize, looksLikeSvg } from '../src/tools/svg/logic.ts';

const INKSCAPE = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:dc="http://purl.org/dc/elements/1.1/" width="48" height="24" viewBox="0 0 48 24" inkscape:version="1.2">
  <sodipodi:namedview id="base" pagecolor="#ffffff" inkscape:zoom="1" />
  <metadata id="m"><rdf:RDF><dc:title>x</dc:title></rdf:RDF></metadata>
  <defs id="defs1"></defs>
  <defs />
  <title>Logo</title>
  <path inkscape:label="p" data-name="Layer 1" d="M 0.5000 0.25 L 10.123456 20.000 Z" fill="red"/>
  <text x="1" y="2">Hello   world</text>
</svg>
`;

test('minify drops prolog, comments, metadata and editor data but keeps the picture', () => {
  const out = minifySvg(INKSCAPE);
  assert.ok(!/<\?xml|DOCTYPE|<!--|metadata|sodipodi|inkscape|rdf|dc:|data-name/.test(out), out);
  assert.ok(out.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(out.includes('<title>Logo</title>'));
  assert.ok(out.includes('<text x="1" y="2">Hello   world</text>'), 'text spacing stays');
  assert.ok(out.includes('fill="red"'));
  assert.ok(out.length < INKSCAPE.length / 1.5);
  assert.ok(!/>\s+</.test(out));
});

test('minify can drop the title and description too', () => {
  assert.ok(!minifySvg(INKSCAPE, { precision: 3, keepTitle: false }).includes('<title>'));
});

test('minify shortens path numbers to the chosen precision', () => {
  const out = minifySvg(INKSCAPE, { precision: 2, keepTitle: true });
  assert.ok(out.includes('d="M 0.5 .25 L 10.12 20 Z"') || out.includes('d="M .5 .25 L 10.12 20 Z"'), out);
});

test('roundNumbers leaves integers and exponents alone and trims zeros', () => {
  assert.equal(roundNumbers('10 20.000 0.5000 -0.25 1.5e-5 3.14159', 3), '10 20 .5 -.25 1.5e-5 3.142');
  assert.equal(roundNumbers('0.0004', 3), '0');
  assert.equal(roundNumbers('-0.0004', 3), '0');
});

test('minify is idempotent', () => {
  const once = minifySvg(INKSCAPE);
  assert.equal(minifySvg(once), once);
});

test('minify keeps attribute values that contain a greater-than sign', () => {
  const src = '<svg width="1" height="1"><a data-x="a>b"   href="#"><rect  width="1"/></a></svg>';
  assert.equal(minifySvg(src), '<svg width="1" height="1"><a data-x="a>b" href="#"><rect width="1"/></a></svg>');
});

test('svgSize reads width and height, with units, or the viewBox', () => {
  assert.deepEqual(svgSize('<svg width="100" height="50"></svg>'), { w: 100, h: 50 });
  assert.deepEqual(svgSize('<svg width="1in" height="2in"></svg>'), { w: 96, h: 192 });
  assert.deepEqual(svgSize('<svg viewBox="0 0 24 12"></svg>'), { w: 24, h: 12 });
  assert.deepEqual(svgSize('<svg width="48" viewBox="0 0 24 12"></svg>'), { w: 48, h: 24 });
  assert.deepEqual(svgSize('<svg height="30" viewBox="0,0,60,30"></svg>'), { w: 60, h: 30 });
  assert.equal(svgSize('<svg width="100%" height="100%"></svg>'), null);
  assert.equal(svgSize('<div></div>'), null);
});

test('outputSize: an explicit width wins over the scale', () => {
  assert.deepEqual(outputSize({ w: 24, h: 12 }, 480, 2), { w: 480, h: 240 });
  assert.deepEqual(outputSize({ w: 24, h: 12 }, undefined, 4), { w: 96, h: 48 });
  assert.deepEqual(outputSize({ w: 1, h: 1 }, undefined, 0.1), { w: 1, h: 1 });
});

test('looksLikeSvg accepts a prolog and rejects other markup', () => {
  assert.ok(looksLikeSvg(INKSCAPE));
  assert.ok(looksLikeSvg('<svg></svg>'));
  assert.ok(!looksLikeSvg('<html><svg></svg></html>'));
  assert.ok(!looksLikeSvg('hello'));
});

test('plain numeric attributes are rounded too, units are kept', () => {
  const out = minifySvg('<svg width="10.50000px" height="10"><circle cx="12.00000" cy="3.14159" r="0.5000" fill="#000"/></svg>', { precision: 2, keepTitle: true });
  assert.equal(out, '<svg width="10.5px" height="10"><circle cx="12" cy="3.14" r=".5" fill="#000"/></svg>');
});
