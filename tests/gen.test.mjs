import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, password, uuid4, uuid7, token, entropyBits } from '../src/tools/gen/logic.ts';

test('randomInt stays below the bound and hits every value of a small range', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) { const n = randomInt(6); assert.ok(n >= 0 && n < 6 && Number.isInteger(n)); seen.add(n); }
  assert.equal(seen.size, 6);
  assert.equal(randomInt(1), 0);
});

test('randomInt is not biased towards low values for a bound that does not divide 2^32', () => {
  const n = 3_000_000_000; // a bit above 2^31: a plain modulo would make the low third twice as likely
  let low = 0;
  for (let i = 0; i < 4000; i++) if (randomInt(n) < n / 3) low++;
  assert.ok(low > 1000 && low < 1700, String(low)); // expect ~1333
});

test('password has the length asked for and at least one character of every chosen set', () => {
  for (let i = 0; i < 200; i++) {
    const p = password({ length: 12, lower: true, upper: true, digits: true, symbols: true, ambiguous: true });
    assert.equal(p.length, 12);
    assert.match(p, /[a-z]/); assert.match(p, /[A-Z]/); assert.match(p, /\d/); assert.match(p, /[^A-Za-z0-9]/);
  }
});

test('password only uses chosen sets and can leave out look-alike characters', () => {
  const p = password({ length: 400, lower: true, upper: false, digits: true, symbols: false, ambiguous: false });
  assert.match(p, /^[a-z0-9]+$/);
  assert.doesNotMatch(p, /[oOlI01]/);
  assert.equal(password({ length: 8, lower: false, upper: false, digits: false, symbols: false, ambiguous: true }), '');
});

test('uuid4 and uuid7 have the right shape, version and variant', () => {
  const re = (v) => new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-${v}[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`);
  assert.match(uuid4(), re(4));
  assert.match(uuid7(), re(7));
  assert.notEqual(uuid4(), uuid4());
});

test('uuid7 starts with the millisecond timestamp so ids sort by creation time', () => {
  const t = Date.UTC(2026, 0, 15, 12, 0, 0);
  const id = uuid7(t);
  assert.equal(parseInt(id.replace(/-/g, '').slice(0, 12), 16), t);
  assert.ok(uuid7(t + 1) > uuid7(t));
});

test('token encodes the requested number of random bytes', () => {
  assert.match(token(16, 'hex'), /^[0-9a-f]{32}$/);
  assert.match(token(16, 'base64'), /^[A-Za-z0-9+/]{22}==$/);
  assert.match(token(16, 'base64url'), /^[A-Za-z0-9_-]{22}$/);
});

test('entropyBits is length times log2 of the pool', () => {
  assert.equal(Math.round(entropyBits(62, 16)), 95);
  assert.equal(entropyBits(1, 10), 0);
  assert.equal(entropyBits(0, 10), 0);
});
