import { PDFDocument, degrees } from 'pdf-lib';

/** Pure pdf-lib operations: they run the same in Node (tests) and in the browser. */

export async function merge(files: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(f);
    for (const p of await out.copyPages(src, src.getPageIndices())) out.addPage(p);
  }
  return out.save();
}

/** Keeps the given 0-based pages in the given order. Also serves split, reorder and delete. */
export async function extract(file: Uint8Array, pages: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(file);
  const out = await PDFDocument.create();
  for (const p of await out.copyPages(src, pages)) out.addPage(p);
  return out.save();
}

export async function rotate(file: Uint8Array, pages: number[], by: 90 | 180 | 270): Promise<Uint8Array> {
  const doc = await PDFDocument.load(file);
  const all = doc.getPages();
  for (const i of new Set(pages)) all[i].setRotation(degrees((all[i].getRotation().angle + by) % 360));
  return doc.save();
}

/** One image per page, the page sized to the image. */
export async function imagesToPdf(images: { bytes: Uint8Array; type: 'image/png' | 'image/jpeg' }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const { bytes, type } of images) {
    const img = type === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    doc.addPage([img.width, img.height]).drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return doc.save();
}

export async function loadInfo(file: Uint8Array): Promise<{ pageCount: number } | { error: 'encrypted' | 'invalid' }> {
  try {
    return { pageCount: (await PDFDocument.load(file)).getPageCount() };
  } catch (e) {
    // pdf-lib's error classes are ES5-compiled, so instanceof fails; its message is the stable signal.
    return { error: /encrypted/i.test(String((e as Error)?.message)) ? 'encrypted' : 'invalid' };
  }
}
