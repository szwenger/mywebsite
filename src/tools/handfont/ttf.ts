// A small TrueType writer: outlines, metrics, names and a contextual-alternates (calt) feature that cycles a letter's variants.

export interface Pt { x: number; y: number; on: boolean }
export type Contour = Pt[];
export interface Variant { advance: number; contours: Contour[] }
/** One character with its drawn variants (variants[0] is the default; all characters must have the same count). */
export interface Char { ch: string; variants: Variant[] }
export interface FontSpec {
  family: string;
  unitsPerEm: number;
  ascender: number;
  descender: number; // negative
  spaceAdvance: number;
  chars: Char[];
  /** Seconds since 1904; defaults to now. */
  created?: number;
}

class W {
  b: number[] = [];
  u8(v: number) { this.b.push(v & 255); return this; }
  u16(v: number) { this.b.push((v >> 8) & 255, v & 255); return this; }
  i16(v: number) { return this.u16(v < 0 ? v + 65536 : v); }
  u32(v: number) { this.b.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); return this; }
  tag(t: string) { for (let i = 0; i < 4; i++) this.u8(t.charCodeAt(i)); return this; }
  bytes(a: ArrayLike<number>) { for (let i = 0; i < a.length; i++) this.b.push(a[i]); return this; }
  pad4() { while (this.b.length % 4) this.b.push(0); return this; }
  get length() { return this.b.length; }
}

const sum = (b: number[] | Uint8Array): number => {
  let s = 0;
  for (let i = 0; i < b.length; i += 4) s = (s + (((b[i] ?? 0) << 24) | ((b[i + 1] ?? 0) << 16) | ((b[i + 2] ?? 0) << 8) | (b[i + 3] ?? 0))) >>> 0;
  return s;
};

interface G { name: string; advance: number; contours: Contour[]; xMin: number; yMin: number; xMax: number; yMax: number }

function bounds(contours: Contour[]) {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const c of contours) for (const p of c) { xMin = Math.min(xMin, p.x); xMax = Math.max(xMax, p.x); yMin = Math.min(yMin, p.y); yMax = Math.max(yMax, p.y); }
  return contours.length ? { xMin, yMin, xMax, yMax } : { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
}

function glyphData(g: G): number[] {
  if (!g.contours.length) return [];
  const w = new W();
  w.i16(g.contours.length).i16(g.xMin).i16(g.yMin).i16(g.xMax).i16(g.yMax);
  let n = 0;
  for (const c of g.contours) { n += c.length; w.u16(n - 1); }
  w.u16(0); // no instructions
  const flags: number[] = [];
  let px = 0, py = 0;
  const xw = new W(), yw = new W();
  for (const c of g.contours) {
    for (const p of c) {
      let f = p.on ? 1 : 0;
      const dx = p.x - px, dy = p.y - py;
      if (dx === 0) f |= 16; else if (Math.abs(dx) < 256) { f |= 2 | (dx > 0 ? 16 : 0); xw.u8(Math.abs(dx)); } else xw.i16(dx);
      if (dy === 0) f |= 32; else if (Math.abs(dy) < 256) { f |= 4 | (dy > 0 ? 32 : 0); yw.u8(Math.abs(dy)); } else yw.i16(dy);
      flags.push(f); px = p.x; py = p.y;
    }
  }
  w.bytes(flags).bytes(xw.b).bytes(yw.b).pad4();
  return w.b;
}

const round = (c: Contour[]): Contour[] => c.map((k) => k.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y), on: p.on })));

function coverage(ids: number[]): number[] {
  const w = new W().u16(1).u16(ids.length);
  ids.forEach((i) => w.u16(i));
  return w.b;
}

/** GSUB with one `calt` feature: variant 0 stays, the next letter of a run becomes variant 1, then 2, and so on. */
function gsub(base: number[], alts: number[][], scripts: string[]): number[] {
  const V = alts.length + 1;
  const sets = [base, ...alts]; // sets[v][i]: glyph id of variant v of the i-th character (base sorted ascending)
  const lookups: number[][] = [];
  // Lookups 0..V-2: single substitution base -> variant v.
  for (let v = 1; v < V; v++) {
    const t = new W().u16(2).u16(6 + 2 * sets[v].length).u16(sets[v].length);
    sets[v].forEach((g) => t.u16(g));
    t.bytes(coverage(sets[0]));
    const l = new W().u16(1).u16(0).u16(1).u16(8).bytes(t.b);
    lookups.push(l.b);
  }
  // Last lookup: chained contexts, rule v: previous glyph is variant v-1, this one is the default -> apply lookup v-1.
  const subs: number[][] = [];
  for (let v = 1; v < V; v++) {
    const back = coverage(sets[v - 1].slice().sort((a, b) => a - b));
    const inp = coverage(sets[0]);
    const head = 18; // format, backtrack count and offset, input count and offset, lookahead count, subst count, one record
    const t = new W().u16(3).u16(1).u16(head).u16(1).u16(head + back.length).u16(0).u16(1).u16(0).u16(v - 1).bytes(back).bytes(inp);
    subs.push(t.b);
  }
  {
    const hdr = 6 + 2 * subs.length;
    const l = new W().u16(6).u16(0).u16(subs.length);
    let o = hdr;
    subs.forEach((s) => { l.u16(o); o += s.length; });
    subs.forEach((s) => l.bytes(s));
    lookups.push(l.b);
  }
  const lookupList = new W().u16(lookups.length);
  let lo = 2 + 2 * lookups.length;
  lookups.forEach((l) => { lookupList.u16(lo); lo += l.length; });
  lookups.forEach((l) => lookupList.bytes(l));

  const langSys = new W().u16(0).u16(0xffff).u16(1).u16(0);
  const script = new W().u16(4).u16(0).bytes(langSys.b);
  const tags = [...scripts].sort();
  const scriptList = new W().u16(tags.length);
  const sOff = 2 + 6 * tags.length;
  tags.forEach((t) => scriptList.tag(t).u16(sOff));
  scriptList.bytes(script.b);
  const feature = new W().u16(0).u16(1).u16(lookups.length - 1);
  const featureList = new W().u16(1).tag('calt').u16(8).bytes(feature.b);

  const w = new W().u16(1).u16(0);
  const a = 10, b = a + scriptList.length, c = b + featureList.length;
  w.u16(a).u16(b).u16(c).bytes(scriptList.b).bytes(featureList.b).bytes(lookupList.b);
  return w.b;
}

export function buildTtf(spec: FontSpec): Uint8Array {
  const { unitsPerEm, ascender, descender } = spec;
  const V = spec.chars[0]?.variants.length ?? 1;
  const chars = spec.chars.slice().sort((a, b) => a.ch.codePointAt(0)! - b.ch.codePointAt(0)!).filter((c) => c.ch.codePointAt(0)! < 0xffff && c.ch !== ' ');

  const mk = (name: string, v: Variant): G => { const contours = round(v.contours); return { name, advance: Math.max(0, Math.round(v.advance)), contours, ...bounds(contours) }; };
  const notdef = (): G => {
    const w = Math.round(unitsPerEm * 0.6), t = Math.round(unitsPerEm * 0.05), top = ascender, bot = 0, l = Math.round(w * 0.1), r = Math.round(w * 0.9);
    const outer: Contour = [{ x: l, y: bot, on: true }, { x: l, y: top, on: true }, { x: r, y: top, on: true }, { x: r, y: bot, on: true }];
    const inner: Contour = [{ x: l + t, y: bot + t, on: true }, { x: r - t, y: bot + t, on: true }, { x: r - t, y: top - t, on: true }, { x: l + t, y: top - t, on: true }];
    return mk('.notdef', { advance: w, contours: [outer, inner] });
  };
  const glyphs: G[] = [notdef(), mk('space', { advance: spec.spaceAdvance, contours: [] })];
  const cmap: [number, number][] = [[0x20, 1]];
  chars.forEach((c, i) => { glyphs.push(mk('g' + c.ch.codePointAt(0)!.toString(16), c.variants[0])); cmap.push([c.ch.codePointAt(0)!, 2 + i]); });
  const base = chars.map((_, i) => 2 + i);
  const alts: number[][] = [];
  for (let v = 1; v < V; v++) {
    alts.push(chars.map((c) => { glyphs.push(mk(`g${c.ch.codePointAt(0)!.toString(16)}.alt${v}`, c.variants[v])); return glyphs.length - 1; }));
  }
  cmap.sort((a, b) => a[0] - b[0]);

  // glyf, loca, hmtx
  const glyf = new W(), loca = new W(), hmtx = new W();
  let maxPts = 0, maxCont = 0, xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity, adv = 0, minLsb = Infinity, minRsb = Infinity, extent = -Infinity, avg = 0;
  for (const g of glyphs) {
    loca.u32(glyf.length);
    glyf.bytes(glyphData(g));
    hmtx.u16(g.advance).i16(g.xMin);
    maxPts = Math.max(maxPts, g.contours.reduce((s, c) => s + c.length, 0));
    maxCont = Math.max(maxCont, g.contours.length);
    adv = Math.max(adv, g.advance); avg += g.advance;
    if (g.contours.length) {
      xMin = Math.min(xMin, g.xMin); yMin = Math.min(yMin, g.yMin); xMax = Math.max(xMax, g.xMax); yMax = Math.max(yMax, g.yMax);
      minLsb = Math.min(minLsb, g.xMin); minRsb = Math.min(minRsb, g.advance - g.xMax); extent = Math.max(extent, g.xMax);
    }
  }
  loca.u32(glyf.length);
  if (!isFinite(xMin)) { xMin = yMin = xMax = yMax = 0; minLsb = minRsb = extent = 0; }

  const created = spec.created ?? Math.floor(Date.now() / 1000) + 2082844800;
  const head = new W().u32(0x00010000).u32(0x00010000).u32(0).u32(0x5f0f3cf5).u16(3).u16(unitsPerEm)
    .u32(0).u32(created).u32(0).u32(created).i16(xMin).i16(yMin).i16(xMax).i16(yMax).u16(0).u16(8).i16(2).i16(1).i16(0);
  const hhea = new W().u32(0x00010000).i16(ascender).i16(descender).i16(0).u16(adv).i16(minLsb).i16(minRsb).i16(extent).i16(1).i16(0).i16(0)
    .i16(0).i16(0).i16(0).i16(0).i16(0).u16(glyphs.length);
  const maxp = new W().u32(0x00010000).u16(glyphs.length).u16(maxPts).u16(maxCont).u16(0).u16(0).u16(2).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0);

  const cps = cmap.map((c) => c[0]);
  const os2 = new W().u16(4).i16(Math.round(avg / glyphs.length)).u16(400).u16(5).u16(0)
    .i16(650).i16(600).i16(0).i16(75).i16(650).i16(600).i16(0).i16(350).i16(50).i16(300).i16(0)
    .bytes([2, 0, 5, 0, 0, 0, 0, 0, 0, 0]).u32(0x00000003).u32(0).u32(0).u32(0).tag('NONE').u16(0x40)
    .u16(Math.min(...cps)).u16(Math.max(...cps)).i16(ascender).i16(descender).i16(0).u16(Math.max(ascender, yMax)).u16(Math.max(-descender, -yMin))
    .u32(1).u32(0).i16(Math.round(unitsPerEm * 0.5)).i16(Math.round(unitsPerEm * 0.7)).u16(0).u16(0x20).u16(V > 1 ? 3 : 1);

  // cmap format 4
  const segs: { s: number; e: number; d: number }[] = [];
  for (const [cp, gid] of cmap) {
    const last = segs[segs.length - 1];
    if (last && last.e + 1 === cp && gid - cp === last.d) last.e = cp;
    else segs.push({ s: cp, e: cp, d: gid - cp });
  }
  segs.push({ s: 0xffff, e: 0xffff, d: 1 });
  const sc = segs.length;
  const pow = 2 ** Math.floor(Math.log2(sc));
  const sub = new W().u16(4).u16(16 + 8 * sc).u16(0).u16(sc * 2).u16(pow * 2).u16(Math.log2(pow)).u16(sc * 2 - pow * 2);
  segs.forEach((s) => sub.u16(s.e));
  sub.u16(0);
  segs.forEach((s) => sub.u16(s.s));
  segs.forEach((s) => sub.u16(s.d & 0xffff));
  segs.forEach(() => sub.u16(0));
  const cmapT = new W().u16(0).u16(2).u16(0).u16(3).u32(20).u16(3).u16(1).u32(20).bytes(sub.b);

  // name
  const fam = spec.family;
  const ps = fam.replace(/[^A-Za-z0-9]/g, '') || 'Handwriting';
  const strs: [number, string][] = [[1, fam], [2, 'Regular'], [3, `${ps}-Regular;1.0`], [4, fam], [5, 'Version 1.000'], [6, `${ps}-Regular`]];
  const sw = new W();
  const recs = new W();
  for (const [id, s] of strs) {
    recs.u16(3).u16(1).u16(0x409).u16(id).u16(s.length * 2).u16(sw.length);
    for (let i = 0; i < s.length; i++) sw.u16(s.charCodeAt(i));
  }
  const nameT = new W().u16(0).u16(strs.length).u16(6 + 12 * strs.length).bytes(recs.b).bytes(sw.b);

  const post = new W().u32(0x00030000).u32(0).i16(-100).i16(50).u32(0).u32(0).u32(0).u32(0).u32(0);

  const tables: [string, number[]][] = [
    ['OS/2', os2.b], ['cmap', cmapT.b], ['glyf', glyf.b], ['head', head.b], ['hhea', hhea.b], ['hmtx', hmtx.b],
    ['loca', loca.b], ['maxp', maxp.b], ['name', nameT.b], ['post', post.b],
  ];
  if (V > 1 && chars.length) {
    const cyr = chars.some((c) => c.ch.codePointAt(0)! >= 0x400 && c.ch.codePointAt(0)! < 0x530);
    tables.push(['GSUB', gsub(base, alts, cyr ? ['DFLT', 'latn', 'cyrl'] : ['DFLT', 'latn'])]);
  }
  tables.sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const n = tables.length;
  const p2 = 2 ** Math.floor(Math.log2(n));
  const out = new W().u32(0x00010000).u16(n).u16(p2 * 16).u16(Math.log2(p2)).u16(n * 16 - p2 * 16);
  let off = 12 + 16 * n;
  const body = new W();
  let headAt = 0;
  for (const [tag, data] of tables) {
    const padded = data.slice();
    while (padded.length % 4) padded.push(0);
    if (tag === 'head') headAt = off;
    out.tag(tag).u32(sum(padded)).u32(off).u32(data.length);
    body.bytes(padded);
    off += padded.length;
  }
  const bytes = new Uint8Array([...out.b, ...body.b]);
  const adj = (0xb1b0afba - sum(bytes)) >>> 0;
  new DataView(bytes.buffer).setUint32(headAt + 8, adj);
  return bytes;
}
