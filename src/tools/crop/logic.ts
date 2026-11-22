export interface Rect { x: number; y: number; w: number; h: number }
export const PRESETS = ['1:1', '4:3', '3:2', '16:9', '21:9', '3:4', '2:3', '4:5', '9:16'] as const;

/** "16:9", "16/9", "1.5" or "1,5" to width ÷ height; null when it is not a positive number. */
export function parseRatio(text: string): number | null {
  const t = text.trim().replace(',', '.');
  const m = /^(\d+(?:\.\d+)?)\s*[:/x×]\s*(\d+(?:\.\d+)?)$/i.exec(t);
  const r = m ? Number(m[1]) / Number(m[2]) : /^\d+(?:\.\d+)?$/.test(t) ? Number(t) : NaN;
  return r > 0 && Number.isFinite(r) ? r : null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The largest rectangle of the given ratio that fits the image, shrunk by `zoom` (≥ 1) and centred on (cx, cy) as image fractions,
 *  then pushed back inside the image. A null ratio keeps the image's own. Sides are whole pixels ≥ 1. */
export function cropRect(iw: number, ih: number, ratio: number | null, zoom = 1, cx = 0.5, cy = 0.5): Rect {
  const r = ratio ?? iw / ih;
  let w = iw, h = iw / r;
  if (h > ih) { h = ih; w = ih * r; }
  const z = Math.max(1, zoom);
  w = Math.min(iw, Math.max(1, Math.round(w / z)));
  h = Math.min(ih, Math.max(1, Math.round(h / z)));
  return { x: Math.round(clamp(cx * iw - w / 2, 0, iw - w)), y: Math.round(clamp(cy * ih - h / 2, 0, ih - h)), w, h };
}

/** Output size: the crop itself, or scaled to a chosen width (never above `maxSide` on the long side). */
export function outSize(rect: Rect, width?: number, maxSide = 8192): { w: number; h: number } {
  let w = width && width >= 1 ? Math.round(width) : rect.w;
  let h = Math.max(1, Math.round((w * rect.h) / rect.w));
  const over = Math.max(w, h) / maxSide;
  if (over > 1) { w = Math.max(1, Math.round(w / over)); h = Math.max(1, Math.round(h / over)); }
  return { w, h };
}

/** Width and height after turning the image by a quarter-turn multiple. */
export const turned = (w: number, h: number, deg: number): { w: number; h: number } => (deg % 180 ? { w: h, h: w } : { w, h });
