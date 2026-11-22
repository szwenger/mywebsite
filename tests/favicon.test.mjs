import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIco, buildZip, crc32, squareCrop } from '../src/tools/favicon/logic.ts';

const png = (n) => Uint8Array.from({ length: n }, (_, i) => i & 255);

test('crc32 matches the standard check values', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(crc32(new TextEncoder().encode('hello')), 0x3610a686);
  assert.equal(crc32(new Uint8Array()), 0);
});

test('buildIco writes the header, one directory entry per image and the PNG data at the stated offsets', () => {
  const a = png(30), b = png(50);
  const ico = buildIco([{ size: 16, data: a }, { size: 256, data: b }]);
  const v = new DataView(ico.buffer);
  assert.deepEqual([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)], [0, 1, 2]);
  assert.equal(ico[6], 16); assert.equal(ico[7], 16); // width, height
  assert.equal(ico[6 + 16], 0); // 256 is stored as 0
  assert.equal(v.getUint32(6 + 8, true), 30); // size of first image
  assert.equal(v.getUint32(6 + 12, true), 6 + 32); // offset of first image
  assert.equal(v.getUint32(6 + 16 + 12, true), 6 + 32 + 30);
  assert.deepEqual([...ico.slice(6 + 32, 6 + 32 + 30)], [...a]);
  assert.equal(ico.length, 6 + 32 + 30 + 50);
});

test('buildZip stores files uncompressed with correct sizes, crc and a central directory', () => {
  const data = new TextEncoder().encode('hello');
  const zip = buildZip([{ name: 'a.txt', data }, { name: 'dir/b.bin', data: png(10) }]);
  const v = new DataView(zip.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(14, true), 0x3610a686); // crc of "hello"
  assert.equal(v.getUint32(18, true), 5); assert.equal(v.getUint32(22, true), 5);
  assert.equal(new TextDecoder().decode(zip.slice(30, 35)), 'a.txt');
  const eocd = zip.length - 22;
  assert.equal(v.getUint32(eocd, true), 0x06054b50);
  assert.equal(v.getUint16(eocd + 10, true), 2); // entries
  const cdStart = v.getUint32(eocd + 16, true);
  assert.equal(v.getUint32(cdStart, true), 0x02014b50);
});

test('squareCrop takes the centred square of the source, or pads it when asked', () => {
  assert.deepEqual(squareCrop(400, 200, 'cover'), { sx: 100, sy: 0, sw: 200, sh: 200, dx: 0, dy: 0, dw: 1, dh: 1 });
  assert.deepEqual(squareCrop(200, 400, 'cover'), { sx: 0, sy: 100, sw: 200, sh: 200, dx: 0, dy: 0, dw: 1, dh: 1 });
  assert.deepEqual(squareCrop(400, 200, 'contain'), { sx: 0, sy: 0, sw: 400, sh: 200, dx: 0, dy: 0.25, dw: 1, dh: 0.5 });
});
