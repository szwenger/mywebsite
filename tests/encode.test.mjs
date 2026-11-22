import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode, decodeJwt } from '../src/tools/encode/logic.ts';

test('base64 round-trips UTF-8 and matches the known value', () => {
  assert.equal(encode('base64', 'Hello'), 'SGVsbG8=');
  const s = 'Grüße, мир ✓ 🙂';
  assert.equal(decode('base64', encode('base64', s)), s);
});

test('base64url is URL-safe without padding, and decode accepts both alphabets and missing padding', () => {
  const e = encode('base64url', '??>>');
  assert.equal(e, 'Pz8-Pg');
  assert.equal(decode('base64', e), '??>>');
  assert.equal(decode('base64url', 'Pz8+Pg=='), '??>>');
  assert.equal(decode('base64', 'SGVs\nbG8='), 'Hello');
});

test('bad input throws a code, not a stack trace', () => {
  assert.throws(() => decode('base64', '!!!'), { message: 'base64' });
  assert.throws(() => decode('base64', 'A'), { message: 'base64' });
  assert.throws(() => decode('base64', '/w=='), { message: 'utf8' });
  assert.throws(() => decode('url', '%E0%A4%A'), { message: 'url' });
  assert.throws(() => decode('hex', 'abc'), { message: 'hex' });
});

test('url encoding escapes reserved characters', () => {
  assert.equal(encode('url', 'a b&c=d/ü'), 'a%20b%26c%3Dd%2F%C3%BC');
  assert.equal(decode('url', 'a%20b%26c'), 'a b&c');
});

test('hex shows bytes, and decode accepts spaces, 0x and \\x', () => {
  assert.equal(encode('hex', 'Aü'), '41 c3 bc');
  assert.equal(decode('hex', '41 c3 bc'), 'Aü');
  assert.equal(decode('hex', '\\x48\\x69'), 'Hi');
  assert.equal(decode('hex', '0x480x69'), 'Hi');
});

test('html escapes the five characters and decodes named and numeric entities', () => {
  assert.equal(encode('html', `<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(decode('html', '&lt;b&gt; &amp;amp; &#65;&#x1F642; &unknown;'), '<b> &amp; A🙂 &unknown;');
});

const jwt = (o, p) => [o, p].map((x) => Buffer.from(JSON.stringify(x)).toString('base64url')).join('.') + '.sig';

test('JWT: header, payload, signature text and readable times', () => {
  const j = decodeJwt('Bearer ' + jwt({ alg: 'HS256', typ: 'JWT' }, { sub: '1', exp: 1768503600, iat: 1768500000 }));
  assert.deepEqual(j.header, { alg: 'HS256', typ: 'JWT' });
  assert.equal(j.signature, 'sig');
  assert.deepEqual(j.times, [{ claim: 'exp', iso: '2026-01-15T19:00:00.000Z' }, { claim: 'iat', iso: '2026-01-15T18:00:00.000Z' }]);
});

test('JWT: junk is rejected', () => {
  assert.throws(() => decodeJwt('abc'), { message: 'jwt' });
  assert.throws(() => decodeJwt('a.b.c'), { message: 'jwt' });
});
