/** Pixel helpers on RGBA data (what a canvas gives back). */
const luma = (d: Uint8ClampedArray | Uint8Array, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Share of pixels that are not near-white. */
export function inkRatio(d: Uint8ClampedArray | Uint8Array, white = 235): number {
  let ink = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && luma(d, i) < white) ink++;
  return ink / Math.max(1, d.length / 4);
}
/** A page counts as blank when less than `tolerance` of it is ink (scanner noise and a speck of dust stay under 0.1 %). */
export const isBlank = (d: Uint8ClampedArray | Uint8Array, tolerance = 0.001): boolean => inkRatio(d) < tolerance;

/** Bounding box of everything that is not near-white, or null for an empty page. */
export function contentBox(d: Uint8ClampedArray | Uint8Array, w: number, h: number, white = 245): { x: number; y: number; w: number; h: number } | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (luma(d, i) < white) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function toGray(d: Uint8ClampedArray | Uint8Array): void {
  for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = Math.round(luma(d, i));
}
export function invert(d: Uint8ClampedArray | Uint8Array): void {
  for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
}
