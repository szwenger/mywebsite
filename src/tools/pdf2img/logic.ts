/** Largest canvas iOS Safari will draw; same limit as the image converter. */
const MAX_PIXELS = 16_777_216;

/** Pixels per PDF point at a given resolution: a PDF page is measured in 1/72 inch. */
export const scaleFor = (dpi: number): number => dpi / 72;

/** The dpi to actually use: the wanted one, lowered until the page fits the canvas limit (w, h in points). */
export function fitDpi(wPt: number, hPt: number, dpi: number): number {
  const px = (wPt * hPt * scaleFor(dpi) ** 2);
  return px <= MAX_PIXELS ? dpi : Math.max(1, Math.floor(dpi * Math.sqrt(MAX_PIXELS / px)));
}

/** report.pdf, page 3 of 12, png -> report-03.png (padded to the width of the page count). */
export function pageFile(base: string, n: number, total: number, ext: string): string {
  return `${base.replace(/\.pdf$/i, '')}-${String(n).padStart(String(total).length, '0')}.${ext}`;
}
