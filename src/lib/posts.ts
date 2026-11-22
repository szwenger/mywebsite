import type { Lang } from '../i18n/ui';

export interface PostEntry { slug: string; lang: Lang; title: string; date: Date; updated?: Date; cover?: string; tags?: string[]; body: string }
export interface PostView extends PostEntry { kind: 'note' | 'long'; shownIn: Lang; fallback: boolean; originalLang: Lang }

const RANK: Record<Lang, number> = { en: 0, de: 1, ru: 2 };

/** A post with a cover image is a long post (card); without one it is a short note (shown in full). */
export function postKind(p: { cover?: string }): 'note' | 'long' {
  return p.cover ? 'long' : 'note';
}

/** One entry per slug for `lang`: its translation if there is one, else the original (earliest entry; ties en > de > ru). Newest first. */
export function postsFor(lang: Lang, all: PostEntry[]): PostView[] {
  const bySlug = new Map<string, PostEntry[]>();
  for (const p of all) bySlug.set(p.slug, [...(bySlug.get(p.slug) ?? []), p]);

  const out = [...bySlug.values()].map((group) => {
    const original = [...group].sort((a, b) => +a.date - +b.date || RANK[a.lang] - RANK[b.lang])[0];
    const shown = group.find((p) => p.lang === lang) ?? original;
    return { ...shown, kind: postKind(shown), shownIn: shown.lang, fallback: shown.lang !== lang, originalLang: original.lang };
  });
  return out.sort((a, b) => +b.date - +a.date || a.slug.localeCompare(b.slug));
}
