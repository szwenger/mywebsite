export const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqcksKsQR1sMoFbrvdG209Q';
export const CHANNEL_URL = 'https://www.youtube.com/@Galuin';

const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

/** Atom feed text to videos, newest first as the feed lists them. Never throws. */
export function parseFeed(xml) {
  try {
    const out = [];
    for (const [, e] of String(xml ?? '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = e.match(/<title>([^<]*)<\/title>/)?.[1];
      const url = e.match(/<link rel="alternate" href="([^"]+)"/)?.[1];
      const published = e.match(/<published>([^<]+)<\/published>/)?.[1];
      if (id && title !== undefined && url && published) out.push({ id, title: decode(title), url: decode(url), published, isShort: url.includes('/shorts/') });
    }
    return out;
  } catch {
    return [];
  }
}

/** Live feed if it works and has videos (then cache it and fetch thumbnails), else the cache, else nothing. */
export async function refreshVideos({ fetchFn, readCache, writeCache, downloadThumb }) {
  try {
    const res = await fetchFn(FEED_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const videos = parseFeed(await res.text());
    if (!videos.length) throw new Error('feed has no videos');
    await Promise.allSettled(videos.map((v) => downloadThumb(v.id)));
    await writeCache({ updated: new Date().toISOString(), videos });
    return { videos, source: 'live' };
  } catch (err) {
    const cached = await readCache().catch(() => null);
    if (cached?.videos?.length) return { videos: cached.videos, source: 'cache', error: String(err.message ?? err) };
    return { videos: [], source: 'none', error: String(err.message ?? err) };
  }
}
