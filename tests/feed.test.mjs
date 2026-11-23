import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rssXml } from '../src/lib/feed.ts';

const post = (extra = {}) => ({ slug: 'a', lang: 'en', shownIn: 'en', title: 'Fish & <chips>', date: new Date('2026-11-22T21:25:00Z'), body: 'Hello **world** ![i](x.png) and [a link](http://x).', ...extra });

test('rssXml: channel, item link, date and escaping', () => {
  const x = rssXml('de', 'Blog', 'Intro', [post()]);
  assert.match(x, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(x, /<link>https:\/\/galuin\.com\/de\/blog\/<\/link>/);
  assert.match(x, /<atom:link href="https:\/\/galuin\.com\/de\/rss\.xml" rel="self"/);
  assert.match(x, /<item><title>Fish &amp; &lt;chips&gt;<\/title><link>https:\/\/galuin\.com\/de\/blog\/a\/<\/link><guid isPermaLink="true">https:\/\/galuin\.com\/de\/blog\/a\/<\/guid>/);
  assert.match(x, /<pubDate>Sun, 22 Nov 2026 21:25:00 GMT<\/pubDate>/);
  assert.match(x, /<description>Hello world and a link\.<\/description>/);
});

test('rssXml: English has no prefix, long text is cut', () => {
  const x = rssXml('en', 'Blog', 'Intro', [post({ body: 'word '.repeat(200) })]);
  assert.match(x, /<link>https:\/\/galuin\.com\/blog\/a\/<\/link>/);
  assert.ok(x.match(/<item>.*<description>([^<]*)<\/description>/s)[1].length <= 301);
});

const long = (extra = {}) => post({ body: `First paragraph, short.\n\n![i](x.png)\n\n## Heading\n\n${'word '.repeat(100)}`, ...extra });

test('rssXml: long post shows its first paragraph only, headings do not leak', () => {
  const d = rssXml('en', 'B', 'I', [long()]).match(/<item>.*<description>([^<]*)<\/description>/s)[1];
  assert.equal(d, 'First paragraph, short.');
});

test('rssXml: an over-long first paragraph is cut at a word with an ellipsis', () => {
  const d = rssXml('en', 'B', 'I', [post({ body: 'abcdefghij '.repeat(40) })]).match(/<item>.*<description>([^<]*)<\/description>/s)[1];
  assert.ok(d.endsWith('abcdefghij…'), d.slice(-20));
  assert.ok(d.length <= 301);
});

test('rssXml: short notes arrive whole, in every paragraph', () => {
  const d = rssXml('en', 'B', 'I', [post({ body: 'One.\n\nTwo.' })]).match(/<item>.*<description>([^<]*)<\/description>/s)[1];
  assert.equal(d, 'One. Two.');
});

test('rssXml: cover becomes an enclosure, tags become categories', () => {
  const x = rssXml('de', 'B', 'I', [post({ cover: '/posts/a-cover.webp', tags: ['llm', 'a&b'] })], () => 1234);
  assert.match(x, /<enclosure url="https:\/\/galuin\.com\/posts\/a-cover\.webp" length="1234" type="image\/webp"\/>/);
  assert.match(x, /<category>llm<\/category><category>a&amp;b<\/category>/);
  assert.ok(!rssXml('de', 'B', 'I', [post()]).includes('<enclosure'));
});
