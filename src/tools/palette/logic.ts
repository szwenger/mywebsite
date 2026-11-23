import { contrast, toHex, type Rgb } from '../color/logic.ts';

export interface Swatch { rgb: Rgb; hex: string; share: number; text: '#000000' | '#ffffff' }

/** Index that splits the sorted box into two halves with the smallest total squared deviation along `channel` (1-D two-means). */
function bestCut(box: number[][], channel: number): number {
  const n = box.length;
  let total = 0, totalSq = 0;
  for (const p of box) { total += p[channel]; totalSq += p[channel] ** 2; }
  let left = 0, leftSq = 0, best = n >> 1, bestCost = Infinity;
  for (let i = 1; i < n; i++) {
    const v = box[i - 1][channel];
    left += v; leftSq += v * v;
    if (box[i][channel] === v) continue; // never cut between equal values
    const cost = (leftSq - left * left / i) + ((totalSq - leftSq) - (total - left) ** 2 / (n - i));
    if (cost < bestCost) { bestCost = cost; best = i; }
  }
  return best;
}

/** Median-cut style: split the box with the widest colour range until there are `k` boxes, cutting where the two halves are most uniform
 *  (a plain median would blend a dominant colour into its neighbour). Deterministic, so the same picture always gives the same palette. */
export function extractPalette(rgba: ArrayLike<number>, k: number, minAlpha = 125, minShare = 0.005): Swatch[] {
  const px: number[][] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) if (rgba[i + 3] >= minAlpha) px.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  if (!px.length || k < 1) return [];
  const total = px.length;
  const range = (box: number[][]) => {
    const lo = [255, 255, 255], hi = [0, 0, 0];
    for (const p of box) for (let c = 0; c < 3; c++) { if (p[c] < lo[c]) lo[c] = p[c]; if (p[c] > hi[c]) hi[c] = p[c]; }
    const spans = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    const channel = spans.indexOf(Math.max(...spans));
    return { channel, span: spans[channel] };
  };
  let boxes = [px];
  while (boxes.length < k) {
    // The box worth splitting most: many pixels and a wide range.
    let best = -1, bestScore = 0;
    boxes.forEach((b, i) => { const score = b.length > 1 ? range(b).span * Math.sqrt(b.length) : 0; if (score > bestScore) { best = i; bestScore = score; } });
    if (best < 0) break;
    const box = boxes[best];
    const { channel } = range(box);
    box.sort((a, b) => a[channel] - b[channel]);
    const mid = bestCut(box, channel);
    boxes = [...boxes.slice(0, best), box.slice(0, mid), box.slice(mid), ...boxes.slice(best + 1)];
  }
  const white: Rgb = { r: 255, g: 255, b: 255, a: 1 }, black: Rgb = { r: 0, g: 0, b: 0, a: 1 };
  return boxes.map((b) => {
    const sum = [0, 0, 0];
    for (const p of b) { sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; }
    const rgb: Rgb = { r: Math.round(sum[0] / b.length), g: Math.round(sum[1] / b.length), b: Math.round(sum[2] / b.length), a: 1 };
    return { rgb, hex: toHex(rgb), share: b.length / total, text: contrast(rgb, white) >= contrast(rgb, black) ? '#ffffff' as const : '#000000' as const };
  }).filter((s) => s.share >= minShare).sort((a, b) => b.share - a.share); // slivers (anti-aliased edges) are not colours of the picture
}

/** Ready-to-paste text for a palette. */
export function exportPalette(sw: Swatch[], kind: 'css' | 'json' | 'list'): string {
  if (kind === 'css') return `:root {\n${sw.map((s, i) => `  --color-${i + 1}: ${s.hex};`).join('\n')}\n}`;
  if (kind === 'json') return JSON.stringify(sw.map((s) => s.hex), null, 2);
  return sw.map((s) => s.hex).join('\n');
}

/** At most `limit` pixels' worth of width and height, keeping the aspect ratio; the palette does not need more detail. */
export function sampleSize(w: number, h: number, limit = 160): { w: number; h: number } {
  const f = Math.min(1, limit / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
}
