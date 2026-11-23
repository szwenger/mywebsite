import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { themeMotion } from '../src/scripts/theme.ts';

const env = { origin: true, reduced: false, viewTransitions: true };

test('every device with view transitions gets the ink reveal', () => {
  assert.equal(themeMotion(env), 'ink');
});

test('reduced motion, no click position or no view transitions gets a plain swap', () => {
  assert.equal(themeMotion({ ...env, reduced: true }), 'none');
  assert.equal(themeMotion({ ...env, origin: false }), 'none');
  assert.equal(themeMotion({ ...env, viewTransitions: false }), 'none');
});

test('the ink mask is rasterised to a bitmap once, not re-filtered per frame', () => {
  const src = readFileSync('src/scripts/theme.ts', 'utf8');
  assert.match(src, /toDataURL\('image\/png'\)/);
});

test('the global styles switch transitions off while the theme flips', () => {
  const css = readFileSync('src/styles/global.css', 'utf8');
  assert.match(css, /\.theme-switching[^{]*\{\s*transition:\s*none\s*!important/);
  assert.doesNotMatch(css, /theme-veil/);
});
