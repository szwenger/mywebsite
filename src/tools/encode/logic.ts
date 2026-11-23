/** Text encodings people paste around: Base64, URL, hex, HTML entities, and a JWT reader. Text is always UTF-8. */
export type Mode = 'base64' | 'base64url' | 'url' | 'hex' | 'html';

const utf8 = new TextEncoder();

function toText(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new Error('utf8'); }
}
function b64bytes(s: string): Uint8Array {
  const clean = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean) || clean.length % 4 === 1) throw new Error('base64');
  return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
}
const b64 = (bytes: Uint8Array): string => { let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(bin); };

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', euro: '€', hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»' };

export function encode(mode: Mode, s: string): string {
  switch (mode) {
    case 'base64': return b64(utf8.encode(s));
    case 'base64url': return b64(utf8.encode(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    case 'url': return encodeURIComponent(s);
    case 'hex': return [...utf8.encode(s)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    case 'html': return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

/** Throws Error('base64' | 'utf8' | 'url' | 'hex'): the page turns the code into a message in the visitor's language. */
export function decode(mode: Mode, s: string): string {
  switch (mode) {
    case 'base64': case 'base64url': return toText(b64bytes(s));
    case 'url': try { return decodeURIComponent(s); } catch { throw new Error('url'); }
    case 'hex': {
      const h = s.replace(/0x|\\x|\s+|,/gi, '');
      if (!/^[0-9a-f]*$/i.test(h) || h.length % 2) throw new Error('hex');
      return toText(Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16)));
    }
    case 'html': return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] !== '#') return NAMED[e.toLowerCase()] ?? m;
      const cp = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    });
  }
}

export interface Jwt { header: unknown; payload: unknown; signature: string; times: { claim: string; iso: string }[] }

/** Reads a JWT without checking the signature. Throws Error('jwt') for anything that is not three dot-separated parts of JSON. */
export function decodeJwt(token: string): Jwt {
  const parts = token.trim().replace(/^bearer\s+/i, '').split('.');
  if (parts.length < 2 || parts.length > 3) throw new Error('jwt');
  try {
    const [header, payload] = parts.slice(0, 2).map((p) => JSON.parse(toText(b64bytes(p))) as unknown);
    const times = ['exp', 'nbf', 'iat'].flatMap((claim) => {
      const v = (payload as Record<string, unknown>)?.[claim];
      return typeof v === 'number' && Number.isFinite(v) ? [{ claim, iso: new Date(v * 1000).toISOString() }] : [];
    });
    return { header, payload, signature: parts[2] ?? '', times };
  } catch { throw new Error('jwt'); }
}

/** The picture type of some bytes, from their first bytes (or the opening tag, for SVG). null when it is not a picture we know. */
export function sniffImage(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (ascii(0, 3) === 'GIF') return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 2) === 'BM') return 'image/bmp';
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)?<svg[\s>]/i.test(new TextDecoder().decode(b.subarray(0, 512)))) return 'image/svg+xml';
  return null;
}

export const dataUri = (bytes: Uint8Array, mime: string): string => `data:${mime};base64,${b64(bytes)}`;

/** A data URI (base64 or percent-encoded) or a bare Base64 string to the picture inside it; null when it is not a picture. */
export function parseDataUri(text: string): { mime: string; bytes: Uint8Array } | null {
  const t = text.trim();
  if (!t) return null;
  try {
    const m = /^data:([^;,]*)((?:;[^;,]*)*),([\s\S]*)$/i.exec(t);
    if (!m) { const bytes = b64bytes(t); const mime = sniffImage(bytes); return mime ? { mime, bytes } : null; }
    const bytes = /;base64/i.test(m[2]) ? b64bytes(m[3]) : new TextEncoder().encode(decodeURIComponent(m[3]));
    const mime = sniffImage(bytes);
    return mime && (!m[1] || m[1].startsWith('image/')) ? { mime: m[1] || mime, bytes } : null;
  } catch { return null; }
}
