export type Delim = ',' | ';' | '\t' | '|';

/** Picks the delimiter that splits the first line into the most cells, ignoring quoted text. */
export function detectDelim(text: string): Delim {
  const first = text.split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, '');
  const count = (d: string) => first.split(d).length;
  return ([',', ';', '\t', '|'] as Delim[]).reduce((best, d) => (count(d) > count(best) ? d : best), ',');
}

/** RFC 4180 reader: quoted cells may hold the delimiter, line breaks and "" for a quote. Throws Error('quote') on an unclosed quote. */
export function parseCsv(text: string, delim: Delim): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; // byte order mark from Excel
  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('quote');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const inferValue = (v: string): unknown => {
  if (v === '') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  // Only plain decimals; "007" and numbers beyond 2^53 stay text so nothing is silently changed.
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v) && Number.isSafeInteger(Math.trunc(Number(v)))) return Number(v);
  return v;
};

/** Rows to objects keyed by the first row (or col1, col2… without a header). Short rows give null, repeated names get _2, _3. */
export function csvToJson(rows: string[][], header: boolean, infer: boolean): Record<string, unknown>[] {
  if (!rows.length) return [];
  const width = Math.max(...rows.map((r) => r.length));
  const names: string[] = [];
  for (let c = 0; c < width; c++) {
    let n = header ? (rows[0][c] ?? '').trim() || `col${c + 1}` : `col${c + 1}`;
    const base = n;
    for (let k = 2; names.includes(n); k++) n = `${base}_${k}`;
    names.push(n);
  }
  return rows.slice(header ? 1 : 0).map((r) => Object.fromEntries(names.map((n, c) => [n, c < r.length ? (infer ? inferValue(r[c]) : r[c]) : null])));
}

/** Nested objects become dotted keys (a.b), arrays and anything else are written as JSON text. */
function flatten(v: unknown, prefix: string, out: Record<string, unknown>): void {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const entries = Object.entries(v);
    if (entries.length) { for (const [k, x] of entries) flatten(x, prefix ? `${prefix}.${k}` : k, out); return; }
  }
  out[prefix] = v;
}

const cellText = (v: unknown): string => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const quote = (s: string, d: string) => (s.includes(d) || /["\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** A JSON array of objects (or a single object) to CSV. Columns are the union of all keys in first-seen order. Throws Error('shape') for other input. */
export function jsonToCsv(data: unknown, delim: Delim, eol = '\r\n'): string {
  const list = Array.isArray(data) ? data : data && typeof data === 'object' ? [data] : null;
  if (!list || !list.length || list.some((x) => !x || typeof x !== 'object' || Array.isArray(x))) throw new Error('shape');
  const flat = list.map((o) => { const out: Record<string, unknown> = {}; flatten(o, '', out); return out; });
  const cols = [...new Set(flat.flatMap((o) => Object.keys(o)))];
  return [cols, ...flat.map((o) => cols.map((c) => cellText(o[c])))].map((r) => r.map((c) => quote(c, delim)).join(delim)).join(eol);
}
