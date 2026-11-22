import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitPost, protect, restore, chunk, cleanReply, withTitle, buildMessages, translatePost } from '../src/lib/translate.mjs';

const POST = `---
title: "Local LLMs: the settings mattered"
date: 2026-11-20
cover: /posts/llm-benchmark.png
tags: [llm, benchmark]
---
Hello world with \`code\` inline.

![alt text](/posts/x.png)

\`\`\`bash
npm run build
\`\`\`

See [the site](https://galuin.com/blog/).
`;

test('splitPost: separates front matter lines from the body', () => {
  const { front, body } = splitPost(POST);
  assert.equal(front.length, 4);
  assert.equal(front[0], 'title: "Local LLMs: the settings mattered"');
  assert.ok(body.startsWith('Hello world'));
});

test('splitPost: a file without front matter is an error', () => {
  assert.throws(() => splitPost('just text'), /front matter/);
});

test('protect/restore: code, image and link targets survive a round trip and are hidden from the model', () => {
  const { body } = splitPost(POST);
  const { text, slots } = protect(body);
  assert.ok(!text.includes('npm run build'));
  assert.ok(!text.includes('/posts/x.png'));
  assert.ok(!text.includes('https://galuin.com/blog/'));
  assert.ok(!text.includes('`code`'));
  assert.ok(text.includes('Hello world with'));
  assert.ok(text.includes('alt text'), 'alt text and link text stay translatable');
  assert.ok(text.includes('the site'));
  assert.equal(restore(text, slots), body);
});

test('restore: a placeholder the model dropped is an error, not silent damage', () => {
  const { text, slots } = protect('A `x` b');
  assert.throws(() => restore(text.replace(/@@\d+@@/, ''), slots), /placeholder/);
});

test('restore: an invented placeholder is an error', () => {
  const { text, slots } = protect('A `x` b');
  assert.throws(() => restore(text + ' @@99@@', slots), /placeholder/);
});

test('chunk: groups blocks under the limit and joins back to the same text', () => {
  const text = 'aaa\n\nbbb\n\nccc\n\nddd';
  const parts = chunk(text, 8);
  assert.deepEqual(parts, ['aaa\n\nbbb', 'ccc\n\nddd']);
  assert.equal(parts.join('\n\n'), text);
});

test('chunk: a single block over the limit stays whole', () => {
  assert.deepEqual(chunk('x'.repeat(50), 10), ['x'.repeat(50)]);
});

test('cleanReply: drops think blocks, code fences around the whole reply and outer whitespace', () => {
  assert.equal(cleanReply('<think>hmm</think>\n\nHallo Welt\n'), 'Hallo Welt');
  assert.equal(cleanReply('```markdown\nHallo\n```'), 'Hallo');
  assert.equal(cleanReply('Text\n\n```bash\nls\n```'), 'Text\n\n```bash\nls\n```', 'inner fences stay');
});

test('withTitle: replaces only the title line and quotes it safely', () => {
  const { front } = splitPost(POST);
  const out = withTitle(front, 'Lokale LLMs: "Einstellungen" zählen');
  assert.equal(out[0], 'title: "Lokale LLMs: \\"Einstellungen\\" zählen"');
  assert.deepEqual(out.slice(1), front.slice(1));
});

test('buildMessages: names the target language and lists the keep-as-is terms', () => {
  const msgs = buildMessages('Hello', 'de', ['flash attention', 'KV cache']);
  const sys = msgs[0].content;
  assert.match(sys, /German/);
  assert.match(sys, /flash attention/);
  assert.match(sys, /KV cache/);
  assert.equal(msgs[1].content, 'Hello');
  assert.match(buildMessages('Hi', 'ru', [])[0].content, /Russian/);
});

test('translatePost: translates title and prose, leaves code, URLs, cover and tags alone', async () => {
  const seen = [];
  const complete = async (messages) => {
    seen.push(messages);
    const t = messages[1].content;
    if (messages[1].content === 'Local LLMs: the settings mattered') return 'Lokale LLMs: die Einstellungen zählen';
    return t.replace('Hello world with', 'Hallo Welt mit').replace('See', 'Siehe');
  };
  const out = await translatePost({ source: POST, lang: 'de', keep: ['flash attention'], complete });
  assert.match(out, /^---\ntitle: "Lokale LLMs: die Einstellungen zählen"\n/);
  assert.match(out, /\ncover: \/posts\/llm-benchmark\.png\n/);
  assert.match(out, /\ntags: \[llm, benchmark\]\n/);
  assert.match(out, /Hallo Welt mit `code` inline\./);
  assert.match(out, /!\[alt text\]\(\/posts\/x\.png\)/);
  assert.match(out, /```bash\nnpm run build\n```/);
  assert.match(out, /Siehe \[the site\]\(https:\/\/galuin\.com\/blog\/\)\./);
  assert.ok(seen.every((m) => !m[1].content.includes('npm run build')), 'code never reaches the model');
});

test('translatePost: a title answered with an invented article is rejected', async () => {
  const complete = async (m) => (m[1].content.startsWith('Local LLMs') ? `Lokale LLMs\n\n${'Ich habe lange gedacht. '.repeat(20)}` : m[1].content);
  await assert.rejects(translatePost({ source: POST, lang: 'de', keep: [], complete }), /title/);
});

test('translatePost: a body chunk that comes back far too long or too short is rejected', async () => {
  const long = async (m) => (m[1].content.startsWith('Local LLMs') ? 'Titel' : `${m[1].content} ${'blah '.repeat(500)}`);
  await assert.rejects(translatePost({ source: POST, lang: 'de', keep: [], complete: long }), /length/);
  const short = async (m) => (m[1].content.startsWith('Local LLMs') ? 'Titel' : 'ok');
  await assert.rejects(translatePost({ source: POST, lang: 'de', keep: [], complete: short }), /length/);
});

test('translatePost: a model that mangles a placeholder fails the whole translation', async () => {
  const complete = async (m) => m[1].content.replace(/@@\d+@@/g, '');
  await assert.rejects(translatePost({ source: POST, lang: 'ru', keep: [], complete }), /placeholder/);
});
