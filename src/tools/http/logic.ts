import { matches } from '../../scripts/toolfilter.ts';

/** The status codes of the HTTP standards (RFC 9110 and companions) plus the common WebDAV ones. Names are the standard English ones in every language; descriptions live in src/i18n/tools/http.ts as c<code>. */
const NAMES: Record<number, string> = {
  100: 'Continue', 101: 'Switching Protocols', 102: 'Processing', 103: 'Early Hints',
  200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Information', 204: 'No Content', 205: 'Reset Content', 206: 'Partial Content', 207: 'Multi-Status', 208: 'Already Reported', 226: 'IM Used',
  300: 'Multiple Choices', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable', 407: 'Proxy Authentication Required', 408: 'Request Timeout', 409: 'Conflict', 410: 'Gone',
  411: 'Length Required', 412: 'Precondition Failed', 413: 'Content Too Large', 414: 'URI Too Long', 415: 'Unsupported Media Type', 416: 'Range Not Satisfiable', 417: 'Expectation Failed', 418: "I'm a teapot", 421: 'Misdirected Request', 422: 'Unprocessable Content',
  423: 'Locked', 424: 'Failed Dependency', 425: 'Too Early', 426: 'Upgrade Required', 428: 'Precondition Required', 429: 'Too Many Requests', 431: 'Request Header Fields Too Large', 451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout', 505: 'HTTP Version Not Supported', 506: 'Variant Also Negotiates', 507: 'Insufficient Storage', 508: 'Loop Detected', 510: 'Not Extended', 511: 'Network Authentication Required',
};
export const CODES = Object.entries(NAMES).map(([code, name]) => ({ code: Number(code), name })); // integer keys come out ascending

export const classOf = (code: number): number => Math.floor(code / 100);

/** "404", "50" (a prefix) and "4xx" or "30x" match by number; anything else must appear, word by word, in the name and description. */
export function statusMatches(code: number, text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  const num = q.match(/^(\d{1,3})(x*)$/);
  if (num && num[1].length + num[2].length <= 3) return String(code).startsWith(num[1]);
  return matches(text, q);
}
