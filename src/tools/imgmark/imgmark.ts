import { anchor, fontSize, logoSize, markedName, tiles, type Pos } from './logic';
import { download, onFiles } from '../dom';
import { zip } from '../zip';

const root = document.querySelector<HTMLElement>('[data-mark]');
if (root) init(root);

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (name: string) => q<HTMLInputElement & HTMLSelectElement>(`[name=${name}]`);
  const work = q('[data-work]'), canvas = q<HTMLCanvasElement>('[data-canvas]'), err = q('[data-error]'), list = q('[data-list]'), status = q('[data-status]');
  let files: File[] = [];
  let first: ImageBitmap | null = null;
  let logo: ImageBitmap | null = null;
  let timer = 0;

  const fail = (m: string) => { err.textContent = m; err.hidden = !m; };
  const mode = () => (root.querySelector<HTMLInputElement>('[name=kind]:checked')?.value ?? 'text');
  const pos = () => (root.querySelector<HTMLInputElement>('[name=pos]:checked')?.value ?? 'br') as Pos;

  /** Draws the mark onto a canvas of size w × h that already holds the picture. Everything scales with w, so preview and export match. */
  function paint(g: CanvasRenderingContext2D, w: number, h: number) {
    const opacity = Number(f('opacity').value) / 100;
    const margin = Math.round((w * Number(f('margin').value)) / 100);
    const angle = (Number(f('angle').value) * Math.PI) / 180;
    const percent = Number(f('size').value);
    const tile = f('tile').checked;
    let mw = 0, mh = 0;
    let draw: (x: number, y: number) => void;
    if (mode() === 'logo') {
      if (!logo) return;
      ({ w: mw, h: mh } = logoSize(w, h, logo.width, logo.height, percent));
      draw = (x, y) => g.drawImage(logo!, x, y, mw, mh);
    } else {
      const text = f('text').value;
      if (!text.trim()) return;
      const px = fontSize(w, percent, text.length);
      g.font = `600 ${px}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      mw = Math.ceil(g.measureText(text).width); mh = Math.ceil(px * 1.2);
      g.textBaseline = 'middle';
      const shadow = f('shadow').checked;
      draw = (x, y) => {
        if (shadow) { g.fillStyle = '#000'; g.fillText(text, x + px * 0.04, y + mh / 2 + px * 0.04); }
        g.fillStyle = f('color').value;
        g.fillText(text, x, y + mh / 2);
      };
    }
    const spots = tile ? tiles(w, h, mw, mh, Math.round(mw * 0.6), true) : [anchor(pos(), w, h, mw, mh, margin)];
    g.save();
    g.globalAlpha = opacity;
    for (const p of spots) {
      g.save();
      g.translate(p.x + mw / 2, p.y + mh / 2);
      g.rotate(angle);
      g.translate(-(p.x + mw / 2), -(p.y + mh / 2));
      draw(p.x, p.y);
      g.restore();
    }
    g.restore();
  }

  function preview() {
    if (!first) return;
    const k = Math.min(1, 900 / first.width);
    canvas.width = Math.round(first.width * k); canvas.height = Math.round(first.height * k);
    const g = canvas.getContext('2d')!;
    g.drawImage(first, 0, 0, canvas.width, canvas.height);
    paint(g, canvas.width, canvas.height);
  }
  const later = () => { clearTimeout(timer); timer = window.setTimeout(preview, 60); };

  async function setFiles(next: File[]) {
    const ok = next.filter((x) => x.type.startsWith('image/'));
    if (next.length && !ok.length) { fail(s.badType); return; }
    fail('');
    files = ok;
    list.textContent = files.map((x) => x.name).join(', ');
    first?.close();
    try { first = await createImageBitmap(files[0]); } catch { first = null; fail(s.failed); return; }
    work.hidden = false;
    preview();
  }

  async function save() {
    if (!files.length) return;
    fail('');
    const out: { name: string; data: Uint8Array }[] = [];
    for (const [i, file] of files.entries()) {
      status.textContent = `${i + 1} / ${files.length}`;
      try {
        const bmp = await createImageBitmap(file);
        if (bmp.width * bmp.height > 16_777_216) { fail(`${file.name}: ${s.tooBig}`); bmp.close(); continue; }
        const c = document.createElement('canvas');
        c.width = bmp.width; c.height = bmp.height;
        const g = c.getContext('2d')!;
        g.drawImage(bmp, 0, 0);
        paint(g, c.width, c.height);
        bmp.close();
        const type = ['image/jpeg', 'image/webp'].includes(file.type) ? file.type : 'image/png';
        const blob = await new Promise<Blob | null>((done) => c.toBlob(done, type, 0.92));
        if (!blob) { fail(`${file.name}: ${s.failed}`); continue; }
        out.push({ name: markedName(file.name, type === 'image/jpeg' ? 'jpg' : type.slice(6)), data: new Uint8Array(await blob.arrayBuffer()) });
      } catch { fail(`${file.name}: ${s.failed}`); }
    }
    status.textContent = '';
    if (out.length === 1) download(new Blob([out[0].data]), out[0].name);
    else if (out.length) download(new Blob([zip(out)], { type: 'application/zip' }), 'marked-images.zip');
  }

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-file]'), (x) => void setFiles(x));
  const logoInput = q<HTMLInputElement>('[data-logo]');
  logoInput.addEventListener('change', async () => {
    const file = logoInput.files?.[0];
    if (!file) return;
    try { logo?.close(); logo = await createImageBitmap(file); (root.querySelector('[name=kind][value=logo]') as HTMLInputElement).checked = true; sync(); preview(); } catch { fail(s.failed); }
  });
  const sync = () => { const logoMode = mode() === 'logo'; q('[data-text-opts]').hidden = logoMode; q('[data-logo-opts]').hidden = !logoMode; };
  root.addEventListener('input', () => { sync(); later(); });
  root.addEventListener('change', () => { sync(); later(); });
  q('[data-save]').addEventListener('click', () => void save());
  sync();
}
