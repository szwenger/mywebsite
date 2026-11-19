// Runs before every build. Never fails the build: no network just means cache or an empty videos list.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { refreshVideos } from '../src/lib/youtube.mjs';

const CACHE = 'src/data/videos.json';
const { videos, source, error } = await refreshVideos({
  fetchFn: fetch,
  readCache: async () => JSON.parse(await readFile(CACHE, 'utf8')),
  writeCache: async (data) => { await mkdir('src/data', { recursive: true }); await writeFile(CACHE, JSON.stringify(data, null, 2)); },
  downloadThumb: async (id) => {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`thumb ${id}: HTTP ${res.status}`);
    await mkdir('public/thumbs', { recursive: true });
    await writeFile(`public/thumbs/${id}.jpg`, Buffer.from(await res.arrayBuffer()));
  },
});
console.log(`[videos] source: ${source}, ${videos.length} videos${error ? ` (${error})` : ''}`);
