import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releases, earlier, latest, isNew } from '../src/data/changelog.ts';
import { tools } from '../src/data/tools.ts';

const slugs = new Set(tools.map((t) => t.slug));
const LANGS = ['en', 'de', 'ru'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const changes = releases.flatMap((r) => r.changes);

test('releases: newest first, one release per minor, no gaps down to the earlier list', () => {
  assert.ok(releases.length >= 1);
  const minors = releases.map((r) => r.minor);
  assert.deepEqual(minors, minors.map((_, i) => minors[0] - i));
  assert.equal(`0.${releases.at(-1).minor - 1}`, earlier[0].v);
});

test('a release starts with a new tool at patch 0, then patches count up without gaps', () => {
  for (const r of releases) {
    assert.deepEqual(r.changes.map((c) => c.patch), r.changes.map((_, i) => i), `0.${r.minor}`);
    assert.equal(r.changes[0].kind, 'new', `0.${r.minor}.0 is the new tool`);
    assert.equal(r.changes[0].tool, r.tool, `0.${r.minor}.0 links to ${r.tool}`);
    assert.ok(slugs.has(r.tool), `unknown tool "${r.tool}"`);
  }
});

test('every change has a kind, a date, en, de and ru text, and links to a tool that exists', () => {
  for (const c of changes) {
    assert.ok(['new', 'changed', 'fixed', 'internal'].includes(c.kind), c.text.en);
    assert.match(c.date, ISO);
    for (const lang of LANGS) assert.ok(c.text[lang]?.trim(), `missing ${lang}: ${c.text.en}`);
    if (c.tool) assert.ok(slugs.has(c.tool), `unknown tool "${c.tool}"`);
  }
  for (const r of releases) for (const lang of LANGS) assert.ok(r.blurb[lang]?.trim(), `0.${r.minor} blurb ${lang}`);
});

test('dates never go backwards, oldest release first', () => {
  const dates = [...releases].reverse().flatMap((r) => r.changes.map((c) => c.date));
  assert.deepEqual(dates, [...dates].sort());
});

test('earlier versions: newest first, unique, text in every language', () => {
  const v = earlier.map((e) => e.v);
  assert.equal(new Set(v).size, v.length);
  assert.deepEqual(v, v.map((_, i) => `0.${earlier.length - 1 - i}`));
  for (const e of earlier) {
    assert.match(e.date, ISO);
    for (const lang of LANGS) assert.ok(e.text[lang]?.trim(), `${e.v} ${lang}`);
  }
});

test('latest(): 0.MINOR.PATCH of the newest change', () => {
  const r = releases[0];
  const last = r.changes.at(-1);
  assert.deepEqual(latest(), { version: `0.${r.minor}.${last.patch}`, date: last.date });
  assert.match(latest().version, /^0\.\d+\.\d+$/);
});

test('isNew: a version the visitor has not opened yet', () => {
  assert.equal(isNew('0.17.7', '0.17.6', '2026-11-24', '2026-12-31'), true);
  assert.equal(isNew('0.17.7', '0.17.7', '2026-11-24', '2026-11-25'), false);
});

test('isNew: a first visit only sees it while the latest change is fresh (under 14 days)', () => {
  assert.equal(isNew('0.17.7', null, '2026-11-24', '2026-11-25'), true);
  assert.equal(isNew('0.17.7', null, '2026-11-24', '2026-12-07'), true);
  assert.equal(isNew('0.17.7', null, '2026-11-24', '2026-12-08'), false);
});
