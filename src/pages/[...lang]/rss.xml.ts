import { statSync } from 'node:fs';
import { getCollection } from 'astro:content';
import { LANGS, t, type Lang } from '../../i18n/ui';
import { rssXml } from '../../lib/feed';
import { postsFor, splitId, type PostEntry } from '../../lib/posts';

export function getStaticPaths() {
  return LANGS.map((l) => ({ params: { lang: l === 'en' ? undefined : l } }));
}

export async function GET({ params }: { params: { lang?: string } }) {
  const lang = (params.lang ?? 'en') as Lang;
  const all: PostEntry[] = (await getCollection('posts')).map((e) => {
    const { slug, lang } = splitId(e.id);
    return { slug, lang, title: e.data.title, date: e.data.date, updated: e.data.updated, cover: e.data.cover, tags: e.data.tags, body: e.body ?? '' };
  });
  const xml = rssXml(lang, `Galuin · ${t(lang, 'navBlog')}`, t(lang, 'blogIntro'), postsFor(lang, all), (cover) => statSync(`public${cover}`).size);
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
