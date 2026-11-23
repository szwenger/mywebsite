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
  assert.ok(x.match(/<description>([^<]*)<\/description>/)[1].length <= 301);
});
