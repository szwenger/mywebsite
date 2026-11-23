import { download, onFiles } from '../dom';
import { accepts, fitsCanvas, isHeic, outName, type Format } from '../image/logic';
import { canvasBlob, decodeImage } from '../imageio';
import { cropRect, outSize, parseRatio, turned } from './logic';

const root = document.querySelector<HTMLElement>('[data-crop]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const preview = q<HTMLCanvasElement>('[data-preview]');
  const view = q('[data-view]');
  const box = q('[data-box]');
  const err = q('[data-error]');
  let bmp: ImageBitmap | null = null;
  let src: HTMLCanvasElement | ImageBitmap | null = null; // the image after turning
  let file = '';
  let deg = 0;
  let cx = 0.5, cy = 0.5;
  const show = (m = '') => { err.textContent = m; err.hidden = !m; };

  function ratio(): number | null {
    const v = f('ratio').value;
    return v === 'custom' ? parseRatio(f('custom').value) : v ? parseRatio(v) : null;
  }
  const rect = () => cropRect(src!.width, src!.height, ratio(), Number(f('zoom').value), cx, cy);

  function turnSource() {
    if (!bmp) return;
    if (deg === 0) { src = bmp; return; }
    const d = turned(bmp.width, bmp.height, deg);
    const c = document.createElement('canvas');
    c.width = d.w; c.height = d.h;
    const g = c.getContext('2d')!;
    g.translate(d.w / 2, d.h / 2);
    g.rotate((deg * Math.PI) / 180);
    g.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
    src = c;
  }

  function drawPreview() {
    if (!src) return;
    const k = Math.min(1, 1100 / src.width);
    preview.width = Math.max(1, Math.round(src.width * k));
    preview.height = Math.max(1, Math.round(src.height * k));
    preview.getContext('2d')!.drawImage(src, 0, 0, preview.width, preview.height);
    update();
  }

  function update() {
    if (!src) return;
    const r = rect();
    box.style.cssText = `left:${(r.x / src.width) * 100}%;top:${(r.y / src.height) * 100}%;width:${(r.w / src.width) * 100}%;height:${(r.h / src.height) * 100}%`;
    const o = outSize(r, Number(f('width').value) || undefined);
    q('[data-size]').textContent = s.size.replace('{w}', String(o.w)).replace('{h}', String(o.h));
  }

  async function load(files: File[]) {
    const img = files[0];
    if (!img) return;
    show();
    if (!accepts(img) && !isHeic(img)) { show(s.badType); return; }
    try {
      bmp = await decodeImage(img);
    } catch { show(s.failed); return; }
    if (!fitsCanvas({ w: bmp.width, h: bmp.height })) { show(s.tooBig); bmp = null; return; }
    file = img.name; deg = 0; cx = cy = 0.5;
    f('zoom').value = '1'; f('width').value = '';
    turnSource();
    q('[data-work]').hidden = false;
    q('[data-drop]').hidden = true;
    drawPreview();
  }

  const moveTo = (e: PointerEvent) => {
    const b = preview.getBoundingClientRect();
    cx = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
    cy = Math.min(1, Math.max(0, (e.clientY - b.top) / b.height));
    update();
  };
  view.addEventListener('pointerdown', (e) => { view.setPointerCapture(e.pointerId); moveTo(e); });
  view.addEventListener('pointermove', (e) => { if (view.hasPointerCapture(e.pointerId)) moveTo(e); });

  root.addEventListener('input', () => { q('[data-custom]').hidden = f('ratio').value !== 'custom'; update(); });
  const syncQuality = () => { f('quality').disabled = f('fmt').value === 'png'; }; // PNG has no quality setting; same rule as the image converter
  f('fmt').addEventListener('change', syncQuality); syncQuality();
  root.querySelectorAll<HTMLElement>('[data-turn]').forEach((b) => b.addEventListener('click', () => { deg = (deg + Number(b.dataset.turn) + 360) % 360; turnSource(); cx = cy = 0.5; drawPreview(); }));
  q('[data-other]').addEventListener('click', () => { q('[data-work]').hidden = true; q('[data-drop]').hidden = false; });

  q('[data-download]').addEventListener('click', async () => {
    if (!src) return;
    show();
    const r = rect();
    const o = outSize(r, Number(f('width').value) || undefined);
    if (!fitsCanvas(o)) { show(s.tooBig); return; }
    const fmt = f('fmt').value as Format;
    const c = document.createElement('canvas');
    c.width = o.w; c.height = o.h;
    const g = c.getContext('2d')!;
    if (fmt === 'jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, o.w, o.h); }
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, o.w, o.h);
    const blob = await canvasBlob(c, `image/${fmt}`, Number(f('quality').value) / 100);
    if (!blob || blob.type !== `image/${fmt}`) { show(s.unsupported); return; }
    download(blob, outName(file.replace(/(\.[^.]+)?$/, '-crop$1'), fmt));
  });

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-file]'), load);
}
