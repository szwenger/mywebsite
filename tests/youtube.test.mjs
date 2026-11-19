import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFeed, refreshVideos } from '../src/lib/youtube.mjs';

const xml = readFileSync('tests/fixtures/feed.xml', 'utf8');
const two = [{ id: 'a', title: 'A', url: 'u', published: '2024-01-01T00:00:00+00:00', isShort: false }, { id: 'b', title: 'B', url: 'u', published: '2024-01-02T00:00:00+00:00', isShort: true }];
const spy = (impl = async () => {}) => { const f = async (...a) => { f.calls.push(a); return impl(...a); }; f.calls = []; return f; };

test('the fixture parses to 3 videos with the Short flagged', () => {
  const v = parseFeed(xml);
  assert.equal(v.length, 3);
  assert.deepEqual(v.map((x) => x.isShort), [false, true, false]);
  assert.equal(v[0].id, 'Fy9UYGzPVG8');
  assert.equal(v[0].url, 'https://www.youtube.com/watch?v=Fy9UYGzPVG8');
  assert.equal(v[0].published, '2023-11-17T13:00:31+00:00');
});

test('entities in titles are decoded', () => {
  assert.equal(parseFeed(xml)[2].title, 'He said "hi" & left');
});

test('malformed or empty input gives [] and never throws', () => {
  assert.deepEqual(parseFeed('<html>nope'), []);
  assert.deepEqual(parseFeed(''), []);
  assert.deepEqual(parseFeed(undefined), []);
});

test('network failure returns the cache and does not rewrite it', async () => {
  const writeCache = spy();
  const r = await refreshVideos({ fetchFn: async () => { throw new Error('offline'); }, readCache: async () => ({ updated: 'x', videos: two }), writeCache, downloadThumb: spy() });
  assert.equal(r.source, 'cache');
  assert.deepEqual(r.videos, two);
  assert.equal(writeCache.calls.length, 0);
});

test('network failure with no cache gives none', async () => {
  const r = await refreshVideos({ fetchFn: async () => { throw new Error('offline'); }, readCache: async () => null, writeCache: spy(), downloadThumb: spy() });
  assert.deepEqual(r.videos, []);
  assert.equal(r.source, 'none');
});

test('a feed with 0 videos is treated as a failure and keeps the cache', async () => {
  const r = await refreshVideos({ fetchFn: async () => ({ ok: true, text: async () => '<feed></feed>' }), readCache: async () => ({ videos: two }), writeCache: spy(), downloadThumb: spy() });
  assert.equal(r.source, 'cache');
});

test('a non-OK response is a failure', async () => {
  const r = await refreshVideos({ fetchFn: async () => ({ ok: false, status: 500, text: async () => xml }), readCache: async () => null, writeCache: spy(), downloadThumb: spy() });
  assert.equal(r.source, 'none');
});

test('a good feed is live, cached once, and every thumbnail is downloaded', async () => {
  const writeCache = spy(); const downloadThumb = spy();
  const r = await refreshVideos({ fetchFn: async () => ({ ok: true, text: async () => xml }), readCache: async () => null, writeCache, downloadThumb });
  assert.equal(r.source, 'live');
  assert.equal(r.videos.length, 3);
  assert.equal(writeCache.calls.length, 1);
  assert.equal(downloadThumb.calls.length, 3);
});

test('a failing thumbnail does not lose the feed', async () => {
  const writeCache = spy();
  const r = await refreshVideos({ fetchFn: async () => ({ ok: true, text: async () => xml }), readCache: async () => null, writeCache, downloadThumb: async () => { throw new Error('404'); } });
  assert.equal(r.source, 'live');
  assert.equal(writeCache.calls.length, 1);
});
