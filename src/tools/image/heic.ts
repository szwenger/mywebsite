// HEIC/HEIF decoding with libheif (LGPL-3.0, WebAssembly bundled into this chunk). Only imported when the browser cannot read the file itself.
// @ts-ignore the bundle ships no type declarations for this path
import libheif from 'libheif-js/libheif-wasm/libheif-bundle.mjs';

type Lib = { HeifDecoder: new () => { decode(data: Uint8Array): HeifImage[] } };
interface HeifImage { get_width(): number; get_height(): number; display(into: ImageData, done: (d: ImageData | null) => void): void }

let lib: Promise<Lib> | undefined;

/** Decodes the first (primary) picture of a HEIC/HEIF file. Rotation stored in the file is already applied. */
export async function decodeHeic(file: File): Promise<ImageBitmap> {
  lib ??= (libheif as () => Promise<Lib>)();
  const decoder = new (await lib).HeifDecoder();
  const images = decoder.decode(new Uint8Array(await file.arrayBuffer()));
  if (!images?.length) throw new Error('not a HEIC file');
  const img = images[0];
  const data = new ImageData(img.get_width(), img.get_height());
  await new Promise<void>((done, fail) => img.display(data, (d) => (d ? done() : fail(new Error('HEIC decode failed')))));
  return createImageBitmap(data);
}
