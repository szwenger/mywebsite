// Styled QR codes: takes the module matrix and draws one SVG. The canvas preview and both downloads come from it.

export type Shape = 'square' | 'rounded' | 'dots';
export type Finder = 'square' | 'rounded' | 'circle';
export type Gradient = 'none' | 'linear' | 'radial';
export type Frame = 'none' | 'box' | 'rounded' | 'label';

export type QrStyle = {
  shape: Shape;
  finder: Finder;
  gradient: Gradient;
  fg: string;
  fg2: string;
  bg: string;
  frame: Frame;
  label: string;
  /** Centre image as a data URL; ratio is its width as a share of the code (0.1 to 0.3). */
  logo?: { href: string; ratio: number };
};

export const defaultStyle: QrStyle = {
  shape: 'square', finder: 'square', gradient: 'none', fg: '#000000', fg2: '#5563c6', bg: '#ffffff', frame: 'none', label: 'Scan me',
};

export const QUIET = 2;
const BORDER = 1.5;
const BAND = 4.5;
export const MAX_LOGO = 0.3;
export const MAX_LABEL = 24;

const f = (x: number) => +x.toFixed(2);
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function isFinder(n: number, r: number, c: number): boolean {
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
}

/** Module range [from, to) the centre image covers, on both axes. */
export function logoBox(n: number, ratio: number): { from: number; to: number } {
  const size = Math.max(1, Math.round(n * Math.min(Math.max(ratio, 0), MAX_LOGO)));
  const from = Math.floor((n - size) / 2);
  return { from, to: from + size };
}

/** Outer size in module units, and where the code with its quiet zone starts. */
export function layout(n: number, frame: Frame): { w: number; h: number; off: number } {
  const inner = n + 2 * QUIET;
  if (frame === 'none') return { w: inner, h: inner, off: 0 };
  const w = inner + 2 * BORDER;
  return { w, h: frame === 'label' ? w + BAND : w, off: BORDER };
}

/** Rounded rectangle as a path. */
function rr(x: number, y: number, w: number, h: number, r: number): string {
  if (r <= 0) return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`;
  const a = (dx: number, dy: number) => `a${f(r)} ${f(r)} 0 0 1 ${f(dx)} ${f(dy)}`;
  return `M${f(x + r)} ${f(y)}h${f(w - 2 * r)}${a(r, r)}v${f(h - 2 * r)}${a(-r, r)}h${f(-(w - 2 * r))}${a(-r, -r)}v${f(-(h - 2 * r))}${a(r, -r)}z`;
}

function cell(shape: Shape, x: number, y: number): string {
  if (shape === 'rounded') return rr(x, y, 1, 1, 0.3);
  if (shape === 'dots') return `M${f(x)} ${f(y + 0.5)}a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0z`;
  return `M${f(x)} ${f(y)}h1v1h-1z`;
}

const FINDER_RADII: Record<Finder, [number, number, number]> = { square: [0, 0, 0], rounded: [2, 1.2, 0.9], circle: [3.5, 2.5, 1.5] };

function finderPath(kind: Finder, x: number, y: number): string {
  const [a, b, c] = FINDER_RADII[kind];
  return rr(x, y, 7, 7, a) + rr(x + 1, y + 1, 5, 5, b) + rr(x + 2, y + 2, 3, 3, c);
}

/** The whole code as an SVG string. `get(row, col)` says whether a module is dark. */
export function qrSvg(n: number, get: (r: number, c: number) => boolean, style: QrStyle, px: number): string {
  const { w, h, off } = layout(n, style.frame);
  const x0 = off + QUIET;
  const inner = n + 2 * QUIET;
  const box = style.logo ? logoBox(n, style.logo.ratio) : null;

  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!get(r, c) || isFinder(n, r, c)) continue;
      if (box && r >= box.from && r < box.to && c >= box.from && c < box.to) continue;
      d += cell(style.shape, x0 + c, x0 + r);
    }
  }
  const fd = finderPath(style.finder, x0, x0) + finderPath(style.finder, x0 + n - 7, x0) + finderPath(style.finder, x0, x0 + n - 7);

  const paint = style.gradient === 'none' ? style.fg : 'url(#qg)';
  let defs = '';
  if (style.gradient === 'linear') {
    defs = `<linearGradient id="qg" gradientUnits="userSpaceOnUse" x1="${x0}" y1="${x0}" x2="${x0 + n}" y2="${x0 + n}"><stop offset="0" stop-color="${style.fg}"/><stop offset="1" stop-color="${style.fg2}"/></linearGradient>`;
  } else if (style.gradient === 'radial') {
    defs = `<radialGradient id="qg" gradientUnits="userSpaceOnUse" cx="${x0 + n / 2}" cy="${x0 + n / 2}" r="${f(n * 0.72)}"><stop offset="0" stop-color="${style.fg}"/><stop offset="1" stop-color="${style.fg2}"/></radialGradient>`;
  }

  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" width="${px}" height="${Math.round((px * h) / w)}">`;
  if (defs) out += `<defs>${defs}</defs>`;
  if (style.frame === 'none') {
    out += `<rect width="${f(w)}" height="${f(h)}" fill="${style.bg}"/>`;
  } else {
    const round = style.frame === 'rounded' || style.frame === 'label';
    out += `<rect width="${f(w)}" height="${f(h)}" rx="${round ? 2 : 0}" fill="${style.fg}"/>`;
    out += `<rect x="${off}" y="${off}" width="${inner}" height="${inner}" rx="${round ? 1 : 0}" fill="${style.bg}"/>`;
  }
  out += `<path d="${d}" fill="${paint}"${style.shape === 'square' ? ' shape-rendering="crispEdges"' : ''}/>`;
  out += `<path d="${fd}" fill="${paint}" fill-rule="evenodd"/>`;

  if (style.logo && box) {
    const at = x0 + box.from;
    const size = box.to - box.from;
    out += `<rect x="${at}" y="${at}" width="${size}" height="${size}" rx="0.8" fill="${style.bg}"/>`;
    out += `<image href="${esc(style.logo.href)}" x="${f(at + 0.4)}" y="${f(at + 0.4)}" width="${f(size - 0.8)}" height="${f(size - 0.8)}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  if (style.frame === 'label') {
    const text = style.label.trim().slice(0, MAX_LABEL) || defaultStyle.label;
    const fs = Math.min(2.4, (w - 2 * BORDER) / (text.length * 0.66));
    const top = off + inner;
    out += `<text x="${f(w / 2)}" y="${f(top + (h - top) / 2 + fs * 0.35)}" text-anchor="middle" font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-weight="700" font-size="${f(fs)}" fill="${style.bg}">${esc(text)}</text>`;
  }
  return out + '</svg>';
}
