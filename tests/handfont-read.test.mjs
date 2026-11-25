import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARSETS, GRID, GUIDE, ID_BOX, MARK, MARKS, cellsOf, decodeId, encodeId, pageCount, templateSvg, writeRect, charsOf } from '../src/tools/handfont/sheet.ts';
import { findMarkers, readPageId, inkMask, cellInk, glyphFromMask, ORIGIN, SPAN } from '../src/tools/handfont/read.ts';

const PPMM = 4;
const page = (dx = 0, dy = 0) => {
  const w = 210 * PPMM, h = 297 * PPMM;
  const g = new Uint8Array(w * h).fill(240);
  const rect = (x, y, rw, rh, v) => { for (let j = Math.round((y + dy) * PPMM); j < Math.round((y + rh + dy) * PPMM); j++) for (let i = Math.round((x + dx) * PPMM); i < Math.round((x + rw + dx) * PPMM); i++) if (i >= 0 && j >= 0 && i < w && j < h) g[j * w + i] = v; };
  return { g, w, h, rect };
};

test('config round-trips through the page ID, and a flipped bit fails the parity check', () => {
  const cfg = { sets: 0b110101, variants: 3 };
  for (let p = 0; p < pageCount(cfg); p++) assert.deepEqual(decodeId(encodeId(cfg, p)), { cfg, page: p });
  const bits = encodeId(cfg, 1);
  bits[2] = !bits[2];
  assert.equal(decodeId(bits), null);
  assert.equal(decodeId(encodeId({ sets: 1, variants: 1 }, 5)), null, 'page past the end');
  assert.equal(decodeId(encodeId({ sets: 0, variants: 1 }, 0)), null, 'no characters');
});

test('cells: every character gets `variants` cells, seven per row, none past the page', () => {
  const cfg = { sets: 1, variants: 2 };
  const cells = cellsOf(cfg);
  assert.equal(cells.length, 52);
  assert.deepEqual(cells.slice(0, 3).map((c) => [c.ch, c.variant, c.col, c.row]), [['a', 0, 0, 0], ['a', 1, 1, 0], ['b', 0, 2, 0]]);
  assert.ok(cells.every((c) => c.col < GRID.cols && c.row < GRID.rows && c.page === 0));
  assert.equal(charsOf(0b100000).length, 66);
  const all = { sets: 63, variants: 4 };
  assert.ok(pageCount(all) <= 16, 'page index fits 4 bits');
  assert.equal(new Set(CHARSETS.flatMap((c) => [...c.chars])).size, CHARSETS.reduce((n, c) => n + [...c.chars].length, 0), 'no character twice');
});

test('template svg has the markers, the page id and a cell per character on its page', () => {
  const svg = templateSvg({ sets: 1, variants: 2 }, 0, 'My hand');
  assert.equal((svg.match(/fill="#000"\/>/g) ?? []).length >= 4, true);
  assert.match(svg, /My hand/);
  assert.equal((svg.match(/stroke="#999"/g) ?? []).length, 52);
  assert.match(templateSvg({ sets: 1, variants: 1 }, 0, '<x>'), /&lt;x&gt;/);
});

test('findMarkers finds the four squares, also when the page is shifted a little', () => {
  for (const [dx, dy] of [[0, 0], [1.5, -1]]) {
    const p = page(dx, dy);
    for (const m of MARKS) p.rect(m.x - MARK / 2, m.y - MARK / 2, MARK, MARK, 20);
    const f = findMarkers(p.g, p.w, p.h, PPMM);
    assert.ok(f);
    f.forEach((c, i) => { assert.ok(Math.abs(c.x - (MARKS[i].x + dx) * PPMM) < 1.2); assert.ok(Math.abs(c.y - (MARKS[i].y + dy) * PPMM) < 1.2); });
  }
  const p = page();
  p.rect(MARKS[0].x - 2.5, MARKS[0].y - 2.5, 5, 5, 20);
  assert.equal(findMarkers(p.g, p.w, p.h, PPMM), null, 'three missing');
});

// A flat sheet with origin at the first marker.
const flat = (paint) => {
  const w = Math.round(SPAN.w * PPMM), h = Math.round(SPAN.h * PPMM);
  const g = new Uint8Array(w * h).fill(238);
  const rect = (x, y, rw, rh, v) => { for (let j = Math.round((y - ORIGIN.y) * PPMM); j < Math.round((y + rh - ORIGIN.y) * PPMM); j++) for (let i = Math.round((x - ORIGIN.x) * PPMM); i < Math.round((x + rw - ORIGIN.x) * PPMM); i++) if (i >= 0 && j >= 0 && i < w && j < h) g[j * w + i] = v; };
  paint(rect);
  return { gray: g, w, h, ppmm: PPMM };
};

test('readPageId reads the boxes back', () => {
  const cfg = { sets: 0b000111, variants: 2 };
  const f = flat((rect) => encodeId(cfg, 1).forEach((on, i) => rect(ID_BOX.x0 + i * ID_BOX.step, ID_BOX.y - ID_BOX.size / 2, ID_BOX.size, ID_BOX.size, on ? 10 : 255)));
  assert.deepEqual(readPageId(f), { cfg, page: 1 });
});

test('a drawn glyph becomes a clockwise contour on the baseline, a guide line and a stray stroke on the edge are ignored', () => {
  const r = writeRect(2, 3);
  const base = r.y + GUIDE.base;
  const f = flat((rect) => {
    rect(r.x, base, r.w, 0.3, 205); // light guide line
    rect(r.x + 8, base - 6, 2, 6, 40); // a stem standing on the baseline
    rect(r.x + 8, base - 6, 6, 1.6, 40); // with a top arm
    rect(r.x + r.w - 0.2, r.y + 2, 0.2 + 3, 9, 40); // a stroke from the next cell crossing the edge
  });
  const c = cellInk(inkMask(f.gray, f.w, f.h, 12), f, 2, 3);
  assert.ok(c.ink > 60);
  assert.equal(c.cut, true, 'edge stroke was removed and noticed');
  const g = glyphFromMask(c, PPMM, 40);
  assert.ok(g);
  const ys = g.contours.flat().map((p) => p.y), xs = g.contours.flat().map((p) => p.x);
  assert.ok(Math.abs(Math.min(...ys)) < 40, 'stem bottom sits on the baseline (y = 0)');
  assert.ok(Math.abs(Math.max(...ys) - 6 * 60) < 60, 'top arm 6 mm above it');
  assert.ok(Math.min(...xs) >= 30, 'left side bearing kept');
  assert.ok(Math.abs(g.advance - (Math.max(...xs) - Math.min(...xs) + 80)) < 40);
  const area = g.contours[0].reduce((s, p, i, a) => { const q = a[(i + 1) % a.length]; return s + (p.x * q.y - q.x * p.y); }, 0) / 2;
  assert.ok(area < 0, 'outer contour clockwise in y-up');
});

test('an empty cell gives no glyph', () => {
  const f = flat(() => {});
  assert.equal(glyphFromMask(cellInk(inkMask(f.gray, f.w, f.h, 12), f, 0, 0), PPMM, 40), null);
});
