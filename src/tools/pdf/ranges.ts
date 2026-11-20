export type RangeResult = { pages: number[] } | { error: 'empty' | 'syntax' | 'out-of-range' };

/** Parses "1-3, 5" into 0-based page indexes. A reversed range such as "3-1" runs downwards; duplicates are kept. */
export function parseRanges(input: string, pageCount: number): RangeResult {
  if (!input.trim()) return { error: 'empty' };
  const pages: number[] = [];
  for (const part of input.split(',')) {
    const m = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
    if (!m) return { error: 'syntax' };
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    if (from < 1 || to < 1 || from > pageCount || to > pageCount) return { error: 'out-of-range' };
    const step = to >= from ? 1 : -1;
    for (let p = from; p !== to + step; p += step) pages.push(p - 1);
  }
  return { pages };
}
