/** Runs a JavaScript regular expression over a text. Used from a worker, so a runaway pattern cannot freeze the page. */
export interface Hit { index: number; text: string; groups: (string | undefined)[]; named: Record<string, string> }
export interface RegexResult { error?: string; hits: Hit[]; truncated: boolean; replaced?: string }

export const LIMIT = 2000;

export function runRegex(pattern: string, flags: string, text: string, replacement?: string): RegexResult {
  let re: RegExp;
  try { re = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`); } catch (e) { return { error: (e as Error).message, hits: [], truncated: false }; }
  const hits: Hit[] = [];
  let truncated = false;
  for (const m of text.matchAll(re)) {
    if (hits.length >= LIMIT) { truncated = true; break; }
    hits.push({ index: m.index!, text: m[0], groups: m.slice(1), named: { ...m.groups } });
  }
  const out: RegexResult = { hits, truncated };
  if (replacement != null) out.replaced = text.replace(new RegExp(pattern, flags), replacement);
  return out;
}
