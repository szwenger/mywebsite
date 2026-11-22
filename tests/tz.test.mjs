import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wallToInstant, zoneOffsetMin, discord, parseStamp } from '../src/tools/tz/logic.ts';

test('zoneOffsetMin knows summer and winter time', () => {
  assert.equal(zoneOffsetMin(Date.UTC(2026, 6, 1, 12), 'Europe/Berlin'), 120);
  assert.equal(zoneOffsetMin(Date.UTC(2026, 0, 15, 12), 'Europe/Berlin'), 60);
  assert.equal(zoneOffsetMin(Date.UTC(2026, 0, 15, 12), 'America/New_York'), -300);
  assert.equal(zoneOffsetMin(Date.UTC(2026, 0, 15, 12), 'UTC'), 0);
});

test('wallToInstant turns a wall-clock time in a zone into the real instant', () => {
  assert.equal(wallToInstant('2026-07-01', '20:00', 'Europe/Berlin'), Date.UTC(2026, 6, 1, 18, 0));
  assert.equal(wallToInstant('2026-01-15', '20:00', 'Europe/Berlin'), Date.UTC(2026, 0, 15, 19, 0));
  assert.equal(wallToInstant('2026-01-15', '09:30', 'America/New_York'), Date.UTC(2026, 0, 15, 14, 30));
  assert.equal(wallToInstant('2026-03-10', '12:00', 'Asia/Kolkata'), Date.UTC(2026, 2, 10, 6, 30));
});

test('wallToInstant is correct on a day the clocks change (Berlin, 2026-03-29)', () => {
  assert.equal(wallToInstant('2026-03-29', '01:30', 'Europe/Berlin'), Date.UTC(2026, 2, 29, 0, 30)); // still +1
  assert.equal(wallToInstant('2026-03-29', '04:00', 'Europe/Berlin'), Date.UTC(2026, 2, 29, 2, 0)); // already +2
});

test('wallToInstant returns NaN for an invalid date or time', () => {
  assert.ok(Number.isNaN(wallToInstant('', '20:00', 'UTC')));
  assert.ok(Number.isNaN(wallToInstant('2026-01-15', '', 'UTC')));
});

test('discord builds the timestamp markup in seconds', () => {
  assert.equal(discord(Date.UTC(2026, 0, 15, 19, 0), 'F'), '<t:1768503600:F>');
  assert.equal(discord(1768503600999, 'R'), '<t:1768503600:R>');
});

test('parseStamp reads the ?t= value and rejects junk', () => {
  assert.equal(parseStamp('?t=1768503600'), 1768503600000);
  assert.ok(Number.isNaN(parseStamp('?t=abc')));
  assert.ok(Number.isNaN(parseStamp('')));
});
