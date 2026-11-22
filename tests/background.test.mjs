import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = () => readdirSync(join('dist', '_astro')).filter((n) => n.endsWith('.css')).map((n) => readFileSync(join('dist', '_astro', n), 'utf8')).join('\n');

test('stage-beam background: fixed, behind the content, never catches clicks, animated by keyframes', () => {
  const c = css();
  const rule = c.match(/body::?before\s*\{[^}]*\}/);
  assert.ok(rule, 'body::before rule exists');
  assert.match(rule[0], /position:\s*fixed/);
  assert.match(rule[0], /pointer-events:\s*none/);
  assert.match(rule[0], /z-index:\s*-1/);
  assert.match(c, /@keyframes\s+beams/);
});

test('stage-beam background is switched off for print and for reduced motion', () => {
  const c = css();
  assert.match(c, /@media print\s*\{\s*body::?before\s*\{\s*display:\s*none/);
  assert.match(c, /prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,\s*(?:\*::before|:before),\s*(?:\*::after|:after)\s*\{[^}]*animation:\s*none/);
});
