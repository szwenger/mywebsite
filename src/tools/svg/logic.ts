// SVG helpers that need no DOM: a conservative minifier and the picture's intrinsic size.

export interface MinifyOptions { precision: number; keepTitle: boolean }

const TAG = /<(?:[^>"']|"[^"]*"|'[^']*')+>/g;
const EDITOR_NS = 'inkscape|sodipodi|sketch|serif|dc|cc|rdf|i';

/** Rounds every decimal in path or point data to `p` places, dropping trailing zeros and the leading zero (".5"). */
export function roundNumbers(data: string, p: number): string {
  return data.replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, (n) => {
    if (/e/i.test(n) || !n.includes('.')) return n;
    const r = Number(Number(n).toFixed(p));
    if (r === 0) return '0';
    return String(r).replace(/^(-?)0\./, '$1.');
  });
}

/** Removes what no renderer needs (comments, editor data, metadata, indentation) and shortens path numbers. Does not rewrite shapes, so the picture stays identical apart from the rounding. */
export function minifySvg(src: string, opt: MinifyOptions = { precision: 3, keepTitle: true }): string {
  let s = src.replace(/^﻿/, '');
  s = s.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<metadata\b[\s\S]*?<\/metadata>/gi, '');
  if (!opt.keepTitle) s = s.replace(/<(title|desc)\b[\s\S]*?<\/\1>/gi, '');
  s = s.replace(new RegExp(`<(${EDITOR_NS}):[\\w-]+\\b[^>]*/>`, 'g'), '');
  for (let guard = 0; guard < 8; guard++) {
    const next = s.replace(new RegExp(`<(${EDITOR_NS}):([\\w-]+)\\b[^>]*>(?:(?!<\\1:\\2\\b)[\\s\\S])*?</\\1:\\2>`, 'g'), '');
    if (next === s) break;
    s = next;
  }
  s = s.replace(new RegExp(`\\s(?:${EDITOR_NS}):[\\w-]+\\s*=\\s*("[^"]*"|'[^']*')`, 'g'), '');
  s = s.replace(new RegExp(`\\sxmlns:(?:${EDITOR_NS})\\s*=\\s*("[^"]*"|'[^']*')`, 'g'), '');
  s = s.replace(/\sdata-name\s*=\s*("[^"]*"|'[^']*')/g, '');
  s = s.replace(/<defs\s*\/>|<defs>\s*<\/defs>/g, '');
  // Numbers in path and point data and in plain numeric attributes.
  s = s.replace(/\s(d|points|cx|cy|r|rx|ry|x|y|x1|y1|x2|y2|width|height|stroke-width|opacity|fill-opacity|stroke-opacity|offset|stroke-miterlimit)=("[^"]*"|'[^']*')/g, (_, name: string, val: string) => ` ${name}=${val[0]}${roundNumbers(val.slice(1, -1), opt.precision).replace(/\s+/g, ' ').trim()}${val[0]}`);
  // Whitespace: indentation between tags goes, spaces inside text stay.
  s = s.replace(/>\s*\n\s*</g, '><');
  s = s.replace(TAG, (tag) => tag.replace(/\s+/g, ' ').replace(/ (\/?>)/, '$1'));
  return s.trim();
}

const UNIT: Record<string, number> = { '': 1, px: 1, pt: 96 / 72, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };
const num = (v: string | undefined): number | null => {
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*(px|pt|pc|mm|cm|in)?\s*$/i.exec(v ?? '');
  return m ? Number(m[1]) * UNIT[(m[2] ?? '').toLowerCase()] : null;
};

/** The picture's own size in pixels, from width and height or else the viewBox; null when it only has relative units. */
export function svgSize(src: string): { w: number; h: number } | null {
  const root = /<svg\b(?:[^>"']|"[^"]*"|'[^']*')*>/i.exec(src)?.[0];
  if (!root) return null;
  const attr = (n: string) => new RegExp(`\\s${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(root)?.slice(1).find((x) => x !== undefined);
  const [w, h] = [num(attr('width')), num(attr('height'))];
  if (w && h && w > 0 && h > 0) return { w, h };
  const vb = attr('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (vb?.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
    // One side given: keep the viewBox proportions.
    if (w && w > 0) return { w, h: w * vb[3] / vb[2] };
    if (h && h > 0) return { w: h * vb[2] / vb[3], h };
    return { w: vb[2], h: vb[3] };
  }
  return null;
}

/** Output size for a picture of `size`: an explicit width wins, else the scale factor. Sides are whole pixels, at least 1. */
export function outputSize(size: { w: number; h: number }, width: number | undefined, scale: number): { w: number; h: number } {
  const k = width && width > 0 ? width / size.w : scale;
  return { w: Math.max(1, Math.round(size.w * k)), h: Math.max(1, Math.round(size.h * k)) };
}

/** True when the markup is an SVG document (an <svg> root, ignoring a prolog and comments). */
export const looksLikeSvg = (src: string): boolean => /^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/i.test(src.replace(/^﻿/, ''));
