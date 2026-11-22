/** Read and strip metadata from JPEG, PNG and PDF without re-encoding: bytes of the picture are never touched. */
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';

export interface Entry { key: string; value: string }
const dec = (b: Uint8Array) => new TextDecoder('latin1').decode(b);
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

// ---- EXIF (TIFF) ----
const TAGS: Record<number, string> = { 0x010f: 'Make', 0x0110: 'Model', 0x0131: 'Software', 0x0132: 'Date', 0x013b: 'Artist', 0x8298: 'Copyright', 0x0112: 'Orientation', 0x9003: 'Date taken', 0xa434: 'Lens' };

function readTiff(d: Uint8Array, base: number): Entry[] {
  const v = new DataView(d.buffer, d.byteOffset + base, d.length - base);
  if (v.byteLength < 8) return [];
  const le = v.getUint16(0) === 0x4949;
  const u16 = (o: number) => v.getUint16(o, le), u32 = (o: number) => v.getUint32(o, le);
  const out: Entry[] = [];
  const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
  const val = (e: number, type: number, count: number): number => (sizes[type] ?? 1) * count > 4 ? u32(e + 8) : e + 8;
  const ascii = (e: number, count: number) => dec(new Uint8Array(v.buffer, v.byteOffset + val(e, 2, count), count)).replace(/\0.*$/s, '').trim();
  const rationals = (e: number, n: number) => Array.from({ length: n }, (_, i) => { const o = val(e, 5, n) + i * 8; return u32(o + 4) ? u32(o) / u32(o + 4) : 0; });
  function ifd(at: number, kind: 'main' | 'exif' | 'gps', depth = 0): void {
    if (at + 2 > v.byteLength || depth > 3) return;
    const n = u16(at);
    const gps: Record<number, string> = {};
    const gpsNum: Record<number, number[]> = {};
    for (let i = 0; i < n; i++) {
      const e = at + 2 + i * 12;
      if (e + 12 > v.byteLength) break;
      const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
      if (kind === 'gps') {
        if (type === 2) gps[tag] = ascii(e, count);
        else if (type === 5 && count >= 1 && count <= 3) gpsNum[tag] = rationals(e, count);
        continue;
      }
      if (tag === 0x8769) ifd(u32(e + 8), 'exif', depth + 1);
      else if (tag === 0x8825) ifd(u32(e + 8), 'gps', depth + 1);
      else if (tag === 0x0112 && type === 3) out.push({ key: 'Orientation', value: String(u16(e + 8)) });
      else if (TAGS[tag] && type === 2) { const t = ascii(e, count); if (t) out.push({ key: TAGS[tag], value: t }); }
    }
    if (kind === 'gps' && gpsNum[2] && gpsNum[4]) {
      const deg = (r: number[]) => (r[0] ?? 0) + (r[1] ?? 0) / 60 + (r[2] ?? 0) / 3600;
      const lat = deg(gpsNum[2]) * (gps[1] === 'S' ? -1 : 1), lon = deg(gpsNum[4]) * (gps[3] === 'W' ? -1 : 1);
      out.push({ key: 'GPS', value: `${lat.toFixed(6)}, ${lon.toFixed(6)}` });
    }
  }
  ifd(u32(4), 'main');
  return out;
}

// ---- JPEG ----
interface Seg { marker: number; start: number; end: number } // end is exclusive; start points at 0xFF
function* jpegSegments(d: Uint8Array): Generator<Seg> {
  if (d[0] !== 0xff || d[1] !== 0xd8) throw new Error('not a JPEG');
  let i = 2;
  while (i + 4 <= d.length && d[i] === 0xff) {
    const marker = d[i + 1];
    if (marker === 0xda) { yield { marker, start: i, end: d.length }; return; }
    if (marker === 0xff) { i++; continue; }
    const len = (d[i + 2] << 8) | d[i + 3];
    yield { marker, start: i, end: i + 2 + len };
    i += 2 + len;
  }
}

export function readJpeg(d: Uint8Array): Entry[] {
  const out: Entry[] = [];
  for (const s of jpegSegments(d)) {
    const body = d.subarray(s.start + 4, s.end);
    if (s.marker === 0xe1 && dec(body.subarray(0, 6)) === 'Exif\0\0') out.push(...readTiff(d, s.start + 10));
    else if (s.marker === 0xe1 && dec(body.subarray(0, 28)).startsWith('http://ns.adobe.com/xap')) out.push({ key: 'XMP', value: 'present' });
    else if (s.marker === 0xed) out.push({ key: 'IPTC / Photoshop', value: 'present' });
    else if (s.marker === 0xfe) out.push({ key: 'Comment', value: dec(body).slice(0, 200) });
  }
  return out;
}

/** An EXIF block holding only the orientation, so a rotated photo stays upright once the rest is gone. */
function orientationOnly(o: number): Uint8Array {
  const b = new Uint8Array([0xff, 0xe1, 0, 34, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, o, 0, 0, 0, 0, 0, 0, 0]);
  return b;
}

export function stripJpeg(d: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [d.subarray(0, 2)];
  let orientation = 1;
  for (const s of jpegSegments(d)) {
    const drop = s.marker === 0xe1 || (s.marker >= 0xe3 && s.marker <= 0xed) || s.marker === 0xfe;
    if (s.marker === 0xe1) { const o = readJpeg(Uint8Array.from([0xff, 0xd8, ...d.subarray(s.start, s.end)])).find((e) => e.key === 'Orientation'); if (o) orientation = Number(o.value) || 1; }
    if (!drop) parts.push(d.subarray(s.start, s.end));
  }
  if (orientation > 1 && orientation <= 8) parts.splice(1, 0, orientationOnly(orientation));
  return concat(parts);
}

// ---- PNG ----
const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const isPng = (d: Uint8Array) => PNG_SIG.every((b, i) => d[i] === b);
function* pngChunks(d: Uint8Array): Generator<{ type: string; start: number; end: number }> {
  if (!isPng(d)) throw new Error('not a PNG');
  const v = new DataView(d.buffer, d.byteOffset, d.length);
  for (let i = 8; i + 12 <= d.length; ) {
    const len = v.getUint32(i);
    yield { type: dec(d.subarray(i + 4, i + 8)), start: i, end: i + 12 + len };
    i += 12 + len;
  }
}
const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

export function readPng(d: Uint8Array): Entry[] {
  const out: Entry[] = [];
  for (const c of pngChunks(d)) {
    const body = d.subarray(c.start + 8, c.end - 4);
    if (c.type === 'tEXt') { const z = body.indexOf(0); out.push({ key: dec(body.subarray(0, z)), value: dec(body.subarray(z + 1)).slice(0, 200) }); }
    else if (c.type === 'zTXt' || c.type === 'iTXt') out.push({ key: dec(body.subarray(0, body.indexOf(0))), value: '(compressed text)' });
    else if (c.type === 'eXIf') out.push(...readTiff(d, c.start + 8));
    else if (c.type === 'tIME') out.push({ key: 'Modified', value: `${(body[0] << 8) | body[1]}-${String(body[2]).padStart(2, '0')}-${String(body[3]).padStart(2, '0')}` });
  }
  return out;
}

export function stripPng(d: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [d.subarray(0, 8)];
  for (const c of pngChunks(d)) if (!PNG_DROP.has(c.type)) parts.push(d.subarray(c.start, c.end));
  return concat(parts);
}

// ---- PDF ----
const PDF_FIELDS = ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer'] as const;

export async function readPdf(d: Uint8Array): Promise<Entry[]> {
  const doc = await PDFDocument.load(d, { updateMetadata: false });
  const get: Record<string, string | undefined> = { Title: doc.getTitle(), Author: doc.getAuthor(), Subject: doc.getSubject(), Keywords: doc.getKeywords(), Creator: doc.getCreator(), Producer: doc.getProducer() };
  const out = PDF_FIELDS.filter((k) => get[k]).map((k) => ({ key: k, value: get[k]! }));
  if (doc.catalog.has(PDFName.of('Metadata'))) out.push({ key: 'XMP', value: 'present' });
  return out;
}

export async function stripPdf(d: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(d, { updateMetadata: false });
  doc.setTitle(''); doc.setAuthor(''); doc.setSubject(''); doc.setKeywords([]); doc.setCreator(''); doc.setProducer('');
  doc.catalog.delete(PDFName.of('Metadata'));
  const info = doc.context.trailerInfo.Info;
  if (info) for (const k of ['CreationDate', 'ModDate']) doc.context.lookupMaybe(info, PDFDict)?.delete(PDFName.of(k));
  return doc.save({ useObjectStreams: false });
}
