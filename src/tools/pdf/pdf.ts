import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extract, imagesToPdf, loadInfo, merge, rotate } from './ops';
import { parseRanges } from './ranges';
import { oneAtATime } from './busy';

// The worker is bundled into our own assets; nothing is loaded from a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const root = document.querySelector<HTMLElement>('[data-pdf]');
if (root) init(root);

const icon = (d: string) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICONS = {
  rotate: icon('M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7'),
  del: icon('M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'),
  earlier: icon('M15 5l-7 7 7 7'),
  later: icon('M9 5l7 7-7 7'),
};

type Bytes = Uint8Array;
type Msg = Record<string, string>;

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.strings!) as Msg;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const dropEl = q('[data-drop]');
  const fileInput = q<HTMLInputElement>('[data-file]');
  const errorEl = q('[data-error]');
  const statusEl = q('[data-status]');
  const work = q('[data-work]');
  const list = q('[data-pages]');
  const rangeInput = q<HTMLInputElement>('[data-range]');
  const undoBtn = q<HTMLButtonElement>('[data-undo]');

  let doc: Bytes | null = null;
  let history: Bytes[] = [];
  let baseName = 'document';
  let pageCount = 0;
  let gen = 0; // bumped on every refresh so a stale thumbnail pass stops
  let refocus: { i: number; act: string } | null = null;

  const showError = (msg: string) => { errorEl.textContent = msg; errorEl.hidden = !msg; };

  /** Runs one operation with a busy message; any failure shows the generic "invalid" text. Clicks while busy are ignored. */
  const run = oneAtATime(async (fn: () => Promise<void>) => {
    showError('');
    statusEl.textContent = s.busy;
    root.setAttribute('aria-busy', 'true');
    try { await fn(); } catch (e) { console.error('pdf tool', e); showError(s.invalid); } finally { statusEl.textContent = ''; root.removeAttribute('aria-busy'); }
  });

  async function apply(next: Bytes) {
    if (doc) history.push(doc);
    doc = next;
    await refresh();
  }

  const range = (n: number) => [...Array(n).keys()];

  async function refresh() {
    const info = doc ? await loadInfo(doc) : { error: 'invalid' as const };
    if ('error' in info) { showError(s[info.error]); return; }
    pageCount = info.pageCount;
    undoBtn.disabled = history.length === 0;
    work.hidden = false;
    const token = ++gen;
    list.replaceChildren(...range(pageCount).map(card));
    if (refocus) { list.querySelector<HTMLElement>(`[data-i="${refocus.i}"] [data-act="${refocus.act}"]`)?.focus(); refocus = null; }
    await thumbnails(token);
  }

  // ponytail: renders every page up front; add lazy rendering (IntersectionObserver) if big PDFs feel slow.
  async function thumbnails(token: number) {
    const task = pdfjs.getDocument({ data: doc!.slice() }); // slice: the worker takes ownership of the buffer
    const pdf = await task.promise;
    try {
      const canvases = list.querySelectorAll('canvas');
      for (let i = 0; i < pageCount && token === gen; i++) {
        try {
          const page = await pdf.getPage(i + 1);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: 240 / base.width });
          const canvas = canvases[i];
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
        } catch { /* leave this thumbnail blank; the page is still usable */ }
      }
    } finally { void task.destroy(); }
  }

  const move = (from: number, to: number) => {
    const order = range(pageCount);
    order.splice(to, 0, ...order.splice(from, 1));
    return order;
  };

  function card(i: number) {
    const li = document.createElement('li');
    li.className = 'pg';
    li.dataset.i = String(i);
    li.draggable = true;
    const label = `${s.page} ${i + 1}`;
    li.innerHTML = `<canvas width="240" height="320" aria-label="${label}" role="img"></canvas><div class="num">${label}</div><div class="tools"></div>`;
    const tools = li.querySelector('.tools')!;
    const acts: [string, string, boolean, () => Promise<Bytes>][] = [
      ['earlier', ICONS.earlier, i === 0, () => extract(doc!, move(i, i - 1))],
      ['later', ICONS.later, i === pageCount - 1, () => extract(doc!, move(i, i + 1))],
      ['rotate', ICONS.rotate, false, () => rotate(doc!, [i], 90)],
      ['del', ICONS.del, pageCount === 1, () => extract(doc!, range(pageCount).filter((p) => p !== i))],
    ];
    for (const [act, svg, off, op] of acts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.act = act;
      b.disabled = off;
      b.title = b.ariaLabel = `${s[act]}: ${label}`;
      b.innerHTML = svg;
      b.addEventListener('click', () => {
        refocus = act === 'earlier' ? { i: i - 1, act } : act === 'later' ? { i: i + 1, act } : { i: act === 'del' ? Math.min(i, pageCount - 2) : i, act };
        run(async () => apply(await op()));
      });
      tools.append(b);
    }
    li.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('text/plain', String(i)); li.classList.add('dragging'); });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', (e) => { if (!e.dataTransfer?.types.includes('Files')) { e.preventDefault(); li.classList.add('target'); } });
    li.addEventListener('dragleave', () => li.classList.remove('target'));
    li.addEventListener('drop', (e) => {
      li.classList.remove('target');
      const from = Number(e.dataTransfer?.getData('text/plain'));
      if (e.dataTransfer?.types.includes('Files') || Number.isNaN(from) || from === i) return;
      e.preventDefault();
      run(async () => apply(await extract(doc!, move(from, i))));
    });
    return li;
  }

  // ---- adding files ----
  const kind = (f: File) => {
    const n = f.name.toLowerCase();
    if (f.type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
    if (f.type === 'image/png' || n.endsWith('.png')) return 'image/png';
    if (f.type === 'image/jpeg' || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
    return null;
  };

  async function addFiles(files: File[]) {
    await run(async () => {
      const parts: Bytes[] = [];
      const problems: string[] = [];
      for (const f of files) {
        const k = kind(f);
        const bytes = new Uint8Array(await f.arrayBuffer());
        if (!k) { problems.push(`${f.name}: ${s.badType}`); continue; }
        if (k === 'pdf') {
          const info = await loadInfo(bytes);
          if ('error' in info) problems.push(`${f.name}: ${s[info.error]}`);
          else parts.push(bytes);
        } else {
          try { parts.push(await imagesToPdf([{ bytes, type: k }])); } catch { problems.push(`${f.name}: ${s.badImage}`); }
        }
      }
      showError(problems.join(' '));
      if (!parts.length) return;
      if (!doc) baseName = (files.find((f) => kind(f))?.name ?? 'document').replace(/\.[^.]+$/, '');
      await apply(doc || parts.length > 1 ? await merge(doc ? [doc, ...parts] : parts) : parts[0]);
    });
  }

  fileInput.addEventListener('change', () => { addFiles([...fileInput.files!]); fileInput.value = ''; });
  dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('over'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
  dropEl.addEventListener('drop', (e) => { e.preventDefault(); dropEl.classList.remove('over'); addFiles([...(e.dataTransfer?.files ?? [])]); });

  // ---- toolbar ----
  q('[data-keep]').addEventListener('click', () => {
    const r = parseRanges(rangeInput.value, pageCount);
    if ('error' in r) { showError(s[r.error]); return; }
    run(async () => apply(await extract(doc!, r.pages)));
  });
  undoBtn.addEventListener('click', () => run(async () => { doc = history.pop()!; await refresh(); }));
  q('[data-reset]').addEventListener('click', () => {
    doc = null; history = []; gen++; list.replaceChildren(); work.hidden = true; rangeInput.value = ''; showError('');
  });
  q('[data-download]').addEventListener('click', () => {
    if (!doc) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([doc], { type: 'application/pdf' }));
    a.download = `${baseName}-edited.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}
