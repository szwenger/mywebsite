/** Matching for the tool search: case and accents do not matter, every word typed must appear somewhere in the tool's text. */
export const norm = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function matches(haystack: string, query: string): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const hay = norm(haystack);
  return words.every((w) => hay.includes(w));
}
