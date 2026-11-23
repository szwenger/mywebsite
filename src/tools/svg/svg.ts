import { looksLikeSvg, minifySvg, outputSize, svgSize } from './logic';
import { copy, download, onFiles } from '../dom';

const root = document.querySelector<HTMLElement>('[data-svg]');
if (root) init(root);

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (name: string) => q<HTMLInputElement & HTMLSelectElement>(`[name=${name}]`);
  const src = q<HTMLTextAreaElement>('[name=src]'), prev = q<HTMLImageElement>('[data-prev]'), err = q('[data-error]'), info = q('[data-info]');
  const result = q<HTMLTextAreaElement>('[name=min]'), saved = q('[data-saved]'), minBox = q('[data-minbox]');
  let url = '';
  let name = 'image';

  const fail = (m: string) => { err.textContent = m; err.hidden = !m; };
  const kb = (n: number) => `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;

  function preview() {
    if (url) URL.revokeObjectURL(url);
    url = '';
    minBox.hidden = true;
    const text = src.value;
    if (!text.trim()) { prev.removeAttribute('src'); info.textContent = ''; fail(''); return; }
    if (!looksLikeSvg(text)) { prev.removeAttribute('src'); info.textContent = ''; fail(s.notSvg); return; }
    fail('');
    // An <img> never runs scripts in an SVG, so this is safe to show.
    url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    prev.src = url;
    const sz = svgSize(text);
    info.textContent = sz ? `${Math.round(sz.w)} × ${Math.round(sz.h)} px · ${kb(new Blob([text]).size)}` : kb(new Blob([text]).size);
  }

  async function raster() {
    const text = src.value;
    if (!looksLikeSvg(text)) { fail(s.notSvg); return; }
    const img = new Image();
    const u = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    try {
      img.src = u;
      await img.decode();
      const size = svgSize(text) ?? { w: img.naturalWidth || 300, h: img.naturalHeight || 150 };
      const { w, h } = outputSize(size, Number(f('width').value) || undefined, Number(f('scale').value));
      if (w * h > 16_777_216) { fail(s.tooBig); return; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d')!;
      const fmt = f('fmt').value;
      if (f('bg').checked || fmt === 'jpeg') { g.fillStyle = f('bgcolor').value; g.fillRect(0, 0, w, h); }
      g.drawImage(img, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((done) => c.toBlob(done, `image/${fmt}`, 0.92));
      if (!blob || blob.type !== `image/${fmt}`) { fail(s.unsupported); return; }
      fail('');
      download(blob, `${name}.${fmt === 'jpeg' ? 'jpg' : fmt}`);
    } catch { fail(s.failed); } finally { URL.revokeObjectURL(u); }
  }

  function minify() {
    if (!looksLikeSvg(src.value)) { fail(s.notSvg); return; }
    fail('');
    const out = minifySvg(src.value, { precision: Number(f('precision').value), keepTitle: f('keeptitle').checked });
    const [a, b] = [new Blob([src.value]).size, new Blob([out]).size];
    result.value = out;
    saved.textContent = a ? `${kb(a)} → ${kb(b)} (${b <= a ? '−' : '+'}${Math.abs(Math.round((1 - b / a) * 100))}%)` : '';
    minBox.hidden = false;
  }

  async function load(files: File[]) {
    const file = files.find((x) => x.type === 'image/svg+xml' || /\.svg$/i.test(x.name));
    if (!file) { if (files.length) fail(s.notSvg); return; }
    name = file.name.replace(/\.svg$/i, '') || 'image';
    src.value = await file.text();
    preview();
  }

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-file]'), (x) => void load(x));
  src.addEventListener('input', preview);
  q('[data-raster]').addEventListener('click', () => void raster());
  q('[data-minify]').addEventListener('click', minify);
  q('[data-copy]').addEventListener('click', (e) => void copy(result.value, e.currentTarget as HTMLElement, s.copied));
  q('[data-save]').addEventListener('click', () => download(result.value, `${name}.min.svg`, 'image/svg+xml'));
  f('bg').addEventListener('change', () => { f('bgcolor').disabled = !f('bg').checked && f('fmt').value !== 'jpeg'; });
  f('fmt').addEventListener('change', () => { f('bgcolor').disabled = !f('bg').checked && f('fmt').value !== 'jpeg'; });
  f('bgcolor').disabled = true;
}
