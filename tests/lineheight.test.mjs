import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineHeight, recommendedRatio, measureWidth } from '../src/tools/lineheight/logic.ts';

test('body text at 16px and 66 characters gets 1.5', () => assert.equal(recommendedRatio(16, 66), 1.5));

test('the recommended ratio shrinks as type grows, grows with the line length, and stays between 1.1 and 1.7', () => {
  assert.ok(recommendedRatio(48, 66) < recommendedRatio(16, 66));
  assert.ok(recommendedRatio(16, 90) > recommendedRatio(16, 45));
  for (const size of [8, 12, 16, 24, 48, 120, 400]) for (const m of [20, 45, 66, 90, 140]) {
    const r = recommendedRatio(size, m);
    assert.ok(r >= 1.1 && r <= 1.7, `${size}px ${m} ch -> ${r}`);
  }
});

test('lineHeight gives pixels, rem, the unitless CSS value and the grid-snapped pixels', () => {
  const o = lineHeight({ size: 18, ratio: 1.5, root: 16, grid: 4 });
  assert.equal(o.px, 27);
  assert.equal(o.rem, 1.6875);
  assert.equal(o.unitless, '1.5');
  assert.equal(o.snapped, 28);
  assert.equal(lineHeight({ size: 16, ratio: 1.5, root: 16, grid: 0 }).snapped, 24, 'grid 0 means no snapping');
});

test('bad input gives NaN rather than a number that looks right', () => {
  assert.ok(Number.isNaN(lineHeight({ size: 0, ratio: 1.5, root: 16, grid: 4 }).px));
  assert.ok(Number.isNaN(lineHeight({ size: 16, ratio: -1, root: 16, grid: 4 }).px));
});

test('measureWidth: characters to ch and to an estimated pixel width', () => {
  const w = measureWidth(66, 16);
  assert.equal(w.ch, 66);
  assert.equal(w.px, Math.round(66 * 16 * 0.55));
});
