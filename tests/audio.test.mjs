import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trim, fade, normalize, peakOf, toMono, peaks, encodeWav, clock, parseClock } from '../src/tools/audio/logic.ts';

const ramp = (n) => Float32Array.from({ length: n }, (_, i) => i / n);

test('trim cuts the same span from every channel and clamps the times', () => {
  const out = trim([ramp(100), ramp(100)], 100, 0.2, 0.5);
  assert.equal(out.length, 2);
  assert.equal(out[0].length, 30);
  assert.ok(Math.abs(out[0][0] - 0.2) < 1e-6);
  assert.equal(trim([ramp(100)], 100, -5, 99)[0].length, 100);
  assert.equal(trim([ramp(100)], 100, 0.8, 0.2)[0].length, 0);
});

test('fade ramps the ends and leaves the middle', () => {
  const c = new Float32Array(100).fill(1);
  fade([c], 100, 0.1, 0.2);
  assert.equal(c[0], 0);
  assert.ok(Math.abs(c[5] - 0.5) < 1e-6);
  assert.equal(c[50], 1);
  assert.equal(c[99], 0);
  assert.ok(Math.abs(c[89] - 0.5) < 1e-6 || Math.abs(c[89] - 0.55) < 0.06);
});

test('overlong fades are shortened instead of overlapping', () => {
  const c = new Float32Array(10).fill(1);
  fade([c], 10, 1, 1);
  assert.ok(c.every((x) => x >= 0 && x <= 1));
  assert.equal(c[0], 0);
  assert.equal(c[9], 0);
});

test('normalize brings the loudest sample to the target and keeps silence silent', () => {
  const a = Float32Array.of(0.1, -0.25, 0.05), b = Float32Array.of(0, 0.2, -0.1);
  const g = normalize([a, b], 1);
  assert.ok(Math.abs(g - 4) < 1e-6);
  assert.ok(Math.abs(peakOf([a, b]) - 1) < 1e-6);
  const z = new Float32Array(4);
  assert.equal(normalize([z]), 1);
  assert.deepEqual([...z], [0, 0, 0, 0]);
});

test('toMono averages the channels', () => {
  const [m] = toMono([Float32Array.of(1, 0.5), Float32Array.of(0, -0.5)]);
  assert.deepEqual([...m], [0.5, 0]);
  const one = [Float32Array.of(1)];
  assert.equal(toMono(one), one);
});

test('peaks give one maximum per bucket', () => {
  const p = peaks([Float32Array.of(0, 0.5, -0.9, 0.1, 0.2, 0.3, 0, 0)], 4);
  assert.deepEqual([...p].map((x) => Math.round(x * 10) / 10), [0.5, 0.9, 0.3, 0]);
  assert.equal(peaks([new Float32Array(0)], 3).length, 3);
});

test('encodeWav writes a valid 16-bit PCM header and interleaved samples', () => {
  const wav = encodeWav([Float32Array.of(1, -1, 0), Float32Array.of(0, 0.5, -2)], 8000);
  const v = new DataView(wav.buffer);
  const tag = (o) => String.fromCharCode(...wav.slice(o, o + 4));
  assert.equal(tag(0), 'RIFF'); assert.equal(tag(8), 'WAVE'); assert.equal(tag(12), 'fmt '); assert.equal(tag(36), 'data');
  assert.equal(v.getUint32(4, true), wav.length - 8);
  assert.equal(v.getUint16(20, true), 1);
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(24, true), 8000);
  assert.equal(v.getUint32(28, true), 32000);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(40, true), 12);
  assert.equal(wav.length, 44 + 12);
  const s = (i) => v.getInt16(44 + i * 2, true);
  assert.deepEqual([s(0), s(1), s(2), s(3), s(4), s(5)], [32767, 0, -32768, 16384, 0, -32768]);
});

test('clock and parseClock round-trip', () => {
  assert.equal(clock(83.4), '1:23.4');
  assert.equal(clock(5), '0:05.0');
  assert.equal(clock(3723.5), '1:02:03.5');
  assert.equal(parseClock('1:23.4'), 83.4);
  assert.equal(parseClock('83,4'), 83.4);
  assert.equal(parseClock('1:02:03'), 3723);
  assert.ok(Number.isNaN(parseClock('x')));
  assert.ok(Number.isNaN(parseClock('1:2:3:4')));
  assert.ok(Number.isNaN(parseClock('')));
});
