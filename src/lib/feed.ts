import type { Lang } from '../i18n/ui';
import { plainText } from './list.ts';
import type { PostView } from './posts';

const SITE = 'https://galuin.com';
const path = (lang: Lang, p: string) => (lang === 'en' ? p : `/${lang}${p}`);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MAX = 300;
const MIME: Record<string, string> = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', avif: 'image/avif' };

/** Whole text when short (notes); else the first paragraph (no headings or images), cut at a word with an ellipsis. */
function excerpt(body: string): string {
  const all = plainText(body, Infinity);
  if (all.length <= MAX) return all;
  const first = body.split(/\n\s*\n/).map((b) => b.trim()).find((b) => b && !/^(#|!\[)/.test(b));
  const text = plainText(first ?? body, Infinity);
  return text.length <= MAX ? text : text.slice(0, MAX).replace(/\s*\S*$/, '') + '…';
}

const enclosure = (p: PostView, size: (cover: string) => number) =>
  p.cover ? `<enclosure url="${SITE}${esc(p.cover)}" length="${size(p.cover)}" type="${MIME[p.cover.split('.').pop()!.toLowerCase()] ?? 'image/jpeg'}"/>` : '';

/** RSS 2.0 feed of the blog in `lang` (posts already newest first, see postsFor). */
export function rssXml(lang: Lang, title: string, description: string, posts: PostView[], coverSize: (cover: string) => number = () => 0): string {
  const items = posts.map((p) => {
    const url = SITE + path(lang, `/blog/${p.slug}/`);
    return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${p.date.toUTCString()}</pubDate><description>${esc(excerpt(p.body))}</description>${enclosure(p, coverSize)}${(p.tags ?? []).map((g) => `<category>${esc(g)}</category>`).join('')}</item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(title)}</title><link>${SITE}${path(lang, '/blog/')}</link><description>${esc(description)}</description><language>${lang}</language><atom:link href="${SITE}${path(lang, '/rss.xml')}" rel="self" type="application/rss+xml"/>
${items.join('\n')}
</channel></rss>
`;
}
