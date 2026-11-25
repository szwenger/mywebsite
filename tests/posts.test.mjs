import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { allTags, postKind, postsFor, withTag } from '../src/lib/posts.ts';

const e = (slug, lang, date, extra = {}) => ({ slug, lang, title: `${slug}-${lang}`, date: new Date(date), body: '', ...extra });

test('postKind: no cover is a note, a cover makes it long', () => {
  assert.equal(postKind({}), 'note');
  assert.equal(postKind({ cover: 'x.jpg' }), 'long');
});

test('postsFor shows the translation when it exists', () => {
  const all = [e('a', 'en', '2024-01-01'), e('a', 'de', '2024-01-02')];
  const [p] = postsFor('de', all);
  assert.equal(p.shownIn, 'de');
  assert.equal(p.fallback, false);
  assert.equal(p.title, 'a-de');
});

test('postsFor falls back to the original and says so', () => {
  const all = [e('a', 'en', '2024-01-01'), e('a', 'de', '2024-01-02')];
  const [p] = postsFor('ru', all);
  assert.equal(p.shownIn, 'en');
  assert.equal(p.fallback, true);
  assert.equal(p.originalLang, 'en');
});

test('a post that exists only in ru still appears in en, marked as fallback', () => {
  const [p] = postsFor('en', [e('b', 'ru', '2024-02-01')]);
  assert.equal(p.slug, 'b');
  assert.equal(p.originalLang, 'ru');
  assert.equal(p.shownIn, 'ru');
  assert.equal(p.fallback, true);
});

test('the original is the earliest entry; ties go en, de, ru', () => {
  const all = [e('a', 'ru', '2024-01-01'), e('a', 'de', '2024-01-01'), e('a', 'en', '2024-01-01')];
  assert.equal(postsFor('ru', all)[0].originalLang, 'en');
  const later = [e('a', 'en', '2024-03-01'), e('a', 'de', '2024-01-01')];
  assert.equal(postsFor('ru', later)[0].originalLang, 'de');
});

test('one entry per slug, newest first, kind follows the cover', () => {
  const all = [
    e('old', 'en', '2024-01-01'),
    e('new', 'en', '2024-05-01', { cover: '/c.jpg' }),
    e('new', 'de', '2024-05-02', { cover: '/c.jpg' }),
    e('mid', 'de', '2024-03-01'),
  ];
  const out = postsFor('de', all);
  assert.deepEqual(out.map((p) => p.slug), ['new', 'mid', 'old']);
  assert.deepEqual(out.map((p) => p.kind), ['long', 'note', 'note']);
});

test('same-date posts keep a stable order (slug ascending)', () => {
  const all = [e('z', 'en', '2024-01-01'), e('a', 'en', '2024-01-01')];
  assert.deepEqual(postsFor('en', all).map((p) => p.slug), ['a', 'z']);
});

test('same day: the later time comes first, whatever the slug', () => {
  const all = [e('imagegen', 'en', '2024-01-01T20:10:00Z'), e('tts', 'en', '2024-01-01T21:25:00Z')];
  assert.deepEqual(postsFor('en', all).map((p) => p.slug), ['tts', 'imagegen']);
});

test('allTags: unique, most used first, ties alphabetical', () => {
  const views = postsFor('en', [
    e('a', 'en', '2024-01-01', { tags: ['llm', 'amd'] }),
    e('b', 'en', '2024-01-02', { tags: ['llm', 'tts'] }),
    e('c', 'en', '2024-01-03'),
  ]);
  assert.deepEqual(allTags(views), [{ tag: 'llm', count: 2 }, { tag: 'amd', count: 1 }, { tag: 'tts', count: 1 }]);
});

test('withTag keeps only posts carrying the tag, order unchanged', () => {
  const views = postsFor('en', [
    e('a', 'en', '2024-01-01', { tags: ['llm'] }),
    e('b', 'en', '2024-01-02', { tags: ['tts'] }),
    e('c', 'en', '2024-01-03', { tags: ['llm', 'tts'] }),
  ]);
  assert.deepEqual(withTag(views, 'llm').map((p) => p.slug), ['c', 'a']);
  assert.deepEqual(withTag(views, 'nope'), []);
});

test('content: tags are lowercase slugs and identical across the languages of a post', () => {
  const root = new URL('../src/content/posts/', import.meta.url);
  for (const dir of readdirSync(root)) {
    const sets = readdirSync(new URL(`${dir}/`, root)).map((f) => {
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(new URL(`${dir}/${f}`, root), 'utf8'))?.[1] ?? '';
      const m = /^tags:\s*\[(.*)\]\s*$/m.exec(fm);
      const tags = m ? m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
      for (const t of tags) assert.match(t, /^[a-z0-9-]+$/, `${dir}/${f}: bad tag "${t}"`);
      return tags.slice().sort().join(',');
    });
    assert.equal(new Set(sets).size, 1, `${dir}: tags differ between languages`);
  }
});
