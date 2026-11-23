// Where to draw a watermark on a picture. Pure geometry; the page does the drawing.
export type Pos = 'tl' | 'tc' | 'tr' | 'ml' | 'c' | 'mr' | 'bl' | 'bc' | 'br';
export const POSITIONS: Pos[] = ['tl', 'tc', 'tr', 'ml', 'c', 'mr', 'bl', 'bc', 'br'];

export interface Spot { x: number; y: number }

/** Top-left corner of a `w` × `h` mark placed at an anchor, `margin` pixels in from the edges. */
export function anchor(pos: Pos, imgW: number, imgH: number, w: number, h: number, margin: number): Spot {
  const row = pos === 'c' ? 'm' : pos[0], col = pos === 'c' ? 'c' : pos[1];
  const x = col === 'l' ? margin : col === 'r' ? imgW - w - margin : (imgW - w) / 2;
  const y = row === 't' ? margin : row === 'b' ? imgH - h - margin : (imgH - h) / 2;
  return { x: Math.round(x), y: Math.round(y) };
}

/** Repeats the mark over the whole picture, `gap` pixels apart, with the pattern centred. Rows can be shifted by half a step for a brick look. */
export function tiles(imgW: number, imgH: number, w: number, h: number, gap: number, stagger = false): Spot[] {
  const sx = Math.max(1, w + gap), sy = Math.max(1, h + gap);
  const cols = Math.ceil(imgW / sx) + 2, rows = Math.ceil(imgH / sy) + 2;
  const ox = (imgW - w) / 2 - Math.floor(cols / 2) * sx, oy = (imgH - h) / 2 - Math.floor(rows / 2) * sy;
  const out: Spot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * sx + (stagger && r % 2 ? sx / 2 : 0), y = oy + r * sy;
      if (x + w > 0 && y + h > 0 && x < imgW && y < imgH) out.push({ x: Math.round(x), y: Math.round(y) });
    }
  }
  return out;
}

/** Font size in pixels for a text mark: `percent` of the picture's width gives the width of a typical line, so use that to size the font. */
export function fontSize(imgW: number, percent: number, chars: number): number {
  return Math.max(8, Math.round((imgW * percent) / 100 / Math.max(chars, 1) / 0.55));
}

/** Width and height of a logo scaled to `percent` of the picture's width, never taller than the picture. */
export function logoSize(imgW: number, imgH: number, logoW: number, logoH: number, percent: number): { w: number; h: number } {
  let w = (imgW * percent) / 100;
  let h = (w * logoH) / logoW;
  if (h > imgH) { h = imgH; w = (h * logoW) / logoH; }
  return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

/** Name for the stamped copy: "photo.jpg" becomes "photo-marked.jpg". */
export const markedName = (name: string, ext: string): string => `${name.replace(/\.[^.\/\\]+$/, '')}-marked.${ext}`;
