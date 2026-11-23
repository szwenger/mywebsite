// Everything that needs both pdf.js (drawing pages) and pdf-lib (building PDFs): browser only.
import { PDFDocument } from 'pdf-lib';
import { renderPage, toBlob, bytesOf, openPdf, closePdf, type PdfDoc } from './raster';
import { shown, type RGB, type TextRenderer } from './stamp';
import { contentBox, invert, isBlank, toGray } from './pixels';
import { zip } from '../zip';
import { renderImages } from '../pdf2img/export';
import { pageText } from './textout';
import type { Reencode } from './more';

export const makeTextRenderer = (): TextRenderer => async (text, size, color: RGB, bold) => {
  const scale = 3;
  const px = size * scale;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = `${bold ? '700 ' : ''}${px}px Helvetica, Arial, "Segoe UI", sans-serif`;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 4;
  const h = Math.ceil(px * 1.35);
  c.width = w; c.height = h;
  g.font = font;
  g.textBaseline = 'alphabetic';
  g.fillStyle = `rgb(${color.map((v) => Math.round(v * 255)).join(',')})`;
  g.fillText(text, 2, Math.round(px * 1.05));
  return { png: await bytesOf(await toBlob(c, 'image/png')), w, h, scale };
};

/** Draws pages onto canvases and passes their pixels to `fn`. Returns what fn returns per page. */
async function eachPage<T>(pdf: PdfDoc, dpi: number, fn: (c: HTMLCanvasElement, i: number) => T | Promise<T>, onProgress?: (i: number, n: number) => void): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < pdf.numPages; i++) { onProgress?.(i + 1, pdf.numPages); out.push(await fn(await renderPage(await pdf.getPage(i + 1), dpi), i)); }
  return out;
}
const pixels = (c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height);

/** Indexes (0-based) of pages that are blank. */
export async function findBlankPages(file: Uint8Array, tolerance: number, onProgress?: (i: number, n: number) => void): Promise<number[]> {
  const pdf = await openPdf(file);
  try { return (await eachPage(pdf, 50, (c, i) => (isBlank(pixels(c).data, tolerance) ? i : -1), onProgress)).filter((i) => i >= 0); } finally { closePdf(pdf); }
}

/** Margins (points) that would cut each page down to its content, with `pad` points of air. null when a page is empty. */
export async function autoMargins(file: Uint8Array, pad: number): Promise<({ top: number; right: number; bottom: number; left: number } | null)[]> {
  const pdf = await openPdf(file);
  try {
    return await eachPage(pdf, 72, (c) => {
      const box = contentBox(pixels(c).data, c.width, c.height);
      if (!box) return null;
      // 72 dpi: one pixel is one point.
      return { left: Math.max(0, box.x - pad), top: Math.max(0, box.y - pad), right: Math.max(0, c.width - box.x - box.w - pad), bottom: Math.max(0, c.height - box.y - box.h - pad) };
    });
  } finally { closePdf(pdf); }
}

/** Builds a PDF out of page pictures, each page keeping its original size in points. */
async function imagePdf(pages: { jpeg: Uint8Array; w: number; h: number }[]): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  for (const p of pages) { const img = await d.embedJpg(p.jpeg); d.addPage([p.w, p.h]).drawImage(img, { x: 0, y: 0, width: p.w, height: p.h }); }
  return d.save();
}

/** Replaces the chosen pages (all when null) by pictures of themselves and optionally greys or inverts them. Text stops being text. */
export async function rasterizePages(file: Uint8Array, o: { pages: number[] | null; dpi: number; quality: number; gray?: boolean; invert?: boolean; password?: string }, onProgress?: (i: number, n: number) => void): Promise<Uint8Array> {
  const pdf = await openPdf(file, o.password);
  const src = await PDFDocument.load(file, { ignoreEncryption: !!o.password });
  const out = await PDFDocument.create();
  try {
    for (let i = 0; i < pdf.numPages; i++) {
      onProgress?.(i + 1, pdf.numPages);
      const orig = src.getPages()[i];
      if (o.pages && !o.pages.includes(i)) { out.addPage((await out.copyPages(src, [i]))[0]); continue; }
      const c = await renderPage(await pdf.getPage(i + 1), o.dpi);
      if (o.gray || o.invert) { const g = c.getContext('2d')!; const im = g.getImageData(0, 0, c.width, c.height); if (o.gray) toGray(im.data); if (o.invert) invert(im.data); g.putImageData(im, 0, 0); }
      const { w, h } = shown(orig);
      const img = await out.embedJpg(await bytesOf(await toBlob(c, 'image/jpeg', o.quality)));
      out.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
    }
    return await out.save();
  } finally { closePdf(pdf); }
}

/** Rebuilds a PDF only from pictures of its pages (the way out for files that pdf-lib cannot read or decrypt). */
export async function pagesToImagePdf(file: Uint8Array, dpi: number, password?: string, onProgress?: (i: number, n: number) => void): Promise<Uint8Array> {
  const pdf = await openPdf(file, password);
  try {
    const pages = await eachPage(pdf, dpi, async (c, i) => {
      const vp = (await pdf.getPage(i + 1)).getViewport({ scale: 1 });
      return { jpeg: await bytesOf(await toBlob(c, 'image/jpeg', 0.85)), w: vp.width, h: vp.height };
    }, onProgress);
    return await imagePdf(pages);
  } finally { closePdf(pdf); }
}

export async function exportImages(file: Uint8Array, o: { fmt: 'png' | 'jpeg' | 'webp'; dpi: number; quality: number; name: string; pages?: number[] }, onProgress?: (i: number, n: number) => void): Promise<Uint8Array> {
  const pdf = await openPdf(file);
  const files: { name: string; data: Uint8Array }[] = [];
  try {
    await renderImages(pdf, { ...o, pages: o.pages ?? [...Array(pdf.numPages).keys()] }, async (img) => { files.push({ name: img.name, data: await bytesOf(img.blob) }); }, onProgress);
  } finally { closePdf(pdf); }
  return zip(files);
}

export async function extractText(file: Uint8Array): Promise<string[]> {
  const pdf = await openPdf(file);
  try {
    const out: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) out.push(pageText((await (await pdf.getPage(i)).getTextContent()).items as { str: string; hasEOL?: boolean }[]));
    return out;
  } finally { closePdf(pdf); }
}

/** Pulls the embedded pictures out as PNG files. pdf.js decodes them; the same picture drawn twice is saved once. */
export async function extractImages(file: Uint8Array, name: string): Promise<Uint8Array | null> {
  const pdf = await openPdf(file);
  const files: { name: string; data: Uint8Array }[] = [];
  const seen = new Set<string>();
  try {
    const { OPS } = await import('pdfjs-dist');
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const ops = await page.getOperatorList();
      for (let k = 0; k < ops.fnArray.length; k++) {
        if (ops.fnArray[k] !== OPS.paintImageXObject && ops.fnArray[k] !== OPS.paintInlineImageXObject) continue;
        const id = ops.argsArray[k][0] as string;
        if (seen.has(id)) continue;
        seen.add(id);
        const img: { width: number; height: number; data?: Uint8ClampedArray; bitmap?: ImageBitmap; kind?: number } | undefined = await new Promise((done) => {
          if (typeof id !== 'string') { done(ops.argsArray[k][0]); return; }
          const t = setTimeout(() => done(undefined), 2000);
          (id.startsWith('g_') ? page.commonObjs : page.objs).get(id, (v: never) => { clearTimeout(t); done(v); });
        });
        if (!img || img.width < 8 || img.height < 8) continue;
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d')!;
        if (img.bitmap) g.drawImage(img.bitmap, 0, 0);
        else if (img.data) {
          const n = img.width * img.height;
          const rgba = new Uint8ClampedArray(n * 4);
          const d = img.data;
          if (d.length === n * 4) rgba.set(d);
          else if (d.length === n * 3) for (let i = 0; i < n; i++) { rgba[i * 4] = d[i * 3]; rgba[i * 4 + 1] = d[i * 3 + 1]; rgba[i * 4 + 2] = d[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
          else if (d.length === n) for (let i = 0; i < n; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = d[i]; rgba[i * 4 + 3] = 255; }
          else continue;
          g.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
        } else continue;
        files.push({ name: `${name}-p${p}-${files.length + 1}.png`, data: await bytesOf(await toBlob(c, 'image/png')) });
      }
    }
  } finally { closePdf(pdf); }
  return files.length ? zip(files) : null;
}

/** The encoder for recompressImages: draws each picture smaller (long side at most `maxSide`) and saves a JPEG. */
export const jpegReencoder = (scale: number, maxSide: number, quality: number): Reencode => async (img) => {
  let bmp: ImageBitmap;
  if (img.kind === 'jpeg') bmp = await createImageBitmap(new Blob([img.bytes as BlobPart], { type: 'image/jpeg' }));
  else {
    const n = img.width * img.height;
    const rgba = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) { for (let c = 0; c < 3; c++) rgba[i * 4 + c] = img.bytes[img.comps === 3 ? i * 3 + c : i]; rgba[i * 4 + 3] = 255; }
    bmp = await createImageBitmap(new ImageData(rgba, img.width, img.height));
  }
  const k = Math.min(scale, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * Math.min(1, k))), h = Math.max(1, Math.round(img.height * Math.min(1, k)));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, 0, 0, w, h);
  return { bytes: await bytesOf(await toBlob(c, 'image/jpeg', quality)), width: w, height: h };
};
