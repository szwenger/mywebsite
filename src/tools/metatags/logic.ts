/** Pure parts of the meta tag generator: the <head> tags for a page, and the length hints for the search preview. */
export interface Spec {
  title: string; description: string; url: string; image: string; siteName: string;
  type: string; card: string; locale: string; themeColor: string; noindex: boolean;
}

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escText = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The tags to paste into <head>. Empty fields leave their tags out. */
export function metaTags(o: Spec): string {
  const title = o.title.trim(), description = o.description.trim(), url = o.url.trim(), image = o.image.trim();
  const siteName = o.siteName.trim(), locale = o.locale.trim(), color = o.themeColor.trim();
  const name = (n: string, v: string) => `<meta name="${n}" content="${esc(v)}">`;
  const prop = (n: string, v: string) => `<meta property="${n}" content="${esc(v)}">`;
  const out: string[] = [`<title>${escText(title)}</title>`];
  if (description) out.push(name('description', description));
  if (url) out.push(`<link rel="canonical" href="${esc(url)}">`);
  if (o.noindex) out.push(name('robots', 'noindex, nofollow'));
  if (color) out.push(name('theme-color', color));
  out.push('', prop('og:title', title));
  if (description) out.push(prop('og:description', description));
  if (url) out.push(prop('og:url', url));
  if (image) out.push(prop('og:image', image));
  out.push(prop('og:type', o.type || 'website'));
  if (siteName) out.push(prop('og:site_name', siteName));
  if (locale) out.push(prop('og:locale', locale));
  out.push('', name('twitter:card', image ? o.card || 'summary_large_image' : 'summary'), name('twitter:title', title));
  if (description) out.push(name('twitter:description', description));
  if (image) out.push(name('twitter:image', image));
  return out.join('\n');
}

/** Search results cut a title at about 60 characters and a description at about 160. */
export function lengthState(text: string, max: number): 'empty' | 'ok' | 'long' {
  const n = [...text.trim()].length;
  return n === 0 ? 'empty' : n > max ? 'long' : 'ok';
}

/** "galuin.com › tools › qr", the way a search result shows the address. */
export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return [u.host, ...u.pathname.split('/').filter(Boolean)].join(' › ');
  } catch { return url.trim(); }
}
