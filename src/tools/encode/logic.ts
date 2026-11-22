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
