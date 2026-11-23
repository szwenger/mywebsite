import { contrast, parseColor, toHex } from '../color/logic.ts';

export interface Spec { w: number; h: number; bg: string; fg: string; text: string }

export const clampSize = (v: number, fallback = 600): number => (Number.isFinite(v) ? Math.min(8192, Math.max(1, Math.round(v))) : fallback);

const hexOf = (c: string, fallback: string): string => { const p = parseColor(c); return p ? toHex({ ...p, a: 1 }) : fallback; };

/** Black or white, whichever reads better on the background. */
export function readableText(bg: string): string {
  const c = parseColor(bg);
  if (!c) return '#000000';
  const white = { r: 255, g: 255, b: 255, a: 1 }, black = { r: 0, g: 0, b: 0, a: 1 };
  return contrast(c, black) >= contrast(c, white) ? '#000000' : '#ffffff';
}

/** Font size that keeps the label inside the picture: at most 40 % of the height, at most 90 % of the width (a glyph is about 0.6 em wide). */
export function fontSizeFor(w: number, h: number, chars: number): number {
  return Math.max(6, Math.round(Math.min(h * 0.4, (w * 0.9) / (Math.max(chars, 1) * 0.6))));
}

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function placeholderSvg(o: Spec): string {
  const w = clampSize(o.w), h = clampSize(o.h);
  const text = o.text.trim() || `${w} × ${h}`;
  const bg = hexOf(o.bg, '#cccccc'), fg = hexOf(o.fg, readableText(bg));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" fill="${fg}" font-family="system-ui, sans-serif" font-size="${fontSizeFor(w, h, [...text].length)}" text-anchor="middle" dominant-baseline="central">${esc(text)}</text></svg>`;
}

/** A data URI for an SVG without Base64 (shorter for text), percent-encoded so it is safe in an attribute or a CSS url(). */
export const svgDataUri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;
