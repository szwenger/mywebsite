import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeBytes, videoKbpsForSize, fmtBytes, uploadNeededKbps } from '../src/tools/bitrate/logic.ts';

test('size is total kilobits per second times seconds over 8, with decimal units', () => {
  assert.equal(sizeBytes(6000, 160, 3600), (6160 * 1000 / 8) * 3600);
  assert.equal(sizeBytes(8000, 0, 8), 8_000_000);
});

test('videoKbpsForSize is the inverse of sizeBytes', () => {
  const bytes = sizeBytes(6000, 160, 3600);
  assert.ok(Math.abs(videoKbpsForSize(bytes, 160, 3600) - 6000) < 1e-9);
});

test('videoKbpsForSize never goes below zero when audio alone exceeds the budget', () => {
  assert.equal(videoKbpsForSize(1000, 320, 3600), 0);
  assert.equal(videoKbpsForSize(1000, 0, 0), 0);
});

test('fmtBytes uses decimal units and one decimal above a gigabyte', () => {
  assert.equal(fmtBytes(999), '999 B');
  assert.equal(fmtBytes(1_500_000), '1.5 MB');
  assert.equal(fmtBytes(2_700_000_000), '2.70 GB');
});

test('uploadNeededKbps adds 25 percent headroom to the stream bitrate', () => {
  assert.equal(uploadNeededKbps(6000, 160), 7700);
});
