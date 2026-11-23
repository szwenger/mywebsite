import test from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml, safeUrl, htmlDocument, firstHeading, counts } from '../src/tools/markdown/logic.ts';

test('headings, emphasis, lists, tables, task lists', () => {
  const h = markdownToHtml('# Hi\n\n**b** *i* `c`\n\n- [x] done\n- [ ] todo\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
  assert.match(h, /<h1>Hi<\/h1>/);
  assert.match(h, /<strong>b<\/strong>/);
  assert.match(h, /<code>c<\/code>/);
  assert.match(h, /type="checkbox"/);
  assert.match(h, /<table>/);
});

test('raw HTML is escaped, block and inline', () => {
  assert.doesNotMatch(markdownToHtml('<script>alert(1)</script>'), /<script/);
  assert.doesNotMatch(markdownToHtml('hello <img src=x onerror=alert(1)> there'), /<img/);
  assert.match(markdownToHtml('a <b>x</b>'), /&lt;b&gt;/);
});

test('unsafe link and image targets are neutralised', () => {
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'vbscript:x', 'data:text/html;base64,AAAA', 'file:///etc/passwd']) {
    const h = markdownToHtml(`[x](<${bad}>) ![y](<${bad}>)`);
    assert.doesNotMatch(h, /javascript|vbscript|data:text|file:/i, bad);
    assert.match(h, /href="#"/);
  }
});

test('safe targets stay', () => {
  assert.equal(safeUrl('https://a.b/c?d=1'), 'https://a.b/c?d=1');
  assert.equal(safeUrl('mailto:x@y.z'), 'mailto:x@y.z');
  assert.equal(safeUrl('#top'), '#top');
  assert.equal(safeUrl('../a.png'), '../a.png');
  assert.equal(safeUrl('data:image/png;base64,AAAA', true), 'data:image/png;base64,AAAA');
  assert.equal(safeUrl('data:image/svg+xml;base64,AAAA', true), '#');
  assert.equal(safeUrl('data:image/png;base64,AAAA'), '#');
});

test('standalone document', () => {
  const d = htmlDocument('<p>x</p>\n', 'A <b>', 'de');
  assert.match(d, /^<!doctype html>/);
  assert.match(d, /<html lang="de">/);
  assert.match(d, /<title>A &lt;b&gt;<\/title>/);
  assert.doesNotMatch(d, /https?:\/\//);
});

test('first heading and counts', () => {
  assert.equal(firstHeading('intro\n\n## The *Title* ##\n'), 'The Title');
  assert.equal(firstHeading('no heading'), '');
  assert.deepEqual(counts('  a b\nc '), { words: 3, chars: 8 });
  assert.deepEqual(counts(''), { words: 0, chars: 0 });
});
