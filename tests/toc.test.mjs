import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeHeading } from '../src/lib/toc.ts';
import { pickRandom } from '../src/lib/pick.ts';

test('activeHeading: the last heading that has scrolled past the offset', () => {
  assert.equal(activeHeading([400, 900, 1500], 120), 0);
  assert.equal(activeHeading([100, 900, 1500], 120), 0);
  assert.equal(activeHeading([-800, 60, 700], 120), 1);
  assert.equal(activeHeading([-2000, -900, -10], 120), 2);
});

test('activeHeading: nothing to point at gives -1 only for an empty list', () => {
  assert.equal(activeHeading([], 120), -1);
});

test('pickRandom returns n distinct items and never more than exist', () => {
  const xs = [1, 2, 3, 4, 5];
  const out = pickRandom(xs, 3, () => 0.5);
  assert.equal(out.length, 3);
  assert.equal(new Set(out).size, 3);
  assert.deepEqual(pickRandom([1, 2], 3).sort(), [1, 2]);
  assert.deepEqual(pickRandom([], 3), []);
});

test('pickRandom does not change its input and follows the rng', () => {
  const xs = [1, 2, 3, 4];
  const copy = [...xs];
  pickRandom(xs, 2, () => 0.99);
  assert.deepEqual(xs, copy);
  assert.notDeepEqual(pickRandom(xs, 4, () => 0), pickRandom(xs, 4, () => 0.99));
});
