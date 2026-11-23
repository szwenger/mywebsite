/** A one-page PDF that shows one picture. Enough to hand a formula or a snippet to someone as a PDF without pulling in a PDF library. */

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** `rgb` is w*h*3 bytes of 8-bit RGB, top row first. The page is ptW x ptH points and the picture fills it. */
export async function imagePdf(rgb: Uint8Array, w: number, h: number, ptW: number, ptH: number): Promise<Uint8Array> {
  const data = await deflate(rgb);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const add = (x: string | Uint8Array) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const n = (v: number) => String(Math.round(v * 100) / 100);

  const content = `q ${n(ptW)} 0 0 ${n(ptH)} 0 0 cm /Im0 Do Q`;
  const objects: (string | Uint8Array)[][] = [
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>'],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(ptW)} ${n(ptH)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`],
    [`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${data.length} >>\nstream\n`, data, '\nendstream'],
    [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
  ];
  add('%PDF-1.4\n');
  objects.forEach((o, i) => { offsets.push(len); add(`${i + 1} 0 obj\n`); o.forEach(add); add('\nendobj\n'); });
  const xref = len;
  add(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(len);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
