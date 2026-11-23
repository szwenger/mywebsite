import { accepts, fitsCanvas, isHeic, outName, targetSize, type Format } from './logic';
import { iconButton, iconSvg, onFiles } from '../dom';
import { canvasBlob, decodeImage } from '../imageio';

const root = document.querySelector<HTMLElement>('[data-image]');
if (root) init(root);

type Msg = Record<string, string>;
interface Item {
  file: File;
  url?: string;
  name?: string;
  size?: number;
  note?: string; // why this file has no result
}

const LABEL: Record<Format, string> = { png: 'PNG', jpeg: 'JPG', webp: 'WebP' };

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.strings!) as Msg;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const dropEl = q('[data-drop]');
  const fileInput = q<HTMLInputElement>('[data-file]');
  const errorEl = q('[data-error]');
  const statusEl = q('[data-status]');
  const work = q('[data-work]');
  const list = q('[data-list]');
  const options = q<HTMLElement>('[data-options]');
  const formatEl = q<HTMLSelectElement>('[data-format]');
  const qualityEl = q<HTMLInputElement>('[data-quality]');
  const qualityOut = q('[data-quality-out]');
  const maxWEl = q<HTMLInputElement>('[data-maxw]');
  const maxHEl = q<HTMLInputElement>('[data-maxh]');
  const allBtn = q<HTMLButtonElement>('[data-all]');
  const heicMode = root.hasAttribute('data-heic');

  let items: Item[] = [];
  let gen = 0; // bumped on every conversion run so a stale run stops

  const size = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} ${s.kb}` : `${(n / 1048576).toFixed(1)} ${s.mb}`);
  const limit = (el: HTMLInputElement) => { const n = Math.floor(Number(el.value)); return n >= 1 ? n : undefined; };
  const showError = (msg: string) => { errorEl.textContent = msg; errorEl.hidden = !msg; };

  // An unsupported export type silently falls back to PNG, so probe each format once on a 1×1 canvas.
  const support = new Map<Format, Promise<boolean>>();
  const canExport = (fmt: Format) => {
    if (!support.has(fmt)) {
      support.set(fmt, new Promise((done) => {
        const c = document.createElement('canvas');
        c.width = c.height = 1;
        c.toBlob((b) => done(b?.type === `image/${fmt}`), `image/${fmt}`);
      }));
    }
    return support.get(fmt)!;
  };

  /** Draws the file into a canvas at the target size and encodes it, or says why it cannot. */
  async function convert(file: File, fmt: Format, quality: number, maxW?: number, maxH?: number): Promise<Blob | 'unsupported' | 'too-big'> {
    if (!(await canExport(fmt))) return 'unsupported';
    const bmp = await decodeImage(file);
    try {
      const size = targetSize(bmp.width, bmp.height, maxW, maxH);
      if (!fitsCanvas(size)) return 'too-big';
      const { w, h } = size;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'too-big'; // the browser refused a canvas this size
      if (fmt === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); } // JPEG has no transparency
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob = await canvasBlob(canvas, `image/${fmt}`, quality);
      return blob ?? 'too-big'; // the format works (probed above), so a null blob means the canvas was too large
    } finally { bmp.close(); }
  }

  function revoke() { for (const it of items) if (it.url) URL.revokeObjectURL(it.url); }

  async function run() {
    if (!items.length) return;
    const token = ++gen;
    const fmt = formatEl.value as Format;
    const quality = Number(qualityEl.value) / 100;
    const [maxW, maxH] = [limit(maxWEl), limit(maxHEl)];
    statusEl.textContent = s.working;
    for (const it of items) {
      if (token !== gen) return;
      if (it.url) URL.revokeObjectURL(it.url);
      it.url = it.name = it.size = it.note = undefined;
      try {
        const blob = await convert(it.file, fmt, quality, maxW, maxH);
        if (blob instanceof Blob) { it.url = URL.createObjectURL(blob); it.name = outName(it.file.name, fmt); it.size = blob.size; }
        else it.note = blob === 'unsupported' ? s.unsupported.replace('{fmt}', LABEL[fmt]) : s.tooBig;
      } catch (e) {
        console.error('image tool', e);
        it.note = s.failed;
      }
      if (token === gen) render();
    }
    if (token === gen) statusEl.textContent = '';
  }

  function render() {
    work.hidden = !items.length;
    allBtn.disabled = !items.some((it) => it.url);
    list.replaceChildren(...items.map((it, i) => {
      const li = document.createElement('li');
      li.className = 'row card';
      const name = document.createElement('span');
      name.className = 'fname';
      name.textContent = it.file.name;
      const info = document.createElement('span');
      info.className = 'meta info';
      const act = document.createElement('span');
      act.className = 'act';
      if (it.url) {
        info.textContent = `${size(it.file.size)} → ${size(it.size!)}`;
        const a = document.createElement('a');
        a.className = 'btn ib';
        a.href = it.url;
        a.download = it.name!;
        a.innerHTML = `<span class="glyph">${iconSvg('download')}</span>`;
        a.setAttribute('aria-label', `${s.download}: ${it.name}`);
        act.append(a);
      } else {
        info.textContent = it.note ?? s.working;
      }
      const rm = iconButton('close', `${s.remove}: ${it.file.name}`);
      rm.addEventListener('click', () => { if (it.url) URL.revokeObjectURL(it.url); items.splice(i, 1); render(); });
      act.append(rm);
      li.append(name, info, act);
      return li;
    }));
  }

  function addFiles(files: File[]) {
    const problems: string[] = [];
    for (const f of files) {
      if (accepts(f) || (heicMode && isHeic(f))) items.push({ file: f });
      else problems.push(`${f.name}: ${s.badType}`);
    }
    showError(problems.join(' '));
    render();
    run();
  }

  const syncQuality = () => { qualityEl.disabled = formatEl.value === 'png'; qualityOut.textContent = `${qualityEl.value}%`; };
  syncQuality();
  qualityEl.addEventListener('input', syncQuality);
  // 'change' (not 'input') so typing a number or dragging the slider converts once, on commit.
  options.addEventListener('change', () => { syncQuality(); run(); });

  onFiles(dropEl, fileInput, addFiles, { paste: true });

  q('[data-clear]').addEventListener('click', () => { gen++; revoke(); items = []; showError(''); statusEl.textContent = ''; render(); });
  allBtn.addEventListener('click', async () => {
    // Sequential clicks on the per-file links; browsers may ask once to allow multiple downloads.
    for (const a of list.querySelectorAll<HTMLAnchorElement>('a[download]')) {
      a.click();
      await new Promise((r) => setTimeout(r, 300));
    }
  });
}
