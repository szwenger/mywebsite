// Turns a picture into a few shades with the dots arranged so it still looks continuous: error diffusion (Floyd-Steinberg, Atkinson),
// ordered (Bayer) or a plain threshold. Works on grey values; the result is drawn between two colours (black and white by default).
export const ALGOS = ['floyd', 'atkinson', 'bayer', 'threshold'] as const;
export type Algo = (typeof ALGOS)[number];
export interface Colour { r: number; g: number; b: number }
export interface Options { algo: Algo; levels: number; dark: Colour; light: Colour }

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** RGBA in, RGBA out (the input stays as it is). `levels` shades from `dark` to `light`, at least 2. */
export function dither(data: Uint8ClampedArray, w: number, h: number, o: Options): Uint8ClampedArray {
  const n = Math.min(32, Math.max(2, Math.round(o.levels)));
  const step = 255 / (n - 1);
  const grey = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) grey[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  const idx = new Uint8Array(w * h);
  const level = (v: number): number => Math.min(n - 1, Math.max(0, Math.round(v / step)));

  if (o.algo === 'threshold') {
    for (let i = 0; i < idx.length; i++) idx[i] = level(grey[i]);
  } else if (o.algo === 'bayer') {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) idx[y * w + x] = level(grey[y * w + x] + ((BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16 - 0.5) * step);
  } else {
    const spread: [number, number, number][] = o.algo === 'floyd'
      ? [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]]
      : [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]; // Atkinson passes on only 6/8 of the error: crisper, loses some tone
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, q = level(grey[i]);
      idx[i] = q;
      const err = grey[i] - q * step;
      if (!err) continue;
      for (const [dx, dy, k] of spread) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny < h) grey[ny * w + nx] += err * k;
      }
    }
  }

  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const t = idx[i] / (n - 1);
    out[i * 4] = Math.round(o.dark.r + (o.light.r - o.dark.r) * t);
    out[i * 4 + 1] = Math.round(o.dark.g + (o.light.g - o.dark.g) * t);
    out[i * 4 + 2] = Math.round(o.dark.b + (o.light.b - o.dark.b) * t);
    out[i * 4 + 3] = data[i * 4 + 3];
  }
  return out;
}
