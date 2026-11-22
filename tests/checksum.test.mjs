import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { Sha256, parseExpected, hex } from '../src/tools/checksum/logic.ts';

const ref = (b) => createHash('sha256').update(b).digest('hex');

test('sha256 of empty input and "abc" match the standard vectors', () => {
  assert.equal(new Sha256().digest(), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(new Sha256().update(new TextEncoder().encode('abc')).digest(), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('sha256 equals node:crypto for lengths around the 64-byte block and 56-byte padding edges', () => {
  for (const n of [1, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000, 100_003]) {
    const b = randomBytes(n);
    assert.equal(new Sha256().update(b).digest(), ref(b), `len ${n}`);
  }
});

test('sha256 gives the same result however the input is chunked', () => {
  const b = randomBytes(5000);
  const h = new Sha256();
  for (let i = 0; i < b.length; ) { const n = 1 + ((i * 7) % 97); h.update(b.subarray(i, i + n)); i += n; }
  assert.equal(h.digest(), ref(b));
});

test('hex pads every byte to two digits', () => {
  assert.equal(hex(new Uint8Array([0, 1, 255])), '0001ff');
});

test('parseExpected takes a bare hash, a prefixed one, or a sha256sum line, in any case and spacing', () => {
  const h = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  assert.equal(parseExpected(h.toUpperCase()), h);
  assert.equal(parseExpected(`  sha256:${h}\n`), h);
  assert.equal(parseExpected(`${h}  model.gguf`), h);
  assert.equal(parseExpected(`${h.slice(0, 32)} ${h.slice(32)}`), h);
  assert.equal(parseExpected('not a hash'), '');
  assert.equal(parseExpected(''), '');
});
