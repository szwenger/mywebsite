import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFString, type PDFObject } from 'pdf-lib';

/** PDF's standard security handler (revision 2 to 4): RC4 40/128-bit and AES-128. Written from the PDF 1.7 spec, algorithms 1 to 6.
 *  Not handled: AES-256 (revision 5/6) and files that keep objects inside compressed object streams. */

export function md5(data: Uint8Array): Uint8Array {
  const K = Uint32Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const total = ((data.length + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(total);
  m.set(data);
  m[data.length] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 8, (data.length * 8) >>> 0, true);
  dv.setUint32(total - 4, Math.floor((data.length * 8) / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < total; o += 64) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const x = (a + f + K[i] + dv.getUint32(o + g * 4, true)) | 0;
      const s = S[(i >> 4) * 4 + (i % 4)];
      a = d; d = c; c = b;
      b = (b + ((x << s) | (x >>> (32 - s)))) | 0;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => ov.setUint32(i * 4, v >>> 0, true));
  return out;
}

export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = Uint8Array.from({ length: 256 }, (_, i) => i);
  for (let i = 0, j = 0; i < 256; i++) { j = (j + s[i] + key[i % key.length]) & 255; [s[i], s[j]] = [s[j], s[i]]; }
  const out = new Uint8Array(data.length);
  for (let k = 0, i = 0, j = 0; k < data.length; k++) {
    i = (i + 1) & 255; j = (j + s[i]) & 255; [s[i], s[j]] = [s[j], s[i]];
    out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
  }
  return out;
}

const cat = (...p: Uint8Array[]): Uint8Array => { const o = new Uint8Array(p.reduce((a, b) => a + b.length, 0)); let n = 0; for (const x of p) { o.set(x, n); n += x.length; } return o; };
const PAD = Uint8Array.from('28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A'.match(/../g)!.map((h) => parseInt(h, 16)));
const padded = (pw: string) => cat(new TextEncoder().encode(pw).subarray(0, 32), PAD).subarray(0, 32);
const le32 = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, n, true); return b; };
const eq = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

type Method = 'rc4' | 'aes';
interface Params { r: 2 | 3 | 4; n: number; o: Uint8Array; p: number; id: Uint8Array; method: Method }

/** Algorithm 2: the file key from the user password. */
function fileKey(pw: string, q: Params): Uint8Array {
  let h = md5(cat(padded(pw), q.o, le32(q.p), q.id));
  if (q.r >= 3) for (let i = 0; i < 50; i++) h = md5(h.subarray(0, q.n));
  return h.slice(0, q.n);
}
/** Algorithms 3 (owner entry O). */
function ownerEntry(owner: string, user: string, r: number, n: number): Uint8Array {
  let h = md5(padded(owner));
  if (r >= 3) for (let i = 0; i < 50; i++) h = md5(h);
  const key = h.subarray(0, n);
  let x = rc4(key, padded(user));
  if (r >= 3) for (let i = 1; i <= 19; i++) x = rc4(key.map((b) => b ^ i), x);
  return x;
}
/** Algorithms 4 and 5 (user entry U). */
function userEntry(key: Uint8Array, q: Params): Uint8Array {
  if (q.r === 2) return rc4(key, PAD);
  let x = rc4(key, md5(cat(PAD, q.id)));
  for (let i = 1; i <= 19; i++) x = rc4(key.map((b) => b ^ i), x);
  return cat(x, new Uint8Array(16));
}
const objectKey = (key: Uint8Array, num: number, gen: number, aes: boolean): Uint8Array =>
  md5(cat(key, Uint8Array.of(num & 255, (num >> 8) & 255, (num >> 16) & 255, gen & 255, (gen >> 8) & 255), aes ? new TextEncoder().encode('sAlT') : new Uint8Array(0))).subarray(0, Math.min(key.length + 5, 16));

const subtle = globalThis.crypto.subtle;
async function aesEncrypt(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const k = await subtle.importKey('raw', key, 'AES-CBC', false, ['encrypt']);
  return cat(iv, new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv }, k, data)));
}
async function aesDecrypt(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  if (data.length < 32) return new Uint8Array(0);
  const k = await subtle.importKey('raw', key, 'AES-CBC', false, ['decrypt']);
  return new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv: data.subarray(0, 16) }, k, data.subarray(16)));
}

/** Runs `fn` over every string and stream of every object, replacing each with the result. */
async function transform(doc: PDFDocument, skip: PDFRef | undefined, fn: (data: Uint8Array, ref: PDFRef) => Promise<Uint8Array>): Promise<void> {
  const walk = async (o: PDFObject, ref: PDFRef): Promise<PDFObject> => {
    if (o instanceof PDFString || o instanceof PDFHexString) return PDFHexString.of([...await fn(o.asBytes(), ref)].map((b) => b.toString(16).padStart(2, '0')).join(''));
    if (o instanceof PDFArray) { for (let i = 0; i < o.size(); i++) o.set(i, await walk(o.get(i), ref)); return o; }
    if (o instanceof PDFDict) { for (const [k, v] of o.entries()) o.set(k, await walk(v, ref)); return o; }
    return o;
  };
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (ref === skip) continue;
    if (obj instanceof PDFRawStream) {
      await walk(obj.dict, ref);
      const data = await fn(obj.getContents(), ref);
      doc.context.assign(ref, PDFRawStream.of(obj.dict.clone ? (() => { const d = obj.dict.clone(); d.set(PDFName.of('Length'), PDFNumber.of(data.length)); return d; })() : obj.dict, data));
    } else if (obj instanceof PDFDict || obj instanceof PDFArray) await walk(obj, ref);
  }
}

export interface ProtectOpts { user: string; owner?: string; method?: Method; allow?: { print?: boolean; copy?: boolean; modify?: boolean; annotate?: boolean } }

/** Encrypts a PDF so it asks for `user` to open (empty = anyone can open, only the permissions apply). AES-128 by default. */
export async function protect(file: Uint8Array, o: ProtectOpts): Promise<Uint8Array> {
  // Save without object streams and reload so every stream is raw bytes we can encrypt one by one.
  const plain = await PDFDocument.load(await (await PDFDocument.load(file)).save({ useObjectStreams: false }), { updateMetadata: false });
  const method = o.method ?? 'aes';
  const a = o.allow ?? {};
  const perms = 0xfffff0c0 | (a.print === false ? 0 : 4 | 2048) | (a.modify ? 8 | 1024 : 0) | (a.copy ? 16 | 512 : 0) | (a.annotate ? 32 | 256 : 0);
  const id = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const q: Params = { r: method === 'aes' ? 4 : 3, n: 16, o: new Uint8Array(32), p: perms | 0, id, method };
  q.o = ownerEntry(o.owner || o.user || 'owner-' + [...id].map((b) => b.toString(16)).join(''), o.user, q.r, q.n);
  const key = fileKey(o.user, q);
  const u = userEntry(key, q);
  const ctx = plain.context;
  const enc = ctx.obj({
    Filter: 'Standard', V: method === 'aes' ? 4 : 2, R: q.r, Length: 128, P: q.p,
    O: PDFHexString.of([...q.o].map((b) => b.toString(16).padStart(2, '0')).join('')), U: PDFHexString.of([...u].map((b) => b.toString(16).padStart(2, '0')).join('')),
    ...(method === 'aes' ? { CF: { StdCF: { AuthEvent: 'DocOpen', CFM: 'AESV2', Length: 16 } }, StmF: 'StdCF', StrF: 'StdCF' } : {}),
  });
  const encRef = ctx.register(enc);
  await transform(plain, encRef, async (data, ref) => {
    const k = objectKey(key, ref.objectNumber, ref.generationNumber, method === 'aes');
    return method === 'aes' ? aesEncrypt(k, data) : rc4(k, data);
  });
  const hexId = PDFHexString.of([...id].map((b) => b.toString(16).padStart(2, '0')).join(''));
  ctx.trailerInfo.Encrypt = encRef;
  ctx.trailerInfo.ID = ctx.obj([hexId, hexId]);
  return plain.save({ useObjectStreams: false });
}

/** Removes the password and the restrictions. Throws Error('password') for a wrong one and Error('unsupported') for AES-256 or compressed object streams;
 *  the caller can then fall back to drawing the pages. */
export async function unlock(file: Uint8Array, password = ''): Promise<Uint8Array> {
  let doc: PDFDocument;
  try { doc = await PDFDocument.load(file, { ignoreEncryption: true, throwOnInvalidObject: true, updateMetadata: false }); } catch { throw new Error('unsupported'); }
  const ctx = doc.context;
  const encRef = ctx.trailerInfo.Encrypt;
  if (!encRef) return doc.save();
  const enc = ctx.lookup(encRef, PDFDict);
  const num = (n: string) => (enc.lookup(PDFName.of(n)) as PDFNumber | undefined)?.asNumber();
  const bytes = (n: string) => (enc.lookup(PDFName.of(n)) as PDFString | PDFHexString).asBytes();
  const v = num('V') ?? 0, r = num('R') ?? 2;
  if (v >= 5 || r >= 5 || v < 1) throw new Error('unsupported');
  let method: Method = 'rc4';
  if (v === 4) {
    const cf = enc.lookup(PDFName.of('CF'), PDFDict).lookup(PDFName.of('StdCF'), PDFDict);
    const cfm = (cf.get(PDFName.of('CFM')) as PDFName).decodeText();
    if (cfm === 'AESV2') method = 'aes'; else if (cfm !== 'V2') throw new Error('unsupported');
  }
  const idArr = ctx.lookup(ctx.trailerInfo.ID, PDFArray);
  const q: Params = { r: r as 2 | 3 | 4, n: v === 1 ? 5 : (num('Length') ?? 128) / 8, o: bytes('O'), p: num('P')!, id: (idArr.lookup(0) as PDFString | PDFHexString).asBytes(), method };
  if (method === 'aes') q.n = 16;
  const key = fileKey(password, q);
  const u = bytes('U');
  const mine = userEntry(key, q);
  if (!eq(q.r === 2 ? mine : mine.subarray(0, 16), q.r === 2 ? u : u.subarray(0, 16))) throw new Error('password');
  try {
    await transform(doc, encRef as PDFRef, async (data, ref) => {
      const k = objectKey(key, ref.objectNumber, ref.generationNumber, method === 'aes');
      return method === 'aes' ? aesDecrypt(k, data) : rc4(k, data);
    });
  } catch { throw new Error('unsupported'); }
  delete ctx.trailerInfo.Encrypt;
  ctx.delete(encRef as PDFRef);
  return doc.save({ useObjectStreams: false });
}
