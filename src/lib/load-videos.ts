import { existsSync, readFileSync } from 'node:fs';
import type { Lang } from '../i18n/ui';

export interface Video { id: string; title: string; url: string; published: string; isShort: boolean; thumb?: string }

/** Videos from the build-time cache (written by scripts/fetch-videos.mjs). A missing thumbnail file means no image, never a broken one. */
export function loadVideos(): Video[] {
  try {
    const { videos } = JSON.parse(readFileSync('src/data/videos.json', 'utf8')) as { videos: Video[] };
    return videos.map((v) => ({ ...v, thumb: existsSync(`public/thumbs/${v.id}.jpg`) ? `/thumbs/${v.id}.jpg` : undefined }));
  } catch {
    return [];
  }
}

export const videoDate = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString({ en: 'en-GB', de: 'de-DE', ru: 'ru-RU' }[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
