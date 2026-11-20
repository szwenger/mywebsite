export type Format = 'png' | 'jpeg' | 'webp';

/** Fits (w, h) inside the optional limits, keeping the aspect ratio. Never upscales; sides stay integers ≥ 1. */
export function targetSize(w: number, h: number, maxW?: number, maxH?: number): { w: number; h: number } {
  const scale = Math.min(1, maxW ? maxW / w : 1, maxH ? maxH / h : 1);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** Swaps the extension for the target format's (.jpg for jpeg), or adds one when the name has none. */
export function outName(name: string, fmt: Format): string {
  return `${name.replace(/\.[^.\/\\]+$/, '')}.${fmt === 'jpeg' ? 'jpg' : fmt}`;
}

const INPUT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'];
export const accepts = (file: { type: string }): boolean => INPUT.includes(file.type);
