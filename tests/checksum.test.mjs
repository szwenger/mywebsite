import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { Sha256, createHasher, hashAll, parseHash, ALGOS, hex } from '../src/tools/checksum/logic.ts';

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

const NODE = { md5: 'md5', sha1: 'sha1', sha256: 'sha256', sha512: 'sha512' };

test('every algorithm matches the standard vector for "abc"', () => {
  const abc = new TextEncoder().encode('abc');
  const want = {
    md5: '900150983cd24fb0d6963f7d28e17f72',
    sha1: 'a9993e364706816aba3e25717850c26c9cd0d89d',
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    sha512: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
  };
  for (const a of ALGOS) assert.equal(createHasher(a).update(abc).digest(), want[a], a);
});

test('every algorithm equals node:crypto around its block and padding edges, however it is chunked', () => {
  for (const a of ALGOS) {
    for (const n of [0, 1, 55, 56, 57, 63, 64, 65, 111, 112, 113, 127, 128, 129, 1000, 100_003]) {
      const b = randomBytes(n);
      assert.equal(createHasher(a).update(b).digest(), createHash(NODE[a]).update(b).digest('hex'), `${a} len ${n}`);
    }
    const b = randomBytes(5000);
    const h = createHasher(a);
    for (let i = 0; i < b.length; ) { const n = 1 + ((i * 7) % 97); h.update(b.subarray(i, i + n)); i += n; }
    assert.equal(h.digest(), createHash(NODE[a]).update(b).digest('hex'), `${a} chunked`);
  }
});

test('hashAll feeds one pass of data to all four and returns them by name', () => {
  const b = randomBytes(777);
  const all = hashAll().update(b).digest();
  assert.deepEqual(Object.keys(all), ALGOS);
  for (const a of ALGOS) assert.equal(all[a], createHash(NODE[a]).update(b).digest('hex'));
});

test('parseHash finds the algorithm from the length, from a bare hash, a prefixed one or a sum-file line', () => {
  const abc = { md5: '900150983cd24fb0d6963f7d28e17f72', sha1: 'a9993e364706816aba3e25717850c26c9cd0d89d' };
  const h = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  assert.deepEqual(parseHash(h.toUpperCase()), { algo: 'sha256', hash: h });
  assert.deepEqual(parseHash(`  sha256:${h}
`), { algo: 'sha256', hash: h });
  assert.deepEqual(parseHash(`${h}  model.gguf`), { algo: 'sha256', hash: h });
  assert.deepEqual(parseHash(`${h.slice(0, 32)} ${h.slice(32)}`), { algo: 'sha256', hash: h });
  assert.deepEqual(parseHash(`MD5 = ${abc.md5}`), { algo: 'md5', hash: abc.md5 });
  assert.deepEqual(parseHash(`SHA-1: ${abc.sha1}`), { algo: 'sha1', hash: abc.sha1 });
  const h512 = 'a'.repeat(128);
  assert.deepEqual(parseHash(h512), { algo: 'sha512', hash: h512 });
  assert.equal(parseHash('not a hash'), null);
  assert.equal(parseHash(''), null);
  assert.equal(parseHash('abc123'), null);
});

test('hashAll takes a subset, so a big file is only read through the algorithms asked for', () => {
  const b = randomBytes(300);
  assert.deepEqual(hashAll(['sha1']).update(b).digest(), { sha1: createHash('sha1').update(b).digest('hex') });
});
