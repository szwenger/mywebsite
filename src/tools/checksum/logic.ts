/** Incremental MD5, SHA-1, SHA-256 and SHA-512, because crypto.subtle.digest needs the whole file in memory (and has no MD5), and a 20 GB model does not fit. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export type Algo = 'md5' | 'sha1' | 'sha256' | 'sha512';
export const ALGOS: Algo[] = ['md5', 'sha1', 'sha256', 'sha512'];
export const LABEL: Record<Algo, string> = { md5: 'MD5', sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512' };

const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
const be32 = (d: Uint8Array, o: number) => (d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3];

/** Buffers input into blocks and pads it; a subclass supplies the compression function and the digest bytes. */
abstract class Block {
  private buf: Uint8Array;
  private fill = 0;
  private len = 0;
  private size: number;
  private le: boolean;
  constructor(size: number, le = false) { this.size = size; this.le = le; this.buf = new Uint8Array(size); }
  protected abstract block(d: Uint8Array, o: number): void;
  protected abstract out(): Uint8Array;

  update(data: Uint8Array): this {
    const size = this.size;
    this.len += data.length;
    let i = 0;
    if (this.fill) {
      const n = Math.min(size - this.fill, data.length);
      this.buf.set(data.subarray(0, n), this.fill);
      this.fill += n; i = n;
      if (this.fill < size) return this;
      this.block(this.buf, 0); this.fill = 0;
    }
    for (; i + size <= data.length; i += size) this.block(data, i);
    this.buf.set(data.subarray(i), 0);
    this.fill = data.length - i;
    return this;
  }

  /** Call once: it consumes the padding. */
  digest(): string {
    const bits = this.len * 8;
    const lenField = this.size / 8; // 8 bytes for 64-byte blocks, 16 for 128-byte ones; the top half stays 0
    const room = this.size - lenField;
    const pad = new Uint8Array((this.fill < room ? room : room + this.size) - this.fill + lenField);
    pad[0] = 0x80;
    const dv = new DataView(pad.buffer);
    const lo = bits >>> 0, hi = Math.floor(bits / 2 ** 32);
    dv.setUint32(pad.length - 8, this.le ? lo : hi, this.le);
    dv.setUint32(pad.length - 4, this.le ? hi : lo, this.le);
    const keep = this.len;
    this.update(pad);
    this.len = keep;
    return hex(this.out());
  }
}

const words = (h: Uint32Array | number[], le = false) => {
  const out = new Uint8Array(h.length * 4);
  const dv = new DataView(out.buffer);
  h.forEach((v, i) => dv.setUint32(i * 4, v, le));
  return out;
};

export class Md5 extends Block {
  private h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
  private m = new Uint32Array(16);
  private static K = Uint32Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
  private static S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  constructor() { super(64, true); }
  protected out() { return words(this.h, true); }
  protected block(d: Uint8Array, o: number) {
    const m = this.m;
    for (let i = 0; i < 16; i++) m[i] = d[o + i * 4] | (d[o + i * 4 + 1] << 8) | (d[o + i * 4 + 2] << 16) | (d[o + i * 4 + 3] << 24);
    let [a, b, c, e] = this.h;
    for (let i = 0; i < 64; i++) {
      const r = i >> 4;
      const f = r === 0 ? (b & c) | (~b & e) : r === 1 ? (e & b) | (~e & c) : r === 2 ? b ^ c ^ e : c ^ (b | ~e);
      const g = r === 0 ? i : r === 1 ? (5 * i + 1) % 16 : r === 2 ? (3 * i + 5) % 16 : (7 * i) % 16;
      const x = (f + a + Md5.K[i] + m[g]) | 0;
      a = e; e = c; c = b; b = (b + rotl(x, Md5.S[r * 4 + (i & 3)])) | 0;
    }
    this.h[0] += a; this.h[1] += b; this.h[2] += c; this.h[3] += e;
  }
}

export class Sha1 extends Block {
  private h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  private w = new Uint32Array(80);
  constructor() { super(64); }
  protected out() { return words(this.h); }
  protected block(d: Uint8Array, o: number) {
    const w = this.w;
    for (let i = 0; i < 16; i++) w[i] = be32(d, o + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, b, c, e, f] = this.h;
    for (let i = 0; i < 80; i++) {
      const fn = i < 20 ? (b & c) | (~b & e) : i < 40 || i >= 60 ? b ^ c ^ e : (b & c) | (b & e) | (c & e);
      const t = (rotl(a, 5) + fn + f + (i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6) + w[i]) | 0;
      f = e; e = c; c = rotl(b, 30); b = a; a = t;
    }
    const s = [a, b, c, e, f];
    for (let i = 0; i < 5; i++) this.h[i] += s[i];
  }
}

export class Sha256 extends Block {
  private h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  private w = new Uint32Array(64);
  constructor() { super(64); }
  protected out() { return words(this.h); }
  protected block(d: Uint8Array, o: number) {
    const w = this.w;
    for (let i = 0; i < 16; i++) w[i] = be32(d, o + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      w[i] = (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)) + w[i - 16];
    }
    let [a, b, c, d2, e, f, g, h] = this.h;
    for (let i = 0; i < 64; i++) {
      const t1 = h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i];
      const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c));
      h = g; g = f; f = e; e = (d2 + t1) | 0; d2 = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    const s = [a, b, c, d2, e, f, g, h];
    for (let i = 0; i < 8; i++) this.h[i] += s[i];
  }
}

/** SHA-512's constants are the first 64 bits of the fractional parts of the roots of the first primes: derive them instead of typing 80 of them. */
const iroot = (n: bigint, k: bigint): bigint => {
  let x = 1n << (BigInt(n.toString(2).length) / k + 1n);
  for (;;) {
    const y = ((k - 1n) * x + n / x ** (k - 1n)) / k;
    if (y >= x) return x;
    x = y;
  }
};
const primes: bigint[] = [];
for (let n = 2n; primes.length < 80; n++) if (primes.every((p) => n % p)) primes.push(n);
const frac = (p: bigint, k: bigint) => iroot(p << (64n * k), k) & ((1n << 64n) - 1n);
const split = (v: bigint[]) => ({ hi: Uint32Array.from(v, (x) => Number(x >> 32n)), lo: Uint32Array.from(v, (x) => Number(x & 0xffffffffn)) });
const K512 = split(primes.map((p) => frac(p, 3n)));
const H512 = split(primes.slice(0, 8).map((p) => frac(p, 2n)));

/** 64-bit words as hi/lo 32-bit halves: BigInt would make a multi-gigabyte file take minutes. */
export class Sha512 extends Block {
  private hh = Uint32Array.from(H512.hi);
  private hl = Uint32Array.from(H512.lo);
  private wh = new Uint32Array(80);
  private wl = new Uint32Array(80);
  constructor() { super(128); }
  protected out() { return words(Array.from({ length: 16 }, (_, i) => (i & 1 ? this.hl : this.hh)[i >> 1])); }
  protected block(d: Uint8Array, o: number) {
    const { wh, wl } = this;
    for (let i = 0; i < 16; i++) { wh[i] = be32(d, o + i * 8); wl[i] = be32(d, o + i * 8 + 4); }
    for (let i = 16; i < 80; i++) {
      const ah = wh[i - 15], al = wl[i - 15], bh = wh[i - 2], bl = wl[i - 2];
      const s0h = ((ah >>> 1) | (al << 31)) ^ ((ah >>> 8) | (al << 24)) ^ (ah >>> 7);
      const s0l = ((al >>> 1) | (ah << 31)) ^ ((al >>> 8) | (ah << 24)) ^ ((al >>> 7) | (ah << 25));
      const s1h = ((bh >>> 19) | (bl << 13)) ^ ((bh << 3) | (bl >>> 29)) ^ (bh >>> 6);
      const s1l = ((bl >>> 19) | (bh << 13)) ^ ((bl << 3) | (bh >>> 29)) ^ ((bl >>> 6) | (bh << 26));
      const lo = (wl[i - 16] >>> 0) + (s0l >>> 0) + (wl[i - 7] >>> 0) + (s1l >>> 0);
      wl[i] = lo;
      wh[i] = wh[i - 16] + s0h + wh[i - 7] + s1h + Math.floor(lo / 2 ** 32);
    }
    let ah = this.hh[0], bh = this.hh[1], ch = this.hh[2], dh = this.hh[3], eh = this.hh[4], fh = this.hh[5], gh = this.hh[6], hh = this.hh[7];
    let al = this.hl[0], bl = this.hl[1], cl = this.hl[2], dl = this.hl[3], el = this.hl[4], fl = this.hl[5], gl = this.hl[6], hl = this.hl[7];
    for (let i = 0; i < 80; i++) {
      const S1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
      const S1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));
      const chh = (eh & fh) ^ (~eh & gh), chl = (el & fl) ^ (~el & gl);
      const l1 = (hl >>> 0) + (S1l >>> 0) + (chl >>> 0) + K512.lo[i] + (wl[i] >>> 0);
      const t1l = l1 >>> 0;
      const t1h = (hh + S1h + chh + K512.hi[i] + wh[i] + Math.floor(l1 / 2 ** 32)) | 0;
      const S0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
      const S0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));
      const l2 = (S0l >>> 0) + (((al & bl) ^ (al & cl) ^ (bl & cl)) >>> 0);
      const t2h = (S0h + ((ah & bh) ^ (ah & ch) ^ (bh & ch)) + Math.floor(l2 / 2 ** 32)) | 0;
      const t2l = l2 >>> 0;
      hh = gh; hl = gl; gh = fh; gl = fl; fh = eh; fl = el;
      const le = (dl >>> 0) + t1l;
      el = le >>> 0; eh = (dh + t1h + Math.floor(le / 2 ** 32)) | 0;
      dh = ch; dl = cl; ch = bh; cl = bl; bh = ah; bl = al;
      const la = t1l + t2l;
      al = la >>> 0; ah = (t1h + t2h + Math.floor(la / 2 ** 32)) | 0;
    }
    const sh = [ah, bh, ch, dh, eh, fh, gh, hh], sl = [al, bl, cl, dl, el, fl, gl, hl];
    for (let i = 0; i < 8; i++) {
      const lo = this.hl[i] + (sl[i] >>> 0);
      this.hl[i] = lo;
      this.hh[i] += sh[i] + Math.floor(lo / 2 ** 32);
    }
  }
}

export interface Hasher { update(data: Uint8Array): this; digest(): string }
export const createHasher = (a: Algo): Hasher => new { md5: Md5, sha1: Sha1, sha256: Sha256, sha512: Sha512 }[a]();

/** The chosen digests (all four by default) from one read of the data. */
export function hashAll(algos: Algo[] = ALGOS) {
  const hs = algos.map((a) => [a, createHasher(a)] as const);
  return {
    update(data: Uint8Array) { for (const [, h] of hs) h.update(data); return this; },
    digest(): Partial<Record<Algo, string>> { return Object.fromEntries(hs.map(([a, h]) => [a, h.digest()])); },
  };
}

const LENGTH: Record<number, Algo> = { 32: 'md5', 40: 'sha1', 64: 'sha256', 128: 'sha512' };

/** Pulls a hash out of what people paste (a bare hash, "sha256:…", "MD5 = …", or a `sha256sum` line with a file name) and names the algorithm by its length. */
export function parseHash(text: string): { algo: Algo; hash: string } | null {
  const t = text.toLowerCase().replace(/\b(?:md5|sha-?1|sha-?256|sha-?512)\s*[:=]?/g, ' ').replace(/\s+/g, ' ').trim();
  const joined = /^[0-9a-f ]+$/.test(t) ? t.replace(/ /g, '') : ''; // a hash pasted in groups
  const hash = LENGTH[joined.length] ? joined : (t.match(/\b[0-9a-f]{128}\b|\b[0-9a-f]{64}\b|\b[0-9a-f]{40}\b|\b[0-9a-f]{32}\b/)?.[0] ?? '');
  const algo = LENGTH[hash.length];
  return algo ? { algo, hash } : null;
}
