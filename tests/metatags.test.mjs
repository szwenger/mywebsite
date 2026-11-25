import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metaTags, lengthState, displayUrl } from '../src/tools/metatags/logic.ts';

const base = { title: 'Galuin tools', description: 'Browser-only tools.', url: 'https://galuin.com/tools/', image: 'https://galuin.com/og.png', siteName: 'galuin.com', type: 'website', card: 'summary_large_image', locale: 'en_GB', themeColor: '', noindex: false };

test('a full spec gives title, description, canonical, Open Graph and Twitter tags', () => {
  const h = metaTags(base);
  for (const re of [
    /<title>Galuin tools<\/title>/,
    /<meta name="description" content="Browser-only tools\.">/,
    /<link rel="canonical" href="https:\/\/galuin\.com\/tools\/">/,
    /<meta property="og:title" content="Galuin tools">/,
    /<meta property="og:description" content="Browser-only tools\.">/,
    /<meta property="og:url" content="https:\/\/galuin\.com\/tools\/">/,
    /<meta property="og:image" content="https:\/\/galuin\.com\/og\.png">/,
    /<meta property="og:type" content="website">/,
    /<meta property="og:site_name" content="galuin\.com">/,
    /<meta property="og:locale" content="en_GB">/,
    /<meta name="twitter:card" content="summary_large_image">/,
    /<meta name="twitter:title" content="Galuin tools">/,
    /<meta name="twitter:image" content="https:\/\/galuin\.com\/og\.png">/,
  ]) assert.match(h, re);
});

test('empty fields leave their tags out, and noindex and theme colour are optional', () => {
  const h = metaTags({ ...base, description: '', image: '', url: '', siteName: '', locale: '' });
  assert.doesNotMatch(h, /description|og:image|twitter:image|canonical|og:url|site_name|og:locale/);
  assert.match(h, /<title>/);
  assert.doesNotMatch(h, /robots|theme-color/);
  const h2 = metaTags({ ...base, noindex: true, themeColor: '#112233' });
  assert.match(h2, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(h2, /<meta name="theme-color" content="#112233">/);
});

test('without an image the Twitter card falls back to a plain summary', () => {
  assert.match(metaTags({ ...base, image: '' }), /twitter:card" content="summary">/);
});

test('quotes, angle brackets and ampersands are escaped in attributes and the title', () => {
  const h = metaTags({ ...base, title: 'A "b" <c> & d', description: 'say "hi" & <go>' });
  assert.match(h, /<title>A "b" &lt;c&gt; &amp; d<\/title>/);
  assert.match(h, /content="A &quot;b&quot; &lt;c&gt; &amp; d"/);
  assert.match(h, /content="say &quot;hi&quot; &amp; &lt;go&gt;"/);
});

test('length states: good, long (will be cut) and empty', () => {
  assert.equal(lengthState('', 60), 'empty');
  assert.equal(lengthState('a'.repeat(60), 60), 'ok');
  assert.equal(lengthState('a'.repeat(61), 60), 'long');
  assert.equal(lengthState('😀'.repeat(60), 60), 'ok', 'counts characters, not UTF-16 units');
});

test('displayUrl shows host and path as a search result does', () => {
  assert.equal(displayUrl('https://galuin.com/tools/qr/'), 'galuin.com › tools › qr');
  assert.equal(displayUrl('https://galuin.com/'), 'galuin.com');
  assert.equal(displayUrl('not a url'), 'not a url');
  assert.equal(displayUrl(''), '');
});
