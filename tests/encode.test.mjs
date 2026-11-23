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

import { dataUri, parseDataUri, sniffImage } from '../src/tools/encode/logic.ts';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

test('sniffImage tells the common picture types by their first bytes', () => {
  assert.equal(sniffImage(PNG), 'image/png');
  assert.equal(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'image/jpeg');
  assert.equal(sniffImage(new TextEncoder().encode('GIF89a....')), 'image/gif');
  assert.equal(sniffImage(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(sniffImage(new TextEncoder().encode('BM......')), 'image/bmp');
  assert.equal(sniffImage(new TextEncoder().encode('  <?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>')), 'image/svg+xml');
  assert.equal(sniffImage(new TextEncoder().encode('<svg viewBox="0 0 1 1"/>')), 'image/svg+xml');
  assert.equal(sniffImage(new TextEncoder().encode('hello world')), null);
});

test('dataUri and parseDataUri round-trip, and parse takes a bare Base64 string too', () => {
  const uri = dataUri(PNG, 'image/png');
  assert.match(uri, /^data:image\/png;base64,iVBORw0KGgo/);
  const back = parseDataUri(uri);
  assert.equal(back.mime, 'image/png');
  assert.deepEqual([...back.bytes], [...PNG]);
  const bare = parseDataUri('iVBORw0KGgoAAAAA'); // no prefix: the type comes from the bytes
  assert.equal(bare.mime, 'image/png');
  assert.equal(parseDataUri(`  ${uri.slice(0, 30)}\n${uri.slice(30)}  `).mime, 'image/png'); // line breaks and padding are ignored
});

test('parseDataUri reads a percent-encoded SVG data URI and rejects what is not an image', () => {
  const svg = parseDataUri("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E");
  assert.equal(svg.mime, 'image/svg+xml');
  assert.equal(new TextDecoder().decode(svg.bytes), "<svg xmlns='http://www.w3.org/2000/svg'></svg>");
  assert.equal(parseDataUri('hello world, not base64!'), null);
  assert.equal(parseDataUri('data:text/plain;base64,aGVsbG8='), null);
  assert.equal(parseDataUri(''), null);
});
