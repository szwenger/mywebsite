import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { tools, topics, categories } from '../src/data/tools.ts';
import { extKey } from '../src/scripts/toolfilter.ts';

test('every tool has a page, a known category and text in all three languages', () => {
  const seen = new Set();
  for (const t of tools) {
    assert.ok(!seen.has(t.slug), `duplicate slug ${t.slug}`);
    seen.add(t.slug);
    assert.ok(categories[t.cat], `${t.slug}: unknown category ${t.cat}`);
    assert.ok(existsSync(new URL(`../src/pages/[...lang]/tools/${t.slug}/index.astro`, import.meta.url)), `${t.slug}: no page`);
    for (const l of ['en', 'de', 'ru']) assert.ok(t.name[l]?.trim() && t.blurb[l]?.trim(), `${t.slug}: ${l} text`);
  }
});

test('accepts and produces use the one spelling of each extension (jpg, heic, tif)', () => {
  for (const t of tools) for (const f of [...(t.accepts ?? []), ...(t.produces ?? [])]) {
    assert.match(f, /^[a-z0-9]+$/, `${t.slug}: "${f}"`);
    assert.equal(extKey(f), f, `${t.slug}: write "${extKey(f)}", not "${f}"`);
  }
});

test('topics: every one used is defined in three languages, and each groups at least three tools', () => {
  for (const [k, names] of Object.entries(topics)) for (const l of ['en', 'de', 'ru']) assert.ok(names[l]?.trim(), `${k}/${l}`);
  for (const t of tools) for (const k of t.topics ?? []) assert.ok(topics[k], `${t.slug}: unknown topic ${k}`);
  for (const k of Object.keys(topics)) assert.ok(tools.filter((t) => t.topics?.includes(k)).length >= 3, `${k} has fewer than three tools`);
});
