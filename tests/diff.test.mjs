import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffLines, splitLines } from '../src/tools/diff/logic.ts';

const side = (ops, keep) => ops.filter((o) => o.t === 'eq' || o.t === keep).map((o) => o.text);

test('identical texts give only equal lines', () => {
  const r = diffLines('a\nb', 'a\nb');
  assert.deepEqual(r.ops.map((o) => o.t), ['eq', 'eq']);
  assert.deepEqual(r.stats, { added: 0, removed: 0 });
});

test('an inserted, a deleted and a replaced line are found', () => {
  assert.deepEqual(diffLines('a\nc', 'a\nb\nc').ops, [{ t: 'eq', text: 'a' }, { t: 'add', text: 'b' }, { t: 'eq', text: 'c' }]);
  assert.deepEqual(diffLines('a\nb\nc', 'a\nc').ops, [{ t: 'eq', text: 'a' }, { t: 'del', text: 'b' }, { t: 'eq', text: 'c' }]);
  const r = diffLines('a\nb\nc', 'a\nX\nc');
  assert.deepEqual(r.stats, { added: 1, removed: 1 });
});

test('empty sides: all added or all removed', () => {
  assert.deepEqual(diffLines('', 'a\nb').stats, { added: 2, removed: 0 });
  assert.deepEqual(diffLines('a\nb', '').stats, { added: 0, removed: 2 });
  assert.deepEqual(diffLines('', '').ops, []);
});

test('ignore options treat whitespace and case differences as equal but keep the original text', () => {
  const r = diffLines('Hello  World\nx', 'hello world\ny', { ignoreWs: true, ignoreCase: true });
  assert.deepEqual(r.ops[0], { t: 'eq', text: 'hello world' });
  assert.deepEqual(r.stats, { added: 1, removed: 1 });
});

test('line endings are normalised so CRLF text equals LF text', () => {
  assert.deepEqual(diffLines('a\r\nb', 'a\nb').stats, { added: 0, removed: 0 });
  assert.deepEqual(splitLines('a\r\nb\n'), ['a', 'b']);
});

test('the diff always rebuilds both inputs (random texts)', () => {
  let seed = 7;
  const rand = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
  for (let k = 0; k < 200; k++) {
    const mk = () => Array.from({ length: rand(25) }, () => 'xyzw'[rand(4)]).join('\n');
    const a = mk(), b = mk();
    const r = diffLines(a, b);
    assert.deepEqual(side(r.ops, 'del'), splitLines(a), a);
    assert.deepEqual(side(r.ops, 'add'), splitLines(b), b);
  }
});

test('a large mostly-equal input is fast', () => {
  const a = Array.from({ length: 20000 }, (_, i) => `line ${i}`);
  const b = [...a]; b[100] = 'changed'; b.splice(15000, 0, 'new');
  const t = Date.now();
  const r = diffLines(a.join('\n'), b.join('\n'));
  assert.deepEqual(r.stats, { added: 2, removed: 1 });
  assert.ok(Date.now() - t < 1000);
});

test('two completely different large texts fall back to remove-all and add-all without running out of memory', () => {
  const a = Array.from({ length: 6000 }, (_, i) => `a${i}`).join('\n'), b = Array.from({ length: 6000 }, (_, i) => `b${i}`).join('\n');
  const r = diffLines(a, b);
  assert.deepEqual(r.stats, { added: 6000, removed: 6000 });
  assert.deepEqual(side(r.ops, 'del'), splitLines(a));
  assert.deepEqual(side(r.ops, 'add'), splitLines(b));
});
