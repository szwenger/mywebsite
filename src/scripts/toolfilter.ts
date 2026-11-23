/** Matching for the tool search: case and accents do not matter, every word typed must appear somewhere in the tool's text. */
export const norm = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function matches(haystack: string, query: string): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const hay = norm(haystack);
  return words.every((w) => hay.includes(w));
}

const ALIAS: Record<string, string> = { jpeg: 'jpg', heif: 'heic', tiff: 'tif' };
/** A file extension in its one spelling: lowercase, no dot, jpeg is jpg, heif is heic, tiff is tif. */
export const extKey = (s: string): string => { const k = norm(s).replace(/^\./, ''); return ALIAS[k] ?? k; };

/** "heic to jpg", "pdf2jpeg" and "px → rem" mean a conversion; ordinary words do not. */
export function parseConversion(query: string): { from: string; to: string } | null {
  const q = norm(query).trim();
  const m = q.match(/^(.+?)\s*(?:->|→|=>)\s*(.+)$/) ?? q.match(/^(\S+)\s+to\s+(\S+)$/) ?? q.match(/^([a-z][a-z0-9]*?)2([a-z][a-z0-9]*)$/);
  return m ? { from: extKey(m[1].trim()), to: extKey(m[2].trim()) } : null;
}

export interface Findable { hay: string; accepts: string[]; produces: string[] }

/** The tool search: a conversion matches the formats a tool takes and makes (its words, for a tool that declares no formats); otherwise every word must appear in the text or name a format the tool takes or makes. */
export function finds(card: Findable, query: string): boolean {
  const conv = parseConversion(query);
  if (conv) return card.accepts.length + card.produces.length ? card.accepts.includes(conv.from) && card.produces.includes(conv.to) : matches(card.hay, `${conv.from} ${conv.to}`);
  const formats = new Set([...card.accepts, ...card.produces]);
  return norm(query).split(/\s+/).filter(Boolean).every((w) => matches(card.hay, w) || formats.has(extKey(w)));
}
