import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { zip, crc32 as ours } from '../src/tools/zip.ts';

test('crc32 matches node', () => {
  for (const s of ['', 'a', 'hello world', 'ü€'.repeat(100)]) assert.equal(ours(new TextEncoder().encode(s)), crc32(Buffer.from(s)));
});

test('the archive has local headers, a central directory and an end record that point at each other', () => {
  const a = new TextEncoder().encode('first file');
  const b = new TextEncoder().encode('zweite Datei ü');
  const out = zip([{ name: 'a.txt', data: a }, { name: 'ü/b.txt', data: b }], new Date(2026, 5, 7, 8, 9, 10));
  const v = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const end = out.length - 22;
  assert.equal(v.getUint32(end, true), 0x06054b50);
  assert.equal(v.getUint16(end + 10, true), 2);
  let p = v.getUint32(end + 16, true);
  assert.equal(p + v.getUint32(end + 12, true), end);
  const seen = [];
  for (let i = 0; i < 2; i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50);
    const crc = v.getUint32(p + 16, true), size = v.getUint32(p + 20, true), nlen = v.getUint16(p + 28, true), off = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(out.subarray(p + 46, p + 46 + nlen));
    assert.equal(v.getUint32(off, true), 0x04034b50);
    const start = off + 30 + v.getUint16(off + 26, true);
    const data = out.subarray(start, start + size);
    assert.equal(crc32(data), crc);
    seen.push([name, new TextDecoder().decode(data)]);
    p += 46 + nlen;
  }
  assert.deepEqual(seen, [['a.txt', 'first file'], ['ü/b.txt', 'zweite Datei ü']]);
  assert.equal(zip([]).length, 22);
});
