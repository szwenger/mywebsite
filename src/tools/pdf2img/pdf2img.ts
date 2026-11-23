import { download, onFiles } from '../dom';
import { parseRanges } from '../pdf/ranges';
import { isPasswordError, openPdf, type PdfDoc } from '../pdf/raster';
import { zip } from '../zip';
import { renderImages } from './export';
import type { ImageFmt } from './logic';

const root = document.querySelector<HTMLElement>('[data-p2i]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const err = q('[data-error]');
  const status = q('[data-status]');
  let name = 'document';
  let pdf: PdfDoc | null = null;
  let made: { name: string; data: Uint8Array }[] = [];
  let run = 0;

  const show = (msg = '') => { err.textContent = msg; err.hidden = !msg; };
  const urls: string[] = [];

  async function open(file: File, password?: string) {
    show();
    const data = new Uint8Array(await file.arrayBuffer());
    try {
      pdf = await openPdf(data, password);
      name = file.name;
      q('[data-unlock]').hidden = true;
      q('[data-options]').hidden = false;
      q('[data-results]').hidden = true;
      status.textContent = '';
    } catch (e) {
      q('[data-options]').hidden = true;
      if (isPasswordError(e)) {
        q('[data-unlock]').hidden = false;
        pendingFile = file;
        show(password ? s.wrongPw : s.password);
      } else show(s.invalid);
    }
  }
  let pendingFile: File | null = null;

  async function convert() {
    if (!pdf) return;
    show();
    const r = f('range').value.trim() ? parseRanges(f('range').value, pdf.numPages) : { pages: [...Array(pdf.numPages).keys()] };
    if ('error' in r) { show(s[r.error]); return; }
    const dpi = Number(f('dpi').value);
    const mine = ++run;
    const go = q<HTMLButtonElement>('[data-go]');
    go.disabled = true;
    made = [];
    urls.splice(0).forEach(URL.revokeObjectURL);
    const list = q('[data-list]');
    list.replaceChildren();
    q('[data-results]').hidden = false;
    try {
      const capped = await renderImages(pdf, { fmt: f('fmt').value as ImageFmt, dpi, quality: Number(f('quality').value) / 100, name, pages: r.pages }, async (img) => {
        if (mine !== run) return false;
        made.push({ name: img.name, data: new Uint8Array(await img.blob.arrayBuffer()) });
        const url = URL.createObjectURL(img.blob);
        urls.push(url);
        const li = document.createElement('li');
        const pic = Object.assign(new Image(), { src: url, alt: img.name });
        const nm = Object.assign(document.createElement('span'), { className: 'nm', textContent: img.name });
        const a = Object.assign(document.createElement('a'), { className: 'btn alt', href: url, download: img.name, textContent: s.save });
        li.append(pic, nm, a);
        list.append(li);
      }, (k, n) => { status.textContent = s.working.replace('{n}', String(k)).replace('{t}', String(n)); });
      if (mine === run) status.textContent = s.done.replace('{n}', String(made.length)) + (capped ? ` ${s.capped.replace('{d}', String(capped))}` : '');
    } catch (e) { show((e as Error).message === 'unsupported' ? s.unsupported : s.invalid); } finally { go.disabled = false; }
  }

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-file]'), (files) => { const p = files.find((x) => /pdf$/i.test(x.name) || x.type === 'application/pdf'); if (p) open(p); });
  q('[data-unlock]').addEventListener('submit', (e) => { e.preventDefault(); if (pendingFile) open(pendingFile, f('pw').value); });
  q('[data-go]').addEventListener('click', convert);
  q('[data-zip]').addEventListener('click', () => { if (made.length) download(new Blob([zip(made)], { type: 'application/zip' }), `${name.replace(/\.pdf$/i, '')}-images.zip`); });
  const syncQuality = () => { f('quality').disabled = f('fmt').value === 'png'; };
  f('fmt').addEventListener('change', syncQuality); syncQuality();
  f('quality').addEventListener('input', () => { q('[data-q-out]').textContent = f('quality').value; });
}
