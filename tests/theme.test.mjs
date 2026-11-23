import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { themeMotion } from '../src/scripts/theme.ts';

const env = { origin: true, reduced: false, viewTransitions: true, touch: false };

test('desktop with view transitions gets the ink reveal', () => {
  assert.equal(themeMotion(env), 'ink');
});

test('touch devices never get the ink reveal (iPhone stutters, iPad flashes the old page)', () => {
  assert.equal(themeMotion({ ...env, touch: true }), 'veil');
});

test('no view transitions falls back to the veil, reduced motion or no click position to a plain swap', () => {
  assert.equal(themeMotion({ ...env, viewTransitions: false }), 'veil');
  assert.equal(themeMotion({ ...env, reduced: true }), 'none');
  assert.equal(themeMotion({ ...env, reduced: true, touch: true }), 'none');
  assert.equal(themeMotion({ ...env, origin: false }), 'none');
});

test('the global styles hold the veil and switch transitions off while the theme flips', () => {
  const css = readFileSync('src/styles/global.css', 'utf8');
  assert.match(css, /\.theme-veil\s*\{[^}]*position:\s*fixed[^}]*\}/);
  assert.match(css, /\.theme-switching[^{]*\{\s*transition:\s*none\s*!important/);
});
