import type { Lang } from '../i18n/ui';
import { plainText } from './list.ts';
import type { PostView } from './posts';

const SITE = 'https://galuin.com';
const path = (lang: Lang, p: string) => (lang === 'en' ? p : `/${lang}${p}`);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RSS 2.0 feed of the blog in `lang` (posts already newest first, see postsFor). */
export function rssXml(lang: Lang, title: string, description: string, posts: PostView[]): string {
  const items = posts.map((p) => {
    const url = SITE + path(lang, `/blog/${p.slug}/`);
    return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${p.date.toUTCString()}</pubDate><description>${esc(plainText(p.body, 300))}</description></item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(title)}</title><link>${SITE}${path(lang, '/blog/')}</link><description>${esc(description)}</description><language>${lang}</language><atom:link href="${SITE}${path(lang, '/rss.xml')}" rel="self" type="application/rss+xml"/>
${items.join('\n')}
</channel></rss>
`;
}
