import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pdfStrings, TABS } from '../src/tools/pdf/strings.ts';

const dir = new URL('../src/tools/pdf/', import.meta.url);
const files = ['pdf.ts', 'panels.ts', 'editor.ts', 'preview.ts'].map((f) => readFileSync(new URL(f, dir), 'utf8'));
const page = readFileSync(new URL('../src/pages/[...lang]/tools/pdf/index.astro', import.meta.url), 'utf8');

test('every language has the same keys, none empty', () => {
  const en = Object.keys(pdfStrings.en).sort();
  for (const l of ['de', 'ru']) {
    assert.deepEqual(Object.keys(pdfStrings[l]).sort(), en, l);
    for (const [k, v] of Object.entries(pdfStrings[l])) assert.ok(v.trim(), `${l}.${k}`);
  }
});

test('placeholders survive translation', () => {
  for (const [k, v] of Object.entries(pdfStrings.en)) {
    const ph = (v.match(/\{[a-z]+\}/g) ?? []).sort().join();
    for (const l of ['de', 'ru']) assert.equal((pdfStrings[l][k].match(/\{[a-z]+\}/g) ?? []).sort().join(), ph, `${l}.${k}`);
  }
});

test('every string used by the code and the page exists', () => {
  const used = new Set();
  for (const src of [...files, page]) {
    for (const m of src.matchAll(/\bs\.([A-Za-z_][\w]*)/g)) used.add(m[1]);
    for (const m of src.matchAll(/\bs\['([^']+)'\]/g)) used.add(m[1]);
  }
  for (const k of ['rotate', 'del', 'earlier', 'later', 'busy', 'invalid', 'encrypted', 'syntax', 'empty', 'out-of-range']) used.add(k); // reached as s[error]
  for (const t of ['select', 'text', 'image', 'sign', 'draw', 'highlight', 'whiteout', 'redact']) used.add(`hint_${t}`);
  for (const id of TABS) { used.add(`t_${id}`); used.add(`d_${id}`); }
  for (const k of ['all', 'none', 'odd', 'even', 'invert', 'rotr', 'rotl', 'del', 'keep', 'dup', 'first', 'last', 'save']) used.add(`sel_${k}`);
  for (const k of ['light', 'balanced', 'strong', 'max']) { used.add(`lvl_${k}`); used.add(`lvl_${k}_d`); }
  for (const p of ['tl', 'tc', 'tr', 'bl', 'bc', 'br']) used.add(`pos_${p}`);
  for (const t of ['select', 'text', 'image', 'sign', 'draw', 'highlight', 'whiteout', 'redact']) used.add(`tool_${t}`);
  const missing = [...used].filter((k) => !(k in pdfStrings.en));
  assert.deepEqual(missing, []);
});

test('no string is left unused', () => {
  const text = [...files, page].join('\n');
  const dynamic = /^(t_|d_|sel_|lvl_|pos_|tool_|hint_)/;
  const unused = Object.keys(pdfStrings.en).filter((k) => !dynamic.test(k) && !text.includes(`s.${k}`) && !text.includes(`s['${k}']`) && !text.includes(`s[${k}]`) && !['rotate', 'del', 'earlier', 'later', 'busy', 'invalid', 'encrypted', 'syntax', 'empty', 'out-of-range'].includes(k));
  assert.deepEqual(unused, []);
});

test('every tab has a panel in the page', () => {
  for (const id of TABS) {
    const panel = id === 'sign' || id === 'redact' ? 'edit' : id;
    assert.ok(page.includes(`data-panel="${panel}"`), id);
  }
});
