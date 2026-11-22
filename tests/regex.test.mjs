import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runRegex, LIMIT } from '../src/tools/regex/logic.ts';

test('finds every match with index, groups and named groups', () => {
  const r = runRegex('(?<k>\\w+)=(\\d+)', 'g', 'a=1 bb=22');
  assert.equal(r.hits.length, 2);
  assert.deepEqual(r.hits[1], { index: 4, text: 'bb=22', groups: ['bb', '22'], named: { k: 'bb' } });
});

test('matches even without the g flag, and honours i', () => {
  assert.equal(runRegex('A', 'i', 'a a a').hits.length, 3);
});

test('zero-length matches advance instead of looping forever', () => {
  assert.equal(runRegex('x*', '', 'abc').hits.length, 4);
});

test('a broken pattern or flag set returns the engine message', () => {
  assert.match(runRegex('(', '', 'x').error, /./);
  assert.match(runRegex('a', 'zz', 'x').error, /flag/i);
});

test('too many matches are cut off and reported', () => {
  const r = runRegex('a', '', 'a'.repeat(LIMIT + 50));
  assert.equal(r.hits.length, LIMIT);
  assert.equal(r.truncated, true);
});

test('replacement uses $1, and without g only the first match changes', () => {
  assert.equal(runRegex('(\\d+)', 'g', 'a1 b22', '<$1>').replaced, 'a<1> b<22>');
  assert.equal(runRegex('(\\d+)', '', 'a1 b22', '<$1>').replaced, 'a<1> b22');
  assert.equal(runRegex('x', 'g', 'abc').replaced, undefined);
});
