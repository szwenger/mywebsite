import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTtf } from '../src/tools/handfont/ttf.ts';
import { cleanMask, boundaryLoops, toContours, signedArea } from '../src/tools/handfont/trace.ts';

const sq = (x, y, s) => [{ x, y, on: true }, { x, y: y + s, on: true }, { x: x + s, y: y + s, on: true }, { x: x + s, y, on: true }];
const spec = (variants = 2, chars = 'ab') => ({
  family: 'Test Hand', unitsPerEm: 1000, ascender: 800, descender: -300, spaceAdvance: 300, created: 3000000000,
  chars: [...chars].map((ch, i) => ({ ch, variants: Array.from({ length: variants }, (_, v) => ({ advance: 500 + 10 * v, contours: [sq(50, 0, 300 + 20 * i + v)] })) })),
});
const u16 = (b, o) => (b[o] << 8) | b[o + 1];
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const tables = (b) => {
  const n = u16(b, 4), t = {};
  for (let i = 0; i < n; i++) { const o = 12 + 16 * i; t[String.fromCharCode(...b.slice(o, o + 4))] = { off: u32(b, o + 8), len: u32(b, o + 12), sum: u32(b, o + 4) }; }
  return t;
};
const sum = (b, off, len) => { let s = 0; for (let i = 0; i < len + ((4 - (len % 4)) % 4); i += 4) s = (s + (((b[off + i] ?? 0) << 24) | ((b[off + i + 1] ?? 0) << 16) | ((b[off + i + 2] ?? 0) << 8) | (b[off + i + 3] ?? 0))) >>> 0; return s; };

test('ttf: table directory is sorted, checksums match, the whole file sums to the magic number', () => {
  const b = buildTtf(spec());
  assert.equal(u32(b, 0), 0x00010000);
  const t = tables(b);
  assert.deepEqual(Object.keys(t), ['GSUB', 'OS/2', 'cmap', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'post']);
  for (const [tag, e] of Object.entries(t)) {
    if (tag === 'head') continue;
    assert.equal(sum(b, e.off, e.len), e.sum, tag);
    assert.equal(e.off % 4, 0, tag + ' aligned');
  }
  assert.equal(sum(b, 0, b.length), 0xb1b0afba);
});

test('ttf: glyph count is notdef + space + chars + alternates, and every glyph has an advance', () => {
  const b = buildTtf(spec(3, 'abc'));
  const t = tables(b);
  assert.equal(u16(b, t.maxp.off + 4), 2 + 3 * 3);
  assert.equal(u16(b, t.hhea.off + 34), 2 + 3 * 3);
  assert.equal(t.hmtx.len, (2 + 9) * 4);
});

test('ttf: cmap maps space and the characters to their default glyphs', () => {
  const b = buildTtf(spec(2, 'ab'));
  const c = tables(b).cmap.off;
  const sub = c + u32(b, c + 4 + 4); // first record offset
  assert.equal(u16(b, sub), 4);
  const sc = u16(b, sub + 6) / 2;
  const look = (cp) => {
    for (let i = 0; i < sc; i++) {
      const end = u16(b, sub + 14 + 2 * i), start = u16(b, sub + 16 + 2 * sc + 2 * i), delta = u16(b, sub + 16 + 4 * sc + 2 * i);
      if (cp <= end) return cp >= start ? (cp + delta) & 0xffff : 0;
    }
    return 0;
  };
  assert.equal(look(0x20), 1);
  assert.equal(look(0x61), 2);
  assert.equal(look(0x62), 3);
  assert.equal(look(0x63), 0);
});

test('ttf: calt is only written when there is more than one variant', () => {
  assert.ok(!('GSUB' in tables(buildTtf(spec(1)))));
  assert.ok('GSUB' in tables(buildTtf(spec(2))));
});

test('ttf: an empty font still builds', () => {
  const b = buildTtf({ family: 'X', unitsPerEm: 1000, ascender: 800, descender: -200, spaceAdvance: 300, chars: [] });
  assert.equal(sum(b, 0, b.length), 0xb1b0afba);
});

const maskOf = (rows) => { const h = rows.length, w = rows[0].length; return { w, h, m: Uint8Array.from(rows.join('').split('').map((c) => (c === '#' ? 1 : 0))) }; };

test('trace: a solid blob is one loop, a ring is two (outer and hole, opposite direction)', () => {
  const solid = maskOf(['......', '.####.', '.####.', '.####.', '.####.', '......']);
  const l1 = boundaryLoops(solid.m, solid.w, solid.h);
  assert.equal(l1.length, 1);
  assert.equal(Math.abs(signedArea(l1[0])), 16);
  const ring = maskOf(['.......', '.#####.', '.#...#.', '.#...#.', '.#...#.', '.#####.', '.......']);
  const l2 = boundaryLoops(ring.m, ring.w, ring.h);
  assert.equal(l2.length, 2);
  const [a, b] = l2.map(signedArea);
  assert.ok(a * b < 0, 'opposite orientation');
});

test('trace: cleanMask drops blobs touching the edge and specks, keeps the rest', () => {
  const r = maskOf(['#.........', '..........', '....####..', '....####..', '....####..', '..........', '..#.......']);
  const out = cleanMask(r.m, r.w, r.h, 5);
  assert.equal(out[0], 0, 'edge blob gone');
  assert.equal(out[2 * r.w + 4], 1, 'centre blob kept');
  assert.equal(out[6 * r.w + 2], 0, 'speck gone');
});

test('trace: contours of a blob stay near its outline and flag gentle bends as off-curve', () => {
  const s = maskOf(Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => ((x - 12) ** 2 + (y - 12) ** 2 < 81 ? '#' : '.')).join('')));
  const c = toContours(boundaryLoops(s.m, s.w, s.h));
  assert.equal(c.length, 1);
  assert.ok(c[0].pts.length >= 8 && c[0].pts.length < 80);
  for (const p of c[0].pts) assert.ok(Math.abs(Math.hypot(p.x - 12, p.y - 12) - 9) < 1.2, 'on the circle');
  assert.ok(c[0].on.filter(Boolean).length < c[0].on.length / 2, 'mostly off-curve');
});

test('ttf: fixed-size tables have their specified lengths', () => {
  const t = tables(buildTtf(spec()));
  assert.deepEqual([t.head.len, t.hhea.len, t.maxp.len, t['OS/2'].len, t.post.len], [54, 36, 32, 96, 32]);
});
