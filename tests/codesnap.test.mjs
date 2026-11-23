import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, LANGS, THEMES, category, parseLines, prepare, renderSnap, tokenize } from '../src/tools/codesnap/logic.ts';

const js = 'const a = "x"; // note\nfunction f(n) {\n  return n + 1;\n}';

test('tokens give back exactly the code, line by line', () => {
  for (const [code, lang] of [[js, 'javascript'], [js, 'auto'], ['a < b && c > d', 'javascript'], ['<p class="x">&amp;</p>', 'xml'], ['plain <text> & more', 'plaintext']]) {
    const { lines } = tokenize(code, lang);
    assert.equal(lines.map((l) => l.map((t) => t.t).join('')).join('\n'), code, `${lang}: ${code}`);
  }
});

test('categories: keyword, string, comment, function name', () => {
  const { lines } = tokenize(js, 'javascript');
  const flat = lines.flat();
  const cat = (text) => flat.find((t) => t.t === text)?.c;
  assert.equal(cat('const'), 'keyword');
  assert.equal(cat('"x"'), 'string');
  assert.equal(cat('// note'), 'comment');
  assert.equal(cat('f'), 'title');
  assert.equal(category('hljs-title function_'), 'title');
  assert.equal(category('hljs-number'), 'number');
  assert.equal(category('hljs-unknown'), 'fg');
});

test('auto-detect picks a plausible language and unknown names fall back to plain text', () => {
  assert.equal(tokenize('def f(x):\n    return x * 2\n\nprint(f(2))', 'auto').lang, 'python');
  assert.equal(tokenize('SELECT u.id, COUNT(*) FROM users u JOIN orders o ON o.user_id = u.id GROUP BY u.id ORDER BY 2 DESC;', 'auto').lang, 'sql');
  assert.equal(tokenize('x', 'no-such-language').lang, 'plaintext');
  assert.equal(tokenize('', 'auto').lines.length, 1);
});

test('every listed language works', () => {
  for (const l of LANGS) assert.doesNotThrow(() => tokenize('x = 1\nfoo(bar)', l.id), l.id);
});

test('prepare: tabs by column, CRLF, trailing blanks', () => {
  assert.equal(prepare('\ta\r\n  \tb  \n\n\n', 4), '    a\n    b');
});

test('line spec', () => {
  const m = parseLines('2, +4-5, -7, junk, 9-8');
  assert.equal(m.get(2), 'mark');
  assert.equal(m.get(4), 'add');
  assert.equal(m.get(5), 'add');
  assert.equal(m.get(7), 'del');
  assert.equal(m.get(8), 'mark');
  assert.equal(m.get(9), 'mark');
  assert.equal(m.size, 6);
});

test('renderSnap: size follows content and padding, text is on a grid', () => {
  const a = renderSnap({ ...DEFAULTS, code: js });
  assert.equal(a.lines, 4);
  assert.match(a.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="\d+"/);
  assert.match(a.svg, /textLength=/);
  const b = renderSnap({ ...DEFAULTS, code: js, padding: 0 });
  assert.equal(a.w - b.w, 96);
  assert.equal(a.h - b.h, 96);
  const taller = renderSnap({ ...DEFAULTS, code: `${js}\n${js}` });
  assert.ok(taller.h > a.h);
  assert.ok(renderSnap({ ...DEFAULTS, code: js, minWidth: 900, padding: 0 }).w >= 900);
});

test('renderSnap options: frame, background, line numbers, marks, watermark', () => {
  const base = { ...DEFAULTS, code: js };
  assert.match(renderSnap({ ...base, frame: 'mac' }).svg, /#ff5f57/);
  assert.doesNotMatch(renderSnap({ ...base, frame: 'none' }).svg, /#ff5f57/);
  assert.ok(renderSnap({ ...base, frame: 'none' }).h < renderSnap({ ...base, frame: 'mac' }).h);
  assert.match(renderSnap({ ...base, bgMode: 'gradient' }).svg, /linearGradient/);
  assert.doesNotMatch(renderSnap({ ...base, bgMode: 'none' }).svg, /linearGradient|fill="#8e44ad"/);
  const ln = renderSnap({ ...base, lineNumbers: true, start: 98 });
  assert.match(ln.svg, />98</);
  assert.match(ln.svg, />101</);
  const m = renderSnap({ ...base, marks: '+2, -3', others: 'blur' });
  assert.match(m.svg, /#3fb950/);
  assert.match(m.svg, /#f85149/);
  assert.match(m.svg, /filter="url\(#bl\)"/);
  assert.match(renderSnap({ ...base, watermark: 'galuin.com' }).svg, />galuin\.com</);
});

test('renderSnap never lets text become markup', () => {
  const r = renderSnap({ ...DEFAULTS, code: '</text><script>alert(1)</script>"&', title: '<img onerror=x>', watermark: '</svg><b>', marks: '' });
  assert.doesNotMatch(r.svg, /<script|<img|<b>|<\/svg><b/);
  assert.equal((r.svg.match(/<\/svg>/g) ?? []).length, 1);
  assert.match(renderSnap({ ...DEFAULTS, code: 'x', c1: 'red;"><script>' }).svg, /#8e44ad/);
});

test('every theme renders and has the same keys', () => {
  const keys = Object.keys(THEMES[0]).sort().join();
  for (const t of THEMES) {
    assert.equal(Object.keys(t).sort().join(), keys, t.id);
    assert.match(renderSnap({ ...DEFAULTS, code: js, theme: t.id }).svg, new RegExp(t.bg));
  }
});
