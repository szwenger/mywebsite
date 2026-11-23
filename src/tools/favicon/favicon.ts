import { buildIco, buildZip, squareCrop } from './logic';
import { copy, download, onFiles } from '../dom';
import { isHeic } from '../image/logic';
import { canvasBlob, decodeImage } from '../imageio';

const SIZES: [string, number][] = [['favicon-16x16.png', 16], ['favicon-32x32.png', 32], ['favicon-48x48.png', 48], ['apple-touch-icon.png', 180], ['android-chrome-192x192.png', 192], ['android-chrome-512x512.png', 512]];

const root = document.querySelector<HTMLElement>('[data-favicon]');
if (root) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => root.querySelector<HTMLSelectElement>(`[name="${n}"]`)!;
  let img: HTMLImageElement | ImageBitmap | null = null;
  let files: { name: string; data: Uint8Array }[] = [];

  async function render() {
    if (!img) return;
    const w = ('naturalWidth' in img ? img.naturalWidth : img.width) || 512, h = ('naturalHeight' in img ? img.naturalHeight : img.height) || 512; // SVG without size attributes reports 0
    const c = squareCrop(w, h, f('fit').value as 'cover' | 'contain');
    const out: typeof files = [];
    const previews = q('[data-previews]');
    previews.replaceChildren();
    for (const [name, size] of SIZES) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const g = cv.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      if (f('bg').value) { g.fillStyle = f('bg').value; g.fillRect(0, 0, size, size); }
      g.drawImage(img, c.sx, c.sy, c.sw, c.sh, c.dx * size, c.dy * size, c.dw * size, c.dh * size);
      const blob = await canvasBlob(cv);
      if (!blob) continue;
      out.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
      if (size <= 192) {
        const fig = document.createElement('figure'), im = new Image();
        im.src = URL.createObjectURL(blob); im.width = im.height = Math.min(size, 96); im.alt = '';
        fig.append(im, Object.assign(document.createElement('span'), { textContent: `${size}` }));
        previews.append(fig);
      }
    }
    const ico = buildIco([16, 32, 48].map((s) => ({ size: s, data: out.find((o) => o.name === `favicon-${s}x${s}.png`)!.data })));
    files = [{ name: 'favicon.ico', data: ico }, ...out];
    q('[data-snippet]').textContent = root!.dataset.snippet!;
    q('[data-result]').hidden = false;
  }

  async function load(file: File) {
    q('[data-error]').hidden = true;
    q('[data-file]').textContent = file.name;
    try {
      if (isHeic(file)) img = await decodeImage(file);
      else {
        const im = new Image();
        await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = URL.createObjectURL(file); });
        img = im;
      }
      await render();
    } catch {
      img = null; q('[data-result]').hidden = true; q('[data-error]').hidden = false;
    }
  }

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-input]'), (fs) => { if (fs[0]) void load(fs[0]); });
  root.addEventListener('change', (e) => { if ((e.target as HTMLElement).tagName === 'SELECT') void render(); });
  q('[data-zip]').addEventListener('click', () => download(new Blob([buildZip(files)], { type: 'application/zip' }), 'favicons.zip'));
  q('[data-copy]').addEventListener('click', (e) => copy(root!.dataset.snippet!, e.currentTarget as HTMLElement));
}
