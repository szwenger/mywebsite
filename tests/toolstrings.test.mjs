import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

const dir = new URL('../src/i18n/tools/', import.meta.url);
const slugs = readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => f.slice(0, -3));
const mods = await Promise.all(slugs.map(async (slug) => [slug, (await import(new URL(`${slug}.ts`, dir))).s]));
const tokens = (v) => [...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('there is at least one per-tool string module', () => assert.ok(mods.length >= 1));

for (const [slug, s] of mods) {
  test(`${slug}: en, de and ru have the same keys, no empty values and the same {placeholders}`, () => {
    assert.deepEqual(Object.keys(s).sort(), ['de', 'en', 'ru']);
    for (const l of ['de', 'ru']) {
      assert.deepEqual(Object.keys(s[l]).sort(), Object.keys(s.en).sort(), `${slug}/${l} keys`);
      for (const [k, v] of Object.entries(s[l])) assert.equal(tokens(v), tokens(s.en[k]), `${slug}/${l}.${k} placeholders`);
    }
    for (const l of ['en', 'de', 'ru']) for (const [k, v] of Object.entries(s[l])) assert.ok(String(v).trim(), `${slug}/${l}.${k} is empty`);
  });
}
