// Pure helpers for the paginated and searchable lists (blog, videos). The DOM side lives in src/scripts/list.ts.

export const pageCount = (total: number, per: number): number => Math.max(1, Math.ceil(total / per));

export const clampPage = (page: number, count: number): number =>
  Number.isFinite(page) ? Math.min(count, Math.max(1, Math.floor(page))) : 1;

/** Half-open index range [start, end) of a 1-based page. */
export const pageRange = (total: number, per: number, page: number): [number, number] =>
  [Math.min(total, (page - 1) * per), Math.min(total, page * per)];

/** Page buttons to show: 1, the neighbours of the current page and the last one, with '…' for gaps. Nothing for one page. */
export function pageList(count: number, page: number): (number | '…')[] {
  if (count <= 1) return [];
  const keep = [...new Set([1, count, page - 1, page, page + 1].filter((n) => n >= 1 && n <= count))].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  keep.forEach((n, i) => {
    const prev = keep[i - 1];
    if (prev !== undefined && n - prev === 2) out.push(n - 1);
    else if (prev !== undefined && n - prev > 2) out.push('…');
    out.push(n);
  });
  return out;
}

/** Lower case, accents removed, spaces collapsed: what both the search text and the query are reduced to. */
export const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** `haystack` must already be normalized. Every word of the query has to occur in it; an empty query matches everything. */
export const matches = (haystack: string, query: string): boolean =>
  normalize(query).split(' ').filter(Boolean).every((word) => haystack.includes(word));

/** Markdown reduced to searchable words: no link targets, images or markup, cut to `max` characters. */
export function plainText(md: string, max: number): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-+]\s/gm, ' ')
    .replace(/[*_`#>~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
