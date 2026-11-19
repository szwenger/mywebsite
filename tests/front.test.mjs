import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLead } from '../src/lib/front.ts';

const post = (slug, date, cover) => ({ slug, lang: 'en', title: slug, date: new Date(date), body: '', cover, kind: cover ? 'long' : 'note', shownIn: 'en', fallback: false, originalLang: 'en' });
const video = (id, published, isShort = false) => ({ id, title: id, url: `https://www.youtube.com/watch?v=${id}`, published, isShort });

test('a long post beats a newer video', () => {
  const lead = pickLead([post('n', '2025-03-01'), post('l', '2024-01-01', '/c.jpg')], [video('v', '2025-06-01T00:00:00Z')]);
  assert.equal(lead.type, 'post');
  assert.equal(lead.post.slug, 'l');
});

test('the newest long post wins among several', () => {
  const lead = pickLead([post('old', '2024-01-01', '/a.jpg'), post('new', '2024-05-01', '/b.jpg')], []);
  assert.equal(lead.post.slug, 'new');
});

test('no long post: the newest non-Short video leads', () => {
  const lead = pickLead([post('n', '2025-03-01')], [
    video('short', '2025-06-03T00:00:00Z', true),
    video('newer', '2025-06-02T00:00:00Z'),
    video('older', '2025-06-01T00:00:00Z'),
  ]);
  assert.equal(lead.type, 'video');
  assert.equal(lead.video.id, 'newer');
});

test('only Shorts: the newest Short leads', () => {
  const lead = pickLead([], [video('a', '2025-06-01T00:00:00Z', true), video('b', '2025-06-02T00:00:00Z', true)]);
  assert.equal(lead.video.id, 'b');
});

test('nothing to show: null', () => {
  assert.equal(pickLead([post('n', '2025-03-01')], []), null);
  assert.equal(pickLead([], []), null);
});
