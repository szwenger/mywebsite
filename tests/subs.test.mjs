import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCues, parseTime, fmtTime, shift, toSrt, toVtt } from '../src/tools/subs/logic.ts';

const SRT = '﻿1\r\n00:00:01,000 --> 00:00:03,500\r\nHello\r\nworld\r\n\r\n2\r\n01:02:03,004 --> 01:02:05,000\r\nSecond\r\n';

test('parses SRT with BOM, CRLF and multi-line text', () => {
  const c = parseCues(SRT);
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { start: 1000, end: 3500, text: 'Hello\nworld' });
  assert.equal(c[1].start, 3723004);
});

test('parses WebVTT: header, NOTE, cue ids, settings and short hours', () => {
  const vtt = 'WEBVTT\n\nNOTE a comment\n\nintro\n00:01.500 --> 00:03.000 align:start position:10%\nHi\n\n01:00:00.000 --> 01:00:01.000\nLate\n';
  const c = parseCues(vtt);
  assert.deepEqual(c.map((x) => [x.start, x.end, x.text]), [[1500, 3000, 'Hi'], [3600000, 3601000, 'Late']]);
});

test('a short fraction is read as a fraction of a second, not as milliseconds', () => {
  assert.equal(parseTime('00:00:01.5'), 1500);
  assert.equal(parseTime('00:00:01,05'), 1050);
  assert.ok(Number.isNaN(parseTime('nope')));
});

test('SRT to VTT and back keeps cues and uses the right decimal separator', () => {
  const vtt = toVtt(parseCues(SRT));
  assert.ok(vtt.startsWith('WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nHello\nworld\n'));
  assert.equal(toSrt(parseCues(vtt)), toSrt(parseCues(SRT)));
  assert.ok(toSrt(parseCues(vtt)).startsWith('1\n00:00:01,000 --> 00:00:03,500'));
});

test('shift moves cues, drops those that end before zero and clamps starts', () => {
  const c = shift(parseCues(SRT), -2000);
  assert.equal(c.length, 2);
  assert.equal(c[0].start, 0);
  assert.equal(c[0].end, 1500);
  assert.equal(shift(parseCues(SRT), -5000)[0].start, 3718004);
  assert.equal(shift(parseCues(SRT), -5000).length, 1);
});

test('speed factor scales times (23.976 to 25 fps)', () => {
  const c = shift([{ start: 25000, end: 50000, text: 'x' }], 0, 23.976 / 25);
  assert.equal(Math.round(c[0].start), 23976);
  assert.equal(fmtTime(3723004, ','), '01:02:03,004');
});
