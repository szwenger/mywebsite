import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeholderSvg, readableText, fontSizeFor, svgDataUri, clampSize } from '../src/tools/placeholder/logic.ts';

test('placeholderSvg draws a background and a centred label with the size as default text', () => {
  const svg = placeholderSvg({ w: 600, h: 400, bg: '#cccccc', fg: '#333333', text: '' });
  assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /width="600" height="400" viewBox="0 0 600 400"/);
  assert.match(svg, /<rect width="100%" height="100%" fill="#cccccc"\/>/);
  assert.match(svg, /fill="#333333"/);
  assert.match(svg, />600 × 400<\/text>/);
});

test('placeholderSvg escapes the label and falls back to safe colours', () => {
  const svg = placeholderSvg({ w: 100, h: 100, bg: 'not a colour', fg: '"><script>', text: '<b>&"Hi"' });
  assert.ok(!svg.includes('<script>') && !svg.includes('<b>'));
  assert.match(svg, />&lt;b&gt;&amp;&quot;Hi&quot;<\/text>/);
  assert.match(svg, /fill="#cccccc"/); // bad background
});

test('readableText picks black on light and white on dark backgrounds', () => {
  assert.equal(readableText('#ffffff'), '#000000');
  assert.equal(readableText('#f4a261'), '#000000');
  assert.equal(readableText('#000000'), '#ffffff');
  assert.equal(readableText('#264653'), '#ffffff');
  assert.equal(readableText('nonsense'), '#000000');
});

test('fontSizeFor fits the label in the box, never below 6 px', () => {
  assert.equal(fontSizeFor(600, 400, 9), 100); // limited by the width: 600 * 0.9 / (9 * 0.6)
  assert.equal(fontSizeFor(20, 10, 40), 6);
  assert.ok(fontSizeFor(2000, 100, 3) <= 40);
});

test('clampSize keeps sides whole and inside 1 to 8192', () => {
  assert.equal(clampSize(0), 1);
  assert.equal(clampSize(99999), 8192);
  assert.equal(clampSize(12.7), 13);
  assert.equal(clampSize(NaN, 300), 300);
});

test('svgDataUri is a valid percent-encoded data URI that round-trips', () => {
  const uri = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg"><text>#a "b"</text></svg>');
  assert.match(uri, /^data:image\/svg\+xml,/);
  assert.equal(decodeURIComponent(uri.slice('data:image/svg+xml,'.length)), '<svg xmlns="http://www.w3.org/2000/svg"><text>#a "b"</text></svg>');
  assert.ok(!/[<>"#]/.test(uri.slice('data:image/svg+xml,'.length)));
});
