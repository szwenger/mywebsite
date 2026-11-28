// Browser-only text recognition. Pages are drawn with pdf.js and read by Tesseract in a worker; the engine and the language data
// come from this site (see ocr-assets.ts), nothing is fetched from another origin. This file is imported only when OCR is clicked.
import { openPdf, closePdf, renderPage } from './raster';
import { ocrAssets, OCR_LANGS } from './ocr-assets';
import type { OcrPage, OcrWord } from './ocrlayer';

export type OcrLang = 'en' | 'de' | 'ru' | 'ru+en';
export interface OcrOptions { pages: number[]; lang: OcrLang; dpi: number; skipText: boolean }

const codes = (l: OcrLang): string => (l === 'ru+en' ? `${OCR_LANGS.ru}+${OCR_LANGS.en}` : OCR_LANGS[l]);

/** Recognises the given pages (0-based). `layer[i]` and `text[i]` belong to the same processed page (`layer[i].index`); pages skipped for
 *  already having text are left out of both. `onProgress(done, total)` is called before each page and once at the end. */
export async function recognizePages(
  file: Uint8Array, o: OcrOptions, onProgress: (done: number, total: number) => void,
): Promise<{ layer: OcrPage[]; text: string[] }> {
  // The minified ESM file is the UMD bundle wrapped: it has no named exports, only a default holding them all.
  const { createWorker } = ((await import('tesseract.js/dist/tesseract.esm.min.js')) as unknown as { default: typeof import('tesseract.js') }).default;
  const assets = ocrAssets();
  const pdf = await openPdf(file);
  const layer: OcrPage[] = [], text: string[] = [];
  // 1 = LSTM only, the engine the shipped core and models are built for.
  const worker = await createWorker(codes(o.lang), 1, { ...assets, gzip: true, cacheMethod: 'none' });
  try {
    for (let i = 0; i < o.pages.length; i++) {
      onProgress(i, o.pages.length);
      const index = o.pages[i];
      const page = await pdf.getPage(index + 1);
      if (o.skipText && (await page.getTextContent()).items.length > 0) continue;
      const canvas = await renderPage(page, o.dpi);
      try {
        const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
        const words: OcrWord[] = [];
        for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) {
          if (!w.text.trim() || w.confidence < 0) continue;
          words.push({ text: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 });
        }
        layer.push({ index, imgW: canvas.width, imgH: canvas.height, words });
        text.push(data.text.trim());
      } finally { canvas.width = canvas.height = 0; } // hand the pixels back at once, phones run out of memory first
    }
    onProgress(o.pages.length, o.pages.length);
    return { layer, text };
  } finally {
    await worker.terminate();
    closePdf(pdf);
  }
}
