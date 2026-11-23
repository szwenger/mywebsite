import { exportPalette, extractPalette, sampleSize, type Swatch } from './logic';
import { copy, onFiles } from '../dom';
import { isImage } from '../image/logic';
import { decodeImage } from '../imageio';

const root = document.querySelector<HTMLElement>('[data-palette]');
if (root) init(root);

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const drop = q('[data-drop]'), input = q<HTMLInputElement>('[data-file]'), work = q('[data-work]'), err = q('[data-error]');
  const img = q<HTMLImageElement>('[data-img]'), grid = q('[data-swatches]'), count = q<HTMLInputElement>('[name=count]'), countOut = q('[data-count]');
  const kind = q<HTMLSelectElement>('[name=kind]'), text = q<HTMLTextAreaElement>('[name=export]');
  let pixels: Uint8ClampedArray | null = null;
  let swatches: Swatch[] = [];
  let url = '';

  const fail = (m: string) => { err.textContent = m; err.hidden = !m; };

  async function load(files: File[]) {
    const file = files.find(isImage);
    if (!file) { if (files.length) fail(s.badType); return; }
    try {
      const bmp = await decodeImage(file);
      const { w, h } = sampleSize(bmp.width, bmp.height);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(bmp, 0, 0, w, h);
      bmp.close();
      pixels = g.getImageData(0, 0, w, h).data;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(file);
      img.src = url; img.alt = file.name;
      fail('');
      work.hidden = false;
      render();
    } catch { fail(s.failed); }
  }

  function render() {
    if (!pixels) return;
    countOut.textContent = count.value;
    swatches = extractPalette(pixels, Number(count.value));
    grid.replaceChildren(...swatches.map((sw) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw';
      b.style.background = sw.hex; b.style.color = sw.text;
      b.title = s.copy;
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b')!.textContent = sw.hex.toUpperCase();
      b.querySelector('span')!.textContent = `${Math.round(sw.share * 100)}%`;
      b.addEventListener('click', () => void copy(sw.hex, b.querySelector<HTMLElement>('b')!, s.copied));
      return b;
    }));
    text.value = exportPalette(swatches, kind.value as 'css');
  }

  onFiles(drop, input, (f) => void load(f));
  count.addEventListener('input', render);
  kind.addEventListener('change', render);
  q('[data-copy]').addEventListener('click', (e) => void copy(text.value, e.currentTarget as HTMLElement, s.copied));
  q('[data-other]').addEventListener('click', () => input.click());
  // Pasting a screenshot works as well as dropping a file.
  document.addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files ?? [])]; if (f.length) void load(f); });
}
