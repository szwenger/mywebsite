import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCron, nextRuns } from '../src/tools/cron/logic.ts';

const iso = (list) => list.map((d) => d.toISOString().slice(0, 16));
const from = (s) => new Date(s + 'Z');

test('expands lists, ranges, steps and names; Sunday can be 0 or 7', () => {
  const c = parseCron('*/20 9-17/4 1,15 JAN-MAR MON-FRI');
  assert.deepEqual(c.min, [0, 20, 40]);
  assert.deepEqual(c.hour, [9, 13, 17]);
  assert.deepEqual(c.dom, [1, 15]);
  assert.deepEqual(c.mon, [1, 2, 3]);
  assert.deepEqual(c.dow, [1, 2, 3, 4, 5]);
  assert.deepEqual(parseCron('0 0 * * 7').dow, [0]);
  assert.deepEqual(parseCron('5/20 * * * *').min, [5, 25, 45]);
});

test('aliases expand to the usual expressions', () => {
  assert.deepEqual(parseCron('@daily'), parseCron('0 0 * * *'));
  assert.deepEqual(parseCron('@hourly').min, [0]);
});

test('invalid expressions throw', () => {
  for (const bad of ['', '* * * *', '* * * * * *', '60 * * * *', '* 24 * * *', '* * 0 * *', '*/0 * * * *', '5-1 * * * *', 'a * * * *', '1-2-3 * * * *', '* * * * 8']) assert.throws(() => parseCron(bad), Error, bad);
});

test('next runs within working hours skip the weekend', () => {
  const r = nextRuns(parseCron('*/15 9-17 * * 1-5'), from('2026-01-05T09:07'), 4, true); // a Monday
  assert.deepEqual(iso(r), ['2026-01-05T09:15', '2026-01-05T09:30', '2026-01-05T09:45', '2026-01-05T10:00']);
  const fri = nextRuns(parseCron('0 9 * * 1-5'), from('2026-01-09T10:00'), 2, true); // Friday after 9:00
  assert.deepEqual(iso(fri), ['2026-01-12T09:00', '2026-01-13T09:00']);
});

test('the start minute itself is not a "next" run', () => {
  assert.deepEqual(iso(nextRuns(parseCron('0 12 * * *'), from('2026-01-05T12:00'), 1, true)), ['2026-01-06T12:00']);
});

test('day of month and day of week combine with OR when both are restricted', () => {
  const r = nextRuns(parseCron('0 0 13 * 5'), from('2026-01-01T00:00'), 3, true); // every 13th and every Friday
  assert.deepEqual(iso(r), ['2026-01-02T00:00', '2026-01-09T00:00', '2026-01-13T00:00']);
});

test('29 February finds the next leap year', () => {
  assert.deepEqual(iso(nextRuns(parseCron('0 0 29 2 *'), from('2026-01-01T00:00'), 1, true)), ['2028-02-29T00:00']);
});

test('a month with 31 days: day 31 skips the short months', () => {
  const r = nextRuns(parseCron('0 0 31 * *'), from('2026-01-01T00:00'), 3, true);
  assert.deepEqual(iso(r), ['2026-01-31T00:00', '2026-03-31T00:00', '2026-05-31T00:00']);
});
