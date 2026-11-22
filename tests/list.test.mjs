import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageCount, clampPage, pageRange, pageList, normalize, matches, plainText } from '../src/lib/list.ts';

test('pageCount: at least one page, rounds up', () => {
  assert.equal(pageCount(0, 12), 1);
  assert.equal(pageCount(12, 12), 1);
  assert.equal(pageCount(13, 12), 2);
  assert.equal(pageCount(25, 12), 3);
});

test('clampPage: garbage and out-of-range values land on a real page', () => {
  assert.equal(clampPage(Number.NaN, 3), 1);
  assert.equal(clampPage(0, 3), 1);
  assert.equal(clampPage(-4, 3), 1);
  assert.equal(clampPage(9, 3), 3);
  assert.equal(clampPage(2.7, 3), 2);
});

test('pageRange: start and end index of a page, last page may be short', () => {
  assert.deepEqual(pageRange(25, 12, 1), [0, 12]);
  assert.deepEqual(pageRange(25, 12, 3), [24, 25]);
  assert.deepEqual(pageRange(0, 12, 1), [0, 0]);
});

test('pageList: nothing for one page, all numbers when short, ellipses when long', () => {
  assert.deepEqual(pageList(1, 1), []);
  assert.deepEqual(pageList(5, 3), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageList(10, 1), [1, 2, '…', 10]);
  assert.deepEqual(pageList(10, 5), [1, '…', 4, 5, 6, '…', 10]);
  assert.deepEqual(pageList(10, 10), [1, '…', 9, 10]);
});

test('normalize: case, accents and spacing do not matter', () => {
  assert.equal(normalize('  Über  GPU\n'), 'uber gpu');
  assert.equal(normalize('Ёлка'), 'елка');
});

test('matches: every word of the query must be in the text, empty query matches all', () => {
  const text = normalize('Local LLMs on a 16 GB GPU #benchmark');
  assert.ok(matches(text, ''));
  assert.ok(matches(text, '  '));
  assert.ok(matches(text, 'gpu llm'));
  assert.ok(matches(text, 'BENCH'));
  assert.ok(!matches(text, 'gpu nas'));
});

test('plainText: drops markdown syntax, keeps link labels, cuts to the limit', () => {
  const md = '# Title\n\nSome **bold** text with a [link](https://example.com/x) and ![pic](/a.png).\n\n- item';
  const out = plainText(md, 1000);
  assert.ok(out.includes('Some bold text with a link and'));
  assert.ok(!out.includes('https://'));
  assert.ok(!out.includes('**'));
  assert.equal(plainText('x'.repeat(50), 10).length, 10);
});
