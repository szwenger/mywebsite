/** Pure parts of the line-height calculator. The recommendation is a rule of thumb, not a standard. */
export interface In { size: number; ratio: number; root: number; grid: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, digits: number) => Number(v.toFixed(digits));

/** 1.5 for 16 px body text at 66 characters, tighter as type gets bigger, looser as lines get longer. */
export function recommendedRatio(size: number, measure: number): number {
  const base = 1.15 + 0.35 * (16 / size) ** 0.7;
  return round(clamp(base + ((measure - 66) / 66) * 0.1, 1.1, 1.7), 2);
}

export function lineHeight(o: In): { px: number; rem: number; unitless: string; snapped: number } {
  if (!(o.size > 0) || !(o.ratio > 0) || !(o.root > 0)) return { px: NaN, rem: NaN, unitless: '', snapped: NaN };
  const px = round(o.size * o.ratio, 3);
  return {
    px,
    rem: round(px / o.root, 4),
    unitless: String(round(o.ratio, 3)),
    snapped: o.grid > 0 ? Math.round(px / o.grid) * o.grid : Math.round(px),
  };
}

/** A line of `chars` characters as CSS ch (the width of a zero) and as an estimated width, a zero being about 0.55 em. */
export const measureWidth = (chars: number, size: number): { ch: number; px: number } => ({ ch: chars, px: Math.round(chars * size * 0.55) });
