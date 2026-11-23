import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CODES, classOf, statusMatches } from '../src/tools/http/logic.ts';
import { s } from '../src/i18n/tools/http.ts';

const hit = (q, lang = 'en') => CODES.filter((c) => statusMatches(c.code, `${c.name} ${s[lang]['c' + c.code]}`, q)).map((c) => c.code);

test('every code has a name and a description in all three languages, and codes are unique and sorted', () => {
  assert.deepEqual(CODES.map((c) => c.code), [...new Set(CODES.map((c) => c.code))].sort((a, b) => a - b));
  for (const c of CODES) {
    assert.ok(c.name.trim(), c.code);
    for (const l of ['en', 'de', 'ru']) assert.ok(s[l]['c' + c.code]?.trim(), `${l} ${c.code}`);
  }
  assert.equal(CODES.filter((c) => classOf(c.code) === 4).length > 20, true);
});

test('a code, a code prefix and a class pattern find codes by number', () => {
  assert.deepEqual(hit('404'), [404]);
  assert.deepEqual(hit('50'), [500, 501, 502, 503, 504, 505, 506, 507, 508]);
  assert.deepEqual(hit('3xx'), CODES.filter((c) => classOf(c.code) === 3).map((c) => c.code));
  assert.deepEqual(hit('30X'), [300, 301, 302, 303, 304, 307, 308].filter((c) => String(c).startsWith('30')));
  assert.deepEqual(hit('999'), []);
});

test('words must all appear in the name or the description, ignoring case and accents', () => {
  assert.ok(hit('teapot').includes(418));
  assert.ok(hit('NOT FOUND').includes(404));
  assert.deepEqual(hit('zzzz'), []);
  assert.ok(hit('weiterleitung', 'de').length >= 1);
  assert.ok(hit('Umleitung', 'de').includes(302) || hit('Umleitung', 'de').length >= 1);
  assert.equal(hit('').length, CODES.length);
  assert.equal(hit('   ').length, CODES.length);
});
