import type { Ctx } from './pdf';
import { extract } from './ops';
import { closePdf, openPdf, renderPage } from './raster';

type Bytes = Uint8Array;

/** Draws the first `n` pages of a file about `px` pixels wide. */
export async function drawPages(bytes: Bytes, n: number, px = 200): Promise<HTMLCanvasElement[]> {
  const pdf = await openPdf(bytes);
  try {
    const out: HTMLCanvasElement[] = [];
    for (let i = 1; i <= Math.min(n, pdf.numPages); i++) {
      const page = await pdf.getPage(i);
      out.push(await renderPage(page, (72 * px) / page.getViewport({ scale: 1 }).width));
    }
    return out;
  } finally { closePdf(pdf); }
}

export interface PreviewSpec {
  /** `data-prev="<slot>"` inside the panel is where the preview goes. */
  slot: string;
  /** Control names that change the result; leave out to react to every control (e.g. file inputs have no name). */
  watch: string[];
  /** How many pages the operation needs from the document, starting at the current page (default 1). */
  take?: () => number;
  /** How many pages of the result to show (default 1). */
  show?: number;
  /** Receives the sample pages and the 0-based index of the first one; returns the result, or null for "nothing to show". */
  build: (sample: Bytes, at: number) => Promise<Bytes | null>;
}

/**
 * A small before/after picture for a tool that changes pages. It works on the first selected page (or page 1),
 * runs the same code as the real button on just those pages, and redraws a moment after any control changes.
 */
export function preview(c: Ctx, panel: HTMLElement, spec: PreviewSpec): void {
  const host = panel.querySelector<HTMLElement>(`[data-prev="${spec.slot}"]`);
  if (!host) return;
  let tick = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const figure = (caption: string, canvases: HTMLCanvasElement[], bytes: Bytes) => {
    const f = document.createElement('figure');
    const pics = document.createElement('button');
    pics.type = 'button';
    pics.className = 'pzoom';
    pics.title = `${c.s.enlarge}: ${caption}`;
    pics.append(...canvases);
    pics.addEventListener('click', () => c.view(caption, () => drawPages(bytes, spec.show ?? 1, 1600)));
    f.append(pics, Object.assign(document.createElement('figcaption'), { textContent: caption }));
    return f;
  };

  async function draw() {
    const mine = ++tick;
    if (panel.hidden || !c.pageCount()) { host!.hidden = true; return; }
    try {
      const at = c.target()[0] ?? 0;
      const count = Math.max(1, Math.min(spec.take?.() ?? 1, c.pageCount() - at));
      const sample = await extract(c.doc(), Array.from({ length: count }, (_, k) => at + k));
      const out = await spec.build(sample, at);
      if (!out) { if (mine === tick) host!.hidden = true; return; }
      const [a, b] = await Promise.all([drawPages(sample, spec.show ?? 1), drawPages(out, spec.show ?? 1)]);
      if (mine !== tick) return;
      host!.replaceChildren(figure(c.s.before, a, sample), Object.assign(document.createElement('span'), { className: 'arrow', textContent: '→', ariaHidden: 'true' }), figure(c.s.after, b, out));
      host!.hidden = false;
    } catch (e) {
      console.error('pdf preview', e);
      if (mine === tick) host!.hidden = true;
    }
  }

  const later = (e?: Event) => {
    const name = (e?.target as HTMLInputElement | undefined)?.name;
    if (e && name && !spec.watch.includes(name)) return;
    clearTimeout(timer);
    timer = setTimeout(() => void draw(), 300);
  };
  panel.addEventListener('input', later);
  panel.addEventListener('change', later);
  c.onChange(() => later());
  c.onTab(() => later());
}
