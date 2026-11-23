import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLatex, toMathml, insertSnippet, SNIPPETS } from '../src/tools/latex/logic.ts';

test('renders a formula to HTML with MathML', () => {
  const r = renderLatex('\\frac{a}{b} + \\sqrt{x^2}', false);
  assert.ok(r.ok);
  assert.match(r.html, /class="katex"/);
  assert.match(r.html, /<math/);
  assert.doesNotMatch(r.html, /katex-display/);
  assert.match(renderLatex('x', true).html, /katex-display/);
});

test('empty input is fine, errors come back as text', () => {
  assert.deepEqual(renderLatex('  ', false), { ok: true, html: '' });
  const r = renderLatex('\\frac{a', false);
  assert.equal(r.ok, false);
  assert.ok(r.error.length > 0 && !r.error.startsWith('KaTeX parse error'));
  assert.equal(renderLatex('\\unknowncommand', false).ok, false);
});

test('links and raw HTML are not trusted', () => {
  const r = renderLatex('\\href{javascript:alert(1)}{x}', false);
  assert.doesNotMatch(r.ok ? r.html : '', /href="javascript:/);
  const t = renderLatex('\\text{<img src=x onerror=alert(1)>}', false);
  assert.ok(t.ok && !/<img/.test(t.html));
});

test('toMathml is just the math element', () => {
  const m = toMathml('a^2', false);
  assert.match(m, /^<math/);
  assert.match(m, /<\/math>$/);
  assert.doesNotMatch(m, /katex-html/);
});

test('insertSnippet: cursor placement and selection wrap', () => {
  assert.deepEqual(insertSnippet('x+', 2, 2, '\\sqrt{$}'), { text: 'x+\\sqrt{}', cursor: 8 });
  assert.deepEqual(insertSnippet('abc', 0, 3, '\\sqrt{$}'), { text: '\\sqrt{abc}', cursor: 9 });
  assert.deepEqual(insertSnippet('', 0, 0, '\\pi'), { text: '\\pi', cursor: 3 });
});

test('every snippet is valid LaTeX once its cursor mark is removed', () => {
  for (const s of SNIPPETS) assert.ok(renderLatex(s.tex.replace('$', ''), false).ok, s.label);
});
