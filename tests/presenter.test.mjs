import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtTime, isOver, elapsedMs, clampPage } from '../src/tools/presenter/logic.ts';

test('fmtTime shows minutes and seconds, floors, and never goes negative', () => {
  assert.equal(fmtTime(0), '00:00');
  assert.equal(fmtTime(59.9), '00:59');
  assert.equal(fmtTime(61), '01:01');
  assert.equal(fmtTime(90 * 60), '90:00');
  assert.equal(fmtTime(-5), '00:00');
});

test('isOver is true only once a valid target is reached', () => {
  assert.equal(isOver(299, 5), false);
  assert.equal(isOver(300, 5), true);
  assert.equal(isOver(9999, NaN), false);
  assert.equal(isOver(9999, 0), false);
  assert.equal(isOver(9999, -3), false);
});

test('elapsedMs adds the running stretch to what was banked while paused', () => {
  assert.equal(elapsedMs(5000, null, 99999), 5000);
  assert.equal(elapsedMs(5000, 1000, 4000), 8000);
  assert.equal(elapsedMs(0, 5000, 4000), 0); // clock stepping back never gives negative time
});

test('clampPage keeps a page number inside the document', () => {
  assert.equal(clampPage(0, 10), 1);
  assert.equal(clampPage(11, 10), 10);
  assert.equal(clampPage(4, 10), 4);
  assert.equal(clampPage(3, 0), 1);
});
