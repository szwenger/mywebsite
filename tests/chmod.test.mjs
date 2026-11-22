import { test } from 'node:test';
import assert from 'node:assert/strict';
import { symbolic, parseMode, octal, chmodWords } from '../src/tools/chmod/logic.ts';

test('common modes in both notations', () => {
  for (const [o, s] of [['755', 'rwxr-xr-x'], ['644', 'rw-r--r--'], ['600', 'rw-------'], ['777', 'rwxrwxrwx'], ['000', '---------'], ['4755', 'rwsr-xr-x'], ['2755', 'rwxr-sr-x'], ['1777', 'rwxrwxrwt'], ['4644', 'rwSr--r--'], ['1666', 'rw-rw-rwT']]) {
    assert.equal(symbolic(parseInt(o, 8)), s, o);
    assert.equal(parseMode(s), parseInt(o, 8), s);
    assert.equal(octal(parseMode(o)), o, `octal ${o}`);
  }
});

test('input forms: octal with leading zero, ls prefix, bad text', () => {
  assert.equal(parseMode('0644'), 0o644);
  assert.equal(parseMode('-rwxr-xr-x'), 0o755);
  assert.equal(parseMode('drwxr-xr-x'), 0o755);
  assert.equal(parseMode('758'), null);
  assert.equal(parseMode('rwxr-xr-'), null);
  assert.equal(parseMode(''), null);
  assert.equal(parseMode('12'), null);
});

test('chmod words', () => {
  assert.equal(chmodWords(0o755), 'u=rwx,g=rx,o=rx');
  assert.equal(chmodWords(0o4750), 'u=rwxs,g=rx,o=');
  assert.equal(chmodWords(0o1777), 'u=rwx,g=rwx,o=rwxt');
});
