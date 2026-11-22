import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml } from 'satteri';
import { figuresPlugin } from '../src/lib/figures.mjs';

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
