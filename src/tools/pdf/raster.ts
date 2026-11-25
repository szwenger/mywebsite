// Browser-only PDF reading and drawing with pdf.js. The worker ships with the site; nothing is loaded from a CDN.
// The legacy build carries polyfills for newer JS APIs (Map.getOrInsertComputed, Math.sumPrecise) that mobile Safari and older browsers lack;
// the modern build fails there without a visible error. Every pdf.js import in src must use this same build.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { fitDpi, scaleFor } from './images';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export type PdfDoc = pdfjs.PDFDocumentProxy;
export type PdfPage = pdfjs.PDFPageProxy;

/** Opens a PDF. A wrong or missing password rejects with pdf.js's PasswordException (name === 'PasswordException'). */
export async function openPdf(data: Uint8Array, password?: string): Promise<PdfDoc> {
  return pdfjs.getDocument({ data: data.slice(), password }).promise; // slice: the worker takes ownership of the buffer
}

/** Releases the worker's copy of the file. */
export const closePdf = (d: PdfDoc): void => { void d.loadingTask.destroy(); };

export const isPasswordError = (e: unknown): boolean => (e as { name?: string })?.name === 'PasswordException';

/** Draws a page onto a fresh canvas at the wanted dpi (lowered when the page would be too big for a canvas). White background. */
export async function renderPage(page: PdfPage, dpi: number): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: scaleFor(fitDpi(base.width, base.height, dpi)) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: g, viewport }).promise;
  return canvas;
}

export const toBlob = (c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> =>
  new Promise((done, fail) => c.toBlob((b) => (b ? done(b) : fail(new Error('encode'))), type, quality));

export const bytesOf = async (b: Blob): Promise<Uint8Array> => new Uint8Array(await b.arrayBuffer());

export type { pdfjs };
