import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { tools } from '../src/data/tools.ts';

// A client script finds its elements by [data-*] selectors. If the page markup loses or renames one, the tool breaks silently.
// This checks every selector the scripts of a tool use is in the built page, and that all three languages have the same data-* names.
const dist = new URL('../dist/', import.meta.url);
const page = (lang, slug) => { const u = new URL(`${lang === 'en' ? '' : lang + '/'}tools/${slug}/index.html`, dist); return existsSync(u) ? readFileSync(u, 'utf8') : null; };
const attrs = (html) => new Set([...html.matchAll(/\sdata-([a-z0-9-]+)(?=[\s=>/])/g)].map((m) => m[1]));

/** Attributes that only the scripts create (rows, cells, popovers), so the page never contains them. */
const BUILT_BY_SCRIPT = new Set(['field', 'i', 'k', 'tip', 'cat']);

for (const { slug } of tools) {
  test(`${slug}: every [data-*] selector in its scripts is in the page, and en, de and ru have the same data-* names`, () => {
    const en = page('en', slug);
    assert.ok(en, `build first: dist has no ${slug} page`);
    const dir = new URL(`../src/tools/${slug}/`, import.meta.url);
    const used = new Set();
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'logic.ts')) {
      for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/\[data-([a-z0-9-]+)/g)) used.add(m[1]);
    }
    const have = attrs(en);
    const missing = [...used].filter((a) => !have.has(a) && !BUILT_BY_SCRIPT.has(a));
    assert.deepEqual(missing, [], `${slug}: scripts select [data-${missing.join('], [data-')}] but the page has none`);
    for (const lang of ['de', 'ru']) {
      const other = attrs(page(lang, slug));
      const diff = [...have].filter((a) => !other.has(a)).concat([...other].filter((a) => !have.has(a)));
      assert.deepEqual(diff, [], `${slug}: data-* names differ between en and ${lang}`);
    }
  });
}
