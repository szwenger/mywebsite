import { test } from 'node:test';
import assert from 'node:assert/strict';
import { path, localize, LANGS, t } from '../src/i18n/ui.ts';

test('path prefixes de and ru, leaves en at the root', () => {
  assert.equal(path('en', '/blog/'), '/blog/');
  assert.equal(path('de', '/blog/'), '/de/blog/');
  assert.equal(path('ru', '/'), '/ru/');
});

test('localize keeps the current page when switching language', () => {
  assert.equal(localize('/de/blog/nas/', 'ru'), '/ru/blog/nas/');
  assert.equal(localize('/ru/', 'en'), '/');
  assert.equal(localize('/tools/qr/', 'de'), '/de/tools/qr/');
  assert.equal(localize('/designs/', 'de'), '/de/designs/'); // "/de" only as a whole segment
});

test('every UI key exists in every language', () => {
  assert.deepEqual(LANGS, ['en', 'de', 'ru']);
  for (const l of LANGS) assert.ok(t(l, 'navBlog').length > 0);
});
