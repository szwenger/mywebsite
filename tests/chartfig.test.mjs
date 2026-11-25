import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { THEMES, linearAxis, logAxis, chartLayout, chartHtml, gridHtml, schemaSvg, schemaCoverHtml } from '../scripts/figures/lib.mjs';

const spec = (n) => JSON.parse(fs.readFileSync(new URL(`../scripts/figures/specs/${n}.json`, import.meta.url), 'utf8'));
const noColour = (html) => html.replace(/#[0-9a-f]{3,8}\b/gi, '#').replace(/radial-gradient\([^;]*?\)(?=,|;|")/g, 'g');

test('chart figures: linear axis starts at zero with head room and round ticks', () => {
  const a = linearAxis(0.31);
  assert.deepEqual(a.ticks, [0, 0.1, 0.2, 0.3, 0.4]);
  assert.equal(a.hi, 0.4);
  assert.equal(a.decimals, 1);
});

test('chart figures: log axis labels 1 and 3 times a power of ten and leaves room around the data', () => {
  const a = logAxis(68, 2262);
  assert.deepEqual(a.ticks, [100, 300, 1000, 3000]);
  assert.ok(a.lo < 68 && a.hi > 2262);
  assert.ok(a.minor.includes(200) && !a.minor.includes(100));
});

test('chart figures: the style rules are enforced (axis title, source, two-line headline)', () => {
  const s = spec('llm-benchmark');
  assert.throws(() => chartLayout({ ...s, axisTitle: '' }), /axisTitle/);
  assert.throws(() => chartLayout({ ...s, source: '' }), /source/);
  assert.throws(() => chartLayout({ ...s, title: 'a\nb\nc' }), /two lines/);
});

test('chart figures: result column is the ratio, below 1 means the result went the other way', () => {
  const L = chartLayout(spec('llm-benchmark'));
  assert.equal(L.rows[0].ratio.toFixed(1), '16.9');
  assert.ok(L.rows.at(-1).ratio < 1);
  assert.ok(L.rows.every((r) => r.marks.every((m) => m.x > L.x0 && m.x < L.x1)), 'every mark sits inside the plot');
});

test('chart figures: light and dark differ only in colour (the layout is identical, so a post can cross-fade them)', () => {
  for (const n of ['llm-benchmark', 'tts-benchmark']) {
    const light = chartHtml(spec(n), 'light'), dark = chartHtml(spec(n), 'dark');
    assert.notEqual(light, dark);
    assert.equal(noColour(light), noColour(dark));
  }
  const g = { ...spec('imagegen-grid'), images: [['a.png', 'b.png', 'c.png', 'd.png']] };
  assert.equal(noColour(gridHtml(g, 'light')), noColour(gridHtml(g, 'dark')));
  const sc = spec('owui-cloudflared');
  assert.equal(noColour(schemaCoverHtml(sc, {}, 'light')), noColour(schemaCoverHtml(sc, {}, 'dark')));
});

test('chart figures: both themes define the same colour names', () => {
  assert.deepEqual(Object.keys(THEMES.light).sort(), Object.keys(THEMES.dark).sort());
});

test('chart figures: the schema template reproduces the diagram published in the Cloudflare post', () => {
  const post = fs.readFileSync(new URL('../src/content/posts/2026-11-22_owui-cloudflared/en.md', import.meta.url), 'utf8');
  const published = /<svg.*?<\/svg>/s.exec(post)[0];
  const norm = (x) => x.replace(/(\d)\.0\b/g, '$1').replace(/\s+/g, '');
  assert.equal(norm(schemaSvg(spec('owui-cloudflared'))), norm(published));
});
