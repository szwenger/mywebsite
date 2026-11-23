import { clampSize, placeholderSvg, readableText, svgDataUri, type Spec } from './logic';
import { copy, download } from '../dom';
import { fitsCanvas } from '../image/logic';
import { canvasBlob } from '../imageio';

const root = document.querySelector<HTMLElement>('[data-placeholder]');
if (root) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const img = q<HTMLImageElement>('[data-img]');
  const err = q('[data-error]');
  let url = '';

  const spec = (): Spec => ({ w: clampSize(Number(f('w').value)), h: clampSize(Number(f('h').value)), bg: f('bg').value, fg: f('auto').checked ? readableText(f('bg').value) : f('fg').value, text: f('text').value });

  function render() {
    f('fg').disabled = f('auto').checked;
    if (f('auto').checked) f('fg').value = readableText(f('bg').value);
    err.hidden = true;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(new Blob([placeholderSvg(spec())], { type: 'image/svg+xml' }));
    img.src = url;
  }

  const name = () => `placeholder-${spec().w}x${spec().h}`;
  q('[data-svg]').addEventListener('click', () => download(new Blob([placeholderSvg(spec())], { type: 'image/svg+xml' }), `${name()}.svg`));
  q('[data-uri]').addEventListener('click', (e) => copy(svgDataUri(placeholderSvg(spec())), e.currentTarget as HTMLElement));
  q('[data-tag]').addEventListener('click', (e) => { const o = spec(); copy(`<img src="${svgDataUri(placeholderSvg(o))}" width="${o.w}" height="${o.h}" alt="">`, e.currentTarget as HTMLElement); });
  q('[data-png]').addEventListener('click', async () => {
    const o = spec();
    if (!fitsCanvas(o)) { err.hidden = false; return; }
    const c = document.createElement('canvas');
    c.width = o.w; c.height = o.h;
    const el = new Image(); // an <img> decodes an SVG blob in every browser; createImageBitmap does not in Safari
    el.src = URL.createObjectURL(new Blob([placeholderSvg(o)], { type: 'image/svg+xml' }));
    await el.decode();
    c.getContext('2d')!.drawImage(el, 0, 0, o.w, o.h);
    URL.revokeObjectURL(el.src);
    const blob = await canvasBlob(c, 'image/png');
    if (blob) download(blob, `${name()}.png`);
  });
  root.addEventListener('input', render);
  render();
}
