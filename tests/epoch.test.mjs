import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unitOf, parseStamp, stamps, iso, isoWeek } from '../src/tools/epoch/logic.ts';

test('the unit is guessed from the size', () => {
  assert.equal(unitOf(1700000000), 's');
  assert.equal(unitOf(1700000000000), 'ms');
  assert.equal(unitOf(1700000000000000), 'us');
  assert.equal(unitOf(1700000000000000000), 'ns');
  assert.equal(unitOf(-1700000000), 's');
});

test('numbers and date strings parse to milliseconds', () => {
  assert.deepEqual(parseStamp('1700000000'), { ms: 1700000000000, unit: 's' });
  assert.deepEqual(parseStamp('1700000000123'), { ms: 1700000000123, unit: 'ms' });
  assert.deepEqual(parseStamp('1700000000', 'ms'), { ms: 1700000000, unit: 'ms' });
  assert.equal(parseStamp('2023-11-14T22:13:20Z').ms, 1700000000000);
  assert.equal(parseStamp('2023-11-14').ms, Date.UTC(2023, 10, 14));
  assert.equal(parseStamp('nope'), null);
  assert.equal(parseStamp('  '), null);
  assert.equal(parseStamp('9999999999999', 's'), null);
});

test('stamps and iso agree', () => {
  assert.deepEqual(stamps(1700000000123), { s: '1700000000', ms: '1700000000123', us: '1700000000123000', ns: '1700000000123000000' });
  assert.equal(iso(1700000000000), '2023-11-14T22:13:20.000Z');
  assert.equal(iso(NaN), null);
  assert.deepEqual(stamps(-1500), { s: '-2', ms: '-1500', us: '-1500000', ns: '-1500000000' });
});

test('ISO week handles the year boundary', () => {
  assert.deepEqual(isoWeek(Date.UTC(2026, 0, 1)), { year: 2026, week: 1 });
  assert.deepEqual(isoWeek(Date.UTC(2021, 0, 3)), { year: 2020, week: 53 });
  assert.deepEqual(isoWeek(Date.UTC(2024, 11, 30)), { year: 2025, week: 1 });
});
