/** Pure parts of the favicon generator: ICO container, a store-only ZIP writer and the square crop. */

export function crc32(d: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < d.length; i++) {
    c ^= d[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

/** ICO with PNG-compressed images (supported by every browser and Windows since Vista). Size 256 is stored as 0. */
export function buildIco(images: { size: number; data: Uint8Array }[]): Uint8Array {
  const head = 6 + images.length * 16;
  const out = new Uint8Array(head + images.reduce((n, i) => n + i.data.length, 0));
  const v = new DataView(out.buffer);
  v.setUint16(2, 1, true); v.setUint16(4, images.length, true);
  let off = head;
  images.forEach((img, i) => {
    const e = 6 + i * 16;
    out[e] = out[e + 1] = img.size >= 256 ? 0 : img.size;
    v.setUint16(e + 4, 1, true); v.setUint16(e + 6, 32, true);
    v.setUint32(e + 8, img.data.length, true); v.setUint32(e + 12, off, true);
    out.set(img.data, off);
    off += img.data.length;
  });
  return out;
}

/** ZIP without compression: PNG and ICO are already compressed, so storing them costs nothing. */
export function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data);
    const lh = new Uint8Array(30 + name.length), lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint32(14, crc, true); lv.setUint32(18, f.data.length, true); lv.setUint32(22, f.data.length, true); lv.setUint16(26, name.length, true);
    lh.set(name, 30);
    const ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, f.data.length, true); cv.setUint32(24, f.data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, off, true);
    ch.set(name, 46);
    parts.push(lh, f.data);
    central.push(ch);
    off += lh.length + f.data.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, off, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of all) { out.set(p, i); i += p.length; }
  return out;
}

/** Source and destination rectangles (destination as fractions of the target square) to fit an image into a square. */
export function squareCrop(w: number, h: number, mode: 'cover' | 'contain') {
  if (mode === 'cover') {
    const s = Math.min(w, h);
    return { sx: (w - s) / 2, sy: (h - s) / 2, sw: s, sh: s, dx: 0, dy: 0, dw: 1, dh: 1 };
  }
  const s = Math.max(w, h);
  return { sx: 0, sy: 0, sw: w, sh: h, dx: (1 - w / s) / 2, dy: (1 - h / s) / 2, dw: w / s, dh: h / s };
}
