import { copy, download } from '../dom';
import { encode, label, toSvg, type Kind } from './logic';

const root = document.querySelector<HTMLElement>('[data-barcode]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, any>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  let svg = '';
  let text = '';

  function render() {
    const kind = f('kind').value as Kind;
    q('[data-hint]').textContent = s.hints[kind];
    const err = q('[data-error]');
    err.hidden = true;
    svg = '';
    try {
      const raw = f('text').value;
      text = label(kind, raw);
      svg = toSvg(encode(kind, raw), text, { module: Number(f('module').value), height: Number(f('height').value) });
      q('[data-preview]').innerHTML = svg; // built from our own code with the label escaped
    } catch (e) {
      err.hidden = false;
      err.textContent = s[(e as Error).message] ?? String(e);
      q('[data-preview]').replaceChildren();
    }
  }

  async function png(): Promise<Blob | null> {
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await img.decode();
    const c = document.createElement('canvas');
    // One real pixel per module is the minimum scanners need, so draw at the SVG's own size times two for crisp printing.
    c.width = img.width * 2; c.height = img.height * 2;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    return new Promise((done) => c.toBlob(done, 'image/png'));
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  q('[data-svg]').addEventListener('click', () => { if (svg) download(svg, `barcode-${text.replace(/[^\w-]+/g, '_')}.svg`, 'image/svg+xml'); });
  q('[data-png]').addEventListener('click', async () => { if (!svg) return; const b = await png(); if (b) download(b, `barcode-${text.replace(/[^\w-]+/g, '_')}.png`); });
  q('[data-copy]').addEventListener('click', (e) => { if (text) copy(text, e.currentTarget as HTMLElement, '✓'); });
  render();
}
