import { isHeic } from './image/logic';

/** The browser's own decoder first (Safari reads HEIC); otherwise HEIC goes through libheif, loaded only when needed. Throws when neither can read the file. */
export async function decodeImage(file: File): Promise<ImageBitmap> {
  try { return await createImageBitmap(file); } catch (e) { if (!isHeic(file)) throw e; }
  return (await import('./image/heic')).decodeHeic(file);
}

/** Encodes a canvas. null means the canvas was too large. An unsupported type silently comes back as PNG, so check `blob.type` where it matters. */
export const canvasBlob = (c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob | null> => new Promise((done) => c.toBlob(done, type, quality));
