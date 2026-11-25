/** Pure parts of the pixel picker: where a pointer is on the picture, what colour is there, and where the loupe goes. */
import type { Rgb } from './logic';

/** The picture pixel under a point inside the shown picture (`box`, in CSS pixels), clamped to the picture. */
export function toImageXY(px: number, py: number, box: { w: number; h: number }, img: { w: number; h: number }): { x: number; y: number } {
  if (!(box.w > 0) || !(box.h > 0)) return { x: 0, y: 0 };
  const cl = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(v)));
  return { x: cl((px / box.w) * img.w, img.w), y: cl((py / box.h) * img.h, img.h) };
}

export function pixelAt(data: ArrayLike<number>, width: number, x: number, y: number): Rgb {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] / 255 };
}

/** Top-left of a square loupe of `size` px for a pointer at (px, py): centred above the pointer, below it when there is no room above, never outside the box sideways. */
export function loupePlacement(px: number, py: number, boxW: number, size: number): { left: number; top: number } {
  const gap = 30;
  const left = Math.min(Math.max(px - size / 2, 0), Math.max(boxW - size, 0));
  let top = py - size - gap;
  if (top < 0) top = py + gap;
  return { left, top };
}
