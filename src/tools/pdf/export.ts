// The one loop that turns PDF pages into image files: the PDF suite's convert panel uses it.
import { renderPage, toBlob, type PdfDoc } from './raster';
import { fitDpi, imageFormat, pageFile, type ImageFmt } from './images';

export interface PageImage { page: number; name: string; blob: Blob }
export interface ExportOptions { fmt: ImageFmt; dpi: number; quality: number; name: string; pages: number[] }

/** Draws the chosen pages (0-based) of an open PDF as images and hands each to `each`; `each` returning false stops the run.
 *  Throws Error('unsupported') when the browser cannot encode the format (WebP on older Safari). Returns the lowest dpi a big page was cut down to, or 0. */
export async function renderImages(pdf: PdfDoc, o: ExportOptions, each: (img: PageImage, k: number, n: number) => boolean | void | Promise<boolean | void>, onProgress?: (k: number, n: number) => void): Promise<number> {
  const { type, ext } = imageFormat(o.fmt);
  let capped = 0;
  for (const [k, i] of o.pages.entries()) {
    onProgress?.(k + 1, o.pages.length);
    const page = await pdf.getPage(i + 1);
    const v = page.getViewport({ scale: 1 });
    const used = fitDpi(v.width, v.height, o.dpi);
    if (used < o.dpi) capped = capped ? Math.min(capped, used) : used;
    const blob = await toBlob(await renderPage(page, o.dpi), type, o.quality);
    if (blob.type !== type) throw new Error('unsupported');
    if ((await each({ page: i, name: pageFile(o.name, i + 1, pdf.numPages, ext), blob }, k, o.pages.length)) === false) break;
  }
  return capped;
}
