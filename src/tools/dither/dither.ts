import { dither, type Algo, type Colour } from './logic';
import { download, onFiles } from '../dom';
import { fitsCanvas, isImage } from '../image/logic';
import { canvasBlob, decodeImage } from '../imageio';

const root = document.querySelector<HTMLElement>('[data-dither]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const out = q<HTMLCanvasElement>('[data-out]');
  const err = q('[data-error]');
  const png = q<HTMLButtonElement>('[data-png]');
  let bmp: ImageBitmap | null = null;
  let name = 'image';
  const rgb = (hex: string): Colour => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });

  function render() {
    q('[name="levelsOut"]').textContent = f('levels').value;
    q('[name="pixelOut"]').textContent = f('pixel').value;
    if (!bmp) return;
    const k = Number(f('pixel').value);
    const w = Math.max(1, Math.ceil(bmp.width / k)), h = Math.max(1, Math.ceil(bmp.height / k));
    const small = document.createElement('canvas');
    small.width = w; small.height = h;
    const g = small.getContext('2d', { willReadFrequently: true })!;
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); // transparent areas count as white paper
    g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, 0, 0, w, h);
    const src = g.getImageData(0, 0, w, h);
    const done = dither(src.data, w, h, { algo: f('algo').value as Algo, levels: Number(f('levels').value), dark: rgb(f('dark').value), light: rgb(f('light').value) });
    g.putImageData(new ImageData(done, w, h), 0, 0);
    out.width = w * k; out.height = h * k; // a dot of size k is k × k real pixels
    const o = out.getContext('2d')!;
    o.imageSmoothingEnabled = false;
    o.drawImage(small, 0, 0, w * k, h * k);
    out.hidden = false; png.disabled = false;
  }

  async function load(files: File[]) {
    const file = files.find(isImage);
    if (!file) return;
    err.hidden = true;
    try { bmp = await decodeImage(file); } catch { err.textContent = s.failed; err.hidden = false; return; }
    if (!fitsCanvas({ w: bmp.width, h: bmp.height })) { err.textContent = s.tooBig; err.hidden = false; bmp = null; return; }
    name = file.name.replace(/\.[^.]+$/, '');
    render();
  }

  png.addEventListener('click', async () => { const b = await canvasBlob(out, 'image/png'); if (b) download(b, `${name}-dithered.png`); });
  root.addEventListener('input', render);
  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-input]'), load, { paste: true });
}
