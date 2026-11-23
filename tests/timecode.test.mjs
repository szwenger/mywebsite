import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RATES, rate, toFrames, toTimecode, parseTimecode, addTimecodes, seconds, fromSeconds } from '../src/tools/timecode/logic.ts';

const r25 = rate('25');
const df30 = rate('29.97', true);
const df60 = rate('59.94', true);

test('non-drop timecode counts whole frames', () => {
  assert.equal(toFrames({ h: 0, m: 0, s: 1, f: 0 }, r25), 25);
  assert.equal(toTimecode(25 * 3661 + 3, r25), '01:01:01:03');
  assert.equal(toTimecode(0, r25), '00:00:00:00');
});

test('29.97 drop frame skips frame numbers 0 and 1 each minute except every tenth', () => {
  assert.equal(toTimecode(1799, df30), '00:00:59;29');
  assert.equal(toTimecode(1800, df30), '00:01:00;02');
  assert.equal(toTimecode(17982, df30), '00:10:00;00'); // the tenth minute keeps its frames
  assert.equal(toTimecode(107892, df30), '01:00:00;00'); // one hour of 29.97 is 107892 frames
  assert.equal(toFrames({ h: 1, m: 0, s: 0, f: 0 }, df30), 107892);
});

test('59.94 drop frame drops four frame numbers', () => {
  assert.equal(toTimecode(3599, df60), '00:00:59;59');
  assert.equal(toTimecode(3600, df60), '00:01:00;04');
  assert.equal(toTimecode(215784, df60), '01:00:00;00');
});

test('toFrames and toTimecode are inverses over two hours for every rate', () => {
  for (const r of [r25, rate('24'), rate('23.976'), rate('30'), rate('60'), df30, df60, rate('29.97'), rate('59.94')]) {
    const n = r.base * 7200;
    for (let f = 0; f <= n; f += 7) { // 7 is coprime to every frame rate here, so it steps through all minute offsets
      const tc = parseTimecode(toTimecode(f, r), r);
      assert.ok(tc, `${r.id} ${f}`);
      assert.equal(toFrames(tc, r), f, `${r.id} ${f}`);
    }
  }
});

test('parseTimecode accepts : ; . and bare digits, and rejects what cannot exist', () => {
  assert.deepEqual(parseTimecode('01:02:03:04', r25), { h: 1, m: 2, s: 3, f: 4 });
  assert.deepEqual(parseTimecode('01;02;03;04', r25), { h: 1, m: 2, s: 3, f: 4 });
  assert.deepEqual(parseTimecode('1:2:3:4', r25), { h: 1, m: 2, s: 3, f: 4 });
  assert.deepEqual(parseTimecode('01020304', r25), { h: 1, m: 2, s: 3, f: 4 });
  assert.equal(parseTimecode('00:00:00:25', r25), null); // frame 25 does not exist at 25 fps
  assert.equal(parseTimecode('00:60:00:00', r25), null);
  assert.equal(parseTimecode('abc', r25), null);
  assert.equal(parseTimecode('00:01:00;00', df30), null); // dropped number
  assert.deepEqual(parseTimecode('00:01:00;02', df30), { h: 0, m: 1, s: 0, f: 2 });
  assert.deepEqual(parseTimecode('00:10:00;00', df30), { h: 0, m: 10, s: 0, f: 0 });
});

test('adding and subtracting timecodes works in frames, negative results keep their sign', () => {
  assert.equal(addTimecodes('00:00:59;29', '00:00:00;01', 1, df30), '00:01:00;02');
  assert.equal(addTimecodes('01:00:00:00', '00:30:00:12', -1, r25), '00:29:59:13');
  assert.equal(addTimecodes('00:00:01:00', '00:00:02:00', -1, r25), '-00:00:01:00');
  assert.equal(addTimecodes('nope', '00:00:02:00', 1, r25), null);
});

test('real elapsed time uses the true frame rate, and seconds convert back to the nearest frame', () => {
  assert.equal(seconds(25, r25), 1);
  assert.ok(Math.abs(seconds(107892, df30) - 3599.9964) < 1e-4);
  assert.ok(Math.abs(seconds(24000, rate('23.976')) - 1001) < 1e-9);
  assert.equal(fromSeconds(1, r25), 25);
  assert.equal(fromSeconds(3600, df30), 107892);
});

test('rates: only 29.97 and 59.94 can drop frames', () => {
  assert.equal(rate('25', true).drop, 0);
  assert.equal(rate('29.97', true).drop, 2);
  assert.equal(rate('59.94', true).drop, 4);
  assert.equal(rate('29.97').drop, 0);
  assert.ok(RATES.every((r) => r.num / r.den > 0));
  assert.equal(rate('nope').id, '25'); // unknown id falls back to the default
});
