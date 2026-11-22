import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, fold } from '../src/tools/ics/logic.ts';

const base = { uid: 'abc@galuin.com', now: Date.UTC(2026, 0, 1, 12), title: 'Stream, Q&A; part 1', start: Date.UTC(2026, 0, 15, 19, 0), end: Date.UTC(2026, 0, 15, 20, 30) };

test('timed event: UTC times, escaped text, CRLF line ends', () => {
  const ics = buildIcs(base);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART:20260115T190000Z\r\n'));
  assert.ok(ics.includes('DTEND:20260115T203000Z\r\n'));
  assert.ok(ics.includes('DTSTAMP:20260101T120000Z\r\n'));
  assert.ok(ics.includes('SUMMARY:Stream\\, Q&A\\; part 1\r\n'));
  assert.equal(ics.replace(/\r\n/g, '').includes('\n'), false);
});

test('all-day event: DATE values and an exclusive end date, also across a month end', () => {
  const ics = buildIcs({ ...base, start: '2026-01-30', end: '2026-01-31' });
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260130\r\n'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260201\r\n'));
});

test('optional parts: newline in description, repeat rule, reminder', () => {
  const ics = buildIcs({ ...base, description: 'line 1\nline 2', repeat: 'WEEKLY', remindMin: 15, location: 'Berlin' });
  assert.ok(ics.includes('DESCRIPTION:line 1\\nline 2\r\n'));
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY\r\n'));
  assert.ok(ics.includes('TRIGGER:-PT15M\r\n'));
  assert.ok(ics.includes('LOCATION:Berlin\r\n'));
  assert.ok(!buildIcs(base).includes('VALARM'));
});

test('long lines fold at 75 octets and never split a multi-byte character', () => {
  const folded = fold('SUMMARY:' + 'ü'.repeat(100));
  const parts = folded.split('\r\n');
  assert.ok(parts.length > 2);
  for (const p of parts) assert.ok(new TextEncoder().encode(p).length <= 75);
  assert.equal(parts.map((p, i) => (i ? p.slice(1) : p)).join(''), 'SUMMARY:' + 'ü'.repeat(100));
});
