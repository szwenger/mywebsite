import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Text items of one page (1-based): string and the pdf.js transform [a, b, c, d, x, y] in user space. */
export async function textItems(bytes, pageNo = 1, password) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, password }).promise;
  try {
    const tc = await (await doc.getPage(pageNo)).getTextContent();
    return tc.items.map((i) => ({ str: i.str, t: i.transform }));
  } finally { await doc.cleanup?.(); }
}
export async function pageCount(bytes, password) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, password }).promise;
  try { return doc.numPages; } finally { await doc.cleanup?.(); }
}
