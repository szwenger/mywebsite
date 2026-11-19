import type { PostView } from './posts';
import type { Video } from './load-videos';

export type Lead = { type: 'post'; post: PostView } | { type: 'video'; video: Video };

const newest = <T>(xs: T[], at: (x: T) => number): T | undefined =>
  xs.reduce<T | undefined>((best, x) => (best === undefined || at(x) > at(best) ? x : best), undefined);

/** The front page's lead story: newest long post; else newest regular video; else newest Short; else nothing. */
export function pickLead(posts: PostView[], videos: Video[]): Lead | null {
  const post = newest(posts.filter((p) => p.kind === 'long'), (p) => +p.date);
  if (post) return { type: 'post', post };
  const at = (v: Video) => Date.parse(v.published);
  const video = newest(videos.filter((v) => !v.isShort), at) ?? newest(videos, at);
  return video ? { type: 'video', video } : null;
}
