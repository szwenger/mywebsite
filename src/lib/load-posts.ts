import { getCollection, render } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { postsFor, type PostEntry, type PostView } from './posts';

/** Posts as shown in `lang` (translation or fallback), each with its rendered Markdown. */
export async function loadPosts(lang: Lang) {
  const entries = await getCollection('posts');
  const byId = new Map(entries.map((e) => [e.id, e]));
  const all: PostEntry[] = entries.map((e) => {
    const [slug, l] = e.id.split('/');
    return { slug, lang: l as Lang, title: e.data.title, date: e.data.date, updated: e.data.updated, cover: e.data.cover, tags: e.data.tags, body: e.body ?? '' };
  });
  return Promise.all(postsFor(lang, all).map(async (post: PostView) => {
    const { Content, headings } = await render(byId.get(`${post.slug}/${post.shownIn}`)!);
    return { post, Content, headings };
  }));
}

export const dateLabel = (d: Date, lang: Lang) =>
  d.toLocaleDateString({ en: 'en-GB', de: 'de-DE', ru: 'ru-RU' }[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
