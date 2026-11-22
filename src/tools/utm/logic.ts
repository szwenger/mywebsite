export const KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;
export type UtmParams = Partial<Record<(typeof KEYS)[number], string>>;

/** Adds utm_* parameters to a link. Existing utm_ values are replaced, other parameters and the #fragment stay. Empty fields are left out.
 *  Throws Error('url') for anything that is not an http(s) link (a missing scheme is filled in as https), Error('required') without source. */
export function buildUtm(link: string, p: UtmParams, lower = false): string {
  const raw = link.trim();
  let u: URL;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { throw new Error('url'); }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') && u.hostname !== 'localhost') throw new Error('url');
  const val = (k: (typeof KEYS)[number]) => { const v = (p[k] ?? '').trim(); return lower ? v.toLowerCase() : v; };
  if (!val('source')) throw new Error('required');
  for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
  for (const k of KEYS) if (val(k)) u.searchParams.set(`utm_${k}`, val(k));
  return u.toString();
}
