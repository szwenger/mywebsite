import { imagePdf } from './minipdf';

/** Browser-side helpers to turn an SVG string into a canvas, PNG or PDF. */
export async function svgToCanvas(svg: string, w: number, h: number, scale: number, white: boolean): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const x = c.getContext('2d')!;
  if (white) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export const canvasPng = (c: HTMLCanvasElement): Promise<Blob | null> => new Promise((done) => c.toBlob(done, 'image/png'));

/** The canvas as a one-page PDF (always on white, PDF has no cheap transparency). One CSS pixel is 0.75 point. */
export async function canvasPdf(c: HTMLCanvasElement, scale: number): Promise<Uint8Array> {
  const px = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  const rgb = new Uint8Array(c.width * c.height * 3);
  for (let i = 0, j = 0; i < px.length; i += 4, j += 3) { rgb[j] = px[i]; rgb[j + 1] = px[i + 1]; rgb[j + 2] = px[i + 2]; }
  return imagePdf(rgb, c.width, c.height, (c.width / scale) * 0.75, (c.height / scale) * 0.75);
}
