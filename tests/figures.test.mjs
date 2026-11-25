import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml } from 'satteri';
import { figuresPlugin, makeFiguresPlugin } from '../src/lib/figures.mjs';

const md = (src) => markdownToHtml(src, { hastPlugins: [figuresPlugin] }).html.trim();

test('figures: a paragraph holding only an image becomes a figure with a link to the full image', () => {
  const html = md('![A chart](/posts/a.png)');
  assert.match(html, /^<figure class="fig"><a [^>]*class="zoom"[^>]*><img [^>]*><\/a><\/figure>$/);
  assert.match(html, /href="\/posts\/a\.png"/);
  assert.match(html, /alt="A chart"/, 'alt text is kept');
  assert.match(html, /loading="lazy"/);
  assert.ok(!html.includes('figcaption'), 'no caption');
});

test('figures: an italic-only paragraph right after the image becomes its caption, formatting kept', () => {
  const html = md('![A](/a.png)\n\n*Speed, **higher** is better, see `-fa`.*\n\nNext.');
  assert.match(html, /<figcaption>Speed, <strong>higher<\/strong> is better, see <code>-fa<\/code>\.<\/figcaption><\/figure>/);
  assert.ok(!html.includes('<em>'), 'the caption paragraph is gone');
  assert.match(html, /<p>Next\.<\/p>$/);
});

test('figures: image and italic line in the same paragraph also make a caption', () => {
  const html = md('![A](/a.png)\n*Caption*');
  assert.match(html, /<figure class="fig">.*<figcaption>Caption<\/figcaption><\/figure>$/s);
});

test('figures: ordinary text, inline images and italic text elsewhere are left alone', () => {
  const html = md('See ![x](/a.png) here.\n\n*just italic*\n\n![y](/b.png) and a sentence.');
  assert.ok(!html.includes('<figure'), html);
  assert.equal((html.match(/<p>/g) ?? []).length, 3);
});

test('figures: a non-italic paragraph after an image is not swallowed as a caption', () => {
  const html = md('![A](/a.png)\n\nNormal paragraph.');
  assert.ok(!html.includes('figcaption'));
  assert.match(html, /<p>Normal paragraph\.<\/p>$/);
});

test('figures: two images in a row make two figures', () => {
  const html = md('![A](/a.png)\n\n![B](/b.png)\n\n*Only B has a caption.*');
  assert.equal((html.match(/<figure/g) ?? []).length, 2);
  assert.equal((html.match(/<figcaption>/g) ?? []).length, 1);
  assert.ok(html.indexOf('/b.png') < html.indexOf('<figcaption>'));
});

// Theme variants: name.light.ext + name.dark.ext next to name.ext make a figure that shows the one matching the theme.
const themed = (have) => (src) => markdownToHtml(src, { hastPlugins: [makeFiguresPlugin((p) => have.includes(p))] }).html.trim();

test('figures: when both .light and .dark files exist the figure holds both images', () => {
  const html = themed(['/posts/a.light.png', '/posts/a.dark.png'])('![A chart](/posts/a.png)');
  assert.match(html, /<a [^>]*class="zoom themed"[^>]*>/);
  assert.match(html, /<img [^>]*class="tv-light"[^>]*src="\/posts\/a\.light\.png"|<img [^>]*src="\/posts\/a\.light\.png"[^>]*class="tv-light"/);
  assert.match(html, /<img [^>]*class="tv-dark"[^>]*src="\/posts\/a\.dark\.png"|<img [^>]*src="\/posts\/a\.dark\.png"[^>]*class="tv-dark"/);
  assert.equal((html.match(/alt="A chart"/g) ?? []).length, 2, 'both keep the alt text');
  assert.equal((html.match(/loading="lazy"/g) ?? []).length, 2);
  assert.match(html, /href="\/posts\/a\.dark\.png"/, 'no-JS link goes to the default (dark) image');
  assert.match(html, /data-light-href="\/posts\/a\.light\.png"/);
});

test('figures: only one of the two variants existing leaves the figure as it was', () => {
  for (const have of [['/posts/a.light.png'], ['/posts/a.dark.png'], []]) {
    const html = themed(have)('![A](/posts/a.png)');
    assert.match(html, /^<figure class="fig"><a [^>]*class="zoom"[^>]*><img [^>]*src="\/posts\/a\.png"[^>]*><\/a><\/figure>$/);
  }
});

test('figures: a caption still works on a themed figure, and remote images are never themed', () => {
  const t = themed(['/posts/a.light.png', '/posts/a.dark.png', 'https://x.test/a.light.png', 'https://x.test/a.dark.png']);
  assert.match(t('![A](/posts/a.png)\n\n*Cap*'), /<figcaption>Cap<\/figcaption>/);
  assert.ok(!t('![A](https://x.test/a.png)').includes('themed'));
});

test('themedFiles gives the light and dark file only when both exist', async () => {
  const { themedFiles } = await import('../src/lib/figures.mjs');
  const both = new Set(['/posts/a-cover.light.webp', '/posts/a-cover.dark.webp']);
  assert.deepEqual(themedFiles('/posts/a-cover.webp', (p) => both.has(p)), { light: '/posts/a-cover.light.webp', dark: '/posts/a-cover.dark.webp' });
  assert.equal(themedFiles('/posts/a-cover.webp', (p) => p.includes('light')), null);
  assert.equal(themedFiles('https://x.test/a.webp', () => true), null);
  assert.equal(themedFiles(undefined, () => true), null);
});
