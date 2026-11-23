import { download, iconButton, onFiles } from '../dom';
import { fitsCanvas, isImage, type Format } from '../image/logic';
import { canvasBlob, decodeImage } from '../imageio';
import { zip } from '../zip';
import { gridRects, stitchLayout, tileName } from './logic';

const root = document.querySelector<HTMLElement>('[data-tiles]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const preview = q<HTMLCanvasElement>('[data-preview]');
  const go = q<HTMLButtonElement>('[data-go]');
  const err = q('[data-error]');
  const mode = () => q<HTMLInputElement>('[name="mode"]:checked').value;
  const fmt = () => f('fmt').value as Format;
  const ext = () => (fmt() === 'jpeg' ? 'jpg' : fmt());
  let single: { name: string; bmp: ImageBitmap } | null = null;
  let parts: { name: string; bmp: ImageBitmap }[] = [];
  const show = (m = '') => { err.textContent = m; err.hidden = !m; };
  const num = (n: string, d: number) => { const v = Math.floor(Number(f(n).value)); return Number.isFinite(v) && v >= 0 ? v : d; };

  const stitchPlan = () => stitchLayout(parts.map((p) => ({ w: p.bmp.width, h: p.bmp.height })), f('dir').value as 'h', num('gap', 0), f('match').checked);

  function draw() {
    const m = mode();
    go.textContent = m === 'split' ? s.zip : s.save;
    const ready = m === 'split' ? !!single : parts.length > 0;
    go.disabled = !ready; preview.hidden = !ready;
    q('[data-size]').textContent = '';
    if (!ready) return;
    const g = preview.getContext('2d')!;
    if (m === 'split') {
      const { bmp } = single!;
      const k = Math.min(1, 900 / bmp.width);
      preview.width = Math.round(bmp.width * k); preview.height = Math.round(bmp.height * k);
      g.drawImage(bmp, 0, 0, preview.width, preview.height);
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.shadowColor = '#000'; g.shadowBlur = 3;
      const rects = gridRects(bmp.width, bmp.height, num('cols', 3), num('rows', 1));
      for (const r of rects) g.strokeRect(r.x * k, r.y * k, r.w * k, r.h * k);
      q('[data-size]').textContent = s.tile.replace('{w}', String(rects[0].w)).replace('{h}', String(rects[0].h));
    } else {
      const plan = stitchPlan();
      const k = Math.min(1, 900 / Math.max(plan.w, 1));
      preview.width = Math.max(1, Math.round(plan.w * k)); preview.height = Math.max(1, Math.round(plan.h * k));
      g.fillStyle = f('bg').value; g.fillRect(0, 0, preview.width, preview.height);
      plan.items.forEach((r, i) => g.drawImage(parts[i].bmp, r.x * k, r.y * k, r.w * k, r.h * k));
      q('[data-size]').textContent = s.result.replace('{w}', String(plan.w)).replace('{h}', String(plan.h));
    }
  }

  async function decode(files: File[]): Promise<{ name: string; bmp: ImageBitmap }[]> {
    const out: { name: string; bmp: ImageBitmap }[] = [];
    for (const file of files.filter(isImage)) {
      try { out.push({ name: file.name, bmp: await decodeImage(file) }); } catch { show(s.failed); }
    }
    return out;
  }

  function renderList() {
    q('[data-list]').replaceChildren(...parts.map((p, i) => {
      const box = document.createElement('div');
      box.className = 'thumb';
      const c = document.createElement('canvas');
      c.width = 84; c.height = 64;
      const k = Math.min(84 / p.bmp.width, 64 / p.bmp.height);
      const w = p.bmp.width * k, h = p.bmp.height * k;
      c.getContext('2d')!.drawImage(p.bmp, (84 - w) / 2, (64 - h) / 2, w, h);
      c.style.cssText = 'width:84px;height:64px;border:0;background:none';
      const ctl = document.createElement('div');
      ctl.className = 'ctl';
      const move = (by: number) => () => { const j = i + by; if (j < 0 || j >= parts.length) return; [parts[i], parts[j]] = [parts[j], parts[i]]; renderList(); draw(); };
      const prev = iconButton('prev', s.earlier, true), next = iconButton('next', s.later, true), del = iconButton('trash', s.remove, true);
      prev.addEventListener('click', move(-1)); next.addEventListener('click', move(1));
      del.addEventListener('click', () => { parts.splice(i, 1); renderList(); draw(); });
      ctl.append(prev, next, del);
      box.append(c, ctl);
      return box;
    }));
  }

  async function save(c: HTMLCanvasElement): Promise<Blob | null> {
    const blob = await canvasBlob(c, `image/${fmt()}`, Number(f('quality').value) / 100);
    if (!blob || blob.type !== `image/${fmt()}`) { show(s.unsupported); return null; }
    return blob;
  }

  go.addEventListener('click', async () => {
    show();
    go.disabled = true;
    try {
      if (mode() === 'split' && single) {
        const { bmp, name } = single;
        const rects = gridRects(bmp.width, bmp.height, num('cols', 3), num('rows', 1));
        const files: { name: string; data: Uint8Array }[] = [];
        for (const [i, r] of rects.entries()) {
          const c = document.createElement('canvas');
          c.width = r.w; c.height = r.h;
          const g = c.getContext('2d')!;
          if (fmt() === 'jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, r.w, r.h); }
          g.drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
          const blob = await save(c);
          if (!blob) return;
          files.push({ name: tileName(name, i, Math.min(bmp.width, num('cols', 3)) || 1, ext()), data: new Uint8Array(await blob.arrayBuffer()) });
        }
        download(new Blob([zip(files)], { type: 'application/zip' }), `${name.replace(/\.[^.]+$/, '')}-tiles.zip`);
      } else if (parts.length) {
        const plan = stitchPlan();
        if (!fitsCanvas(plan)) { show(s.tooBig); return; }
        const c = document.createElement('canvas');
        c.width = plan.w; c.height = plan.h;
        const g = c.getContext('2d')!;
        g.fillStyle = f('bg').value; g.fillRect(0, 0, c.width, c.height);
        g.imageSmoothingQuality = 'high';
        plan.items.forEach((r, i) => g.drawImage(parts[i].bmp, r.x, r.y, r.w, r.h));
        const blob = await save(c);
        if (blob) download(blob, `stitched.${ext()}`);
      }
    } finally { draw(); }
  });

  onFiles(q('[data-drop="split"]'), q<HTMLInputElement>('[data-input="split"]'), async (files) => {
    show();
    const [first] = await decode(files.slice(0, 1));
    if (first) { single = first; draw(); }
  }, { paste: true });
  onFiles(q('[data-drop="stitch"]'), q<HTMLInputElement>('[data-input="stitch"]'), async (files) => {
    show();
    parts = parts.concat(await decode(files));
    renderList(); draw();
  });
  root.addEventListener('change', () => { root!.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => { el.hidden = el.dataset.when !== mode(); }); q<HTMLInputElement>('[name="quality"]').disabled = fmt() === 'png'; draw(); });
  root.addEventListener('input', draw);
  q<HTMLInputElement>('[name="quality"]').disabled = true;
  draw();
}
