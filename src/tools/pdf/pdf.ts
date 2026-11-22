import { extract, imagesToPdf, loadInfo, merge, rotate } from './ops';
import { parseRanges } from './ranges';
import { oneAtATime } from './busy';
import { closePdf, isPasswordError, openPdf, renderPage, type PdfDoc } from './raster';
import { pagesToImagePdf, makeTextRenderer } from './rasterize';
import { sortable } from './sortable';
import { unlock } from './crypt';
import { initPanels } from './panels';
import { initEditor } from './editor';
import { initViewer } from './viewer';

const icon = (d: string) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICONS = {
  rotate: icon('M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7'),
  del: icon('M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'),
  earlier: icon('M15 5l-7 7 7 7'),
  later: icon('M9 5l7 7-7 7'),
  grip: icon('M9 5v.01M15 5v.01M9 12v.01M15 12v.01M9 19v.01M15 19v.01'),
};

type Bytes = Uint8Array;
type Msg = Record<string, string>;

export interface Ctx {
  s: Msg;
  root: HTMLElement;
  q<T extends HTMLElement>(sel: string): T;
  doc(): Bytes;
  pageCount(): number;
  baseName(): string;
  /** 0-based indexes of the selected pages, or every page when none is selected. */
  target(): number[];
  selected(): number[];
  /** Replace the document. `map[j]` says which old page the new page j came from (so its thumbnail and selection can be kept). */
  apply(next: Bytes, map?: (number | null)[]): Promise<void>;
  run(fn: () => Promise<void>): Promise<boolean>;
  error(msg: string): void;
  status(msg: string): void;
  progress(i: number, n: number): void;
  save(data: Bytes | Blob, name: string, type: string): void;
  render: ReturnType<typeof makeTextRenderer>;
  pdf(): Promise<PdfDoc>;
  /** Called after every change of the document or the page count. */
  onChange(fn: () => void): void;
  /** Opens the full-screen viewer; `load` draws the pages large. */
  view(title: string, load: () => Promise<HTMLCanvasElement[]>): void;
  /** Called when a tab is opened. */
  onTab(fn: (id: string) => void): void;
}

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.strings!) as Msg;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const dropEl = q('[data-drop]');
  const fileInput = q<HTMLInputElement>('[data-file]');
  const errorEl = q('[data-error]');
  const statusEl = q('[data-status]');
  const work = q('[data-work]');
  const list = q('[data-pages]');
  const undoBtn = q<HTMLButtonElement>('[data-undo]');
  const unlockForm = q<HTMLFormElement>('[data-unlock]');

  let doc: Bytes | null = null;
  let history: Bytes[] = [];
  let baseName = 'document';
  let pageCount = 0;
  let gen = 0;
  let sel = new Set<number>();
  let thumbs: (HTMLCanvasElement | null)[] = [];
  let viewer: PdfDoc | null = null;
  let locked: { bytes: Bytes; name: string } | null = null;
  const listeners: (() => void)[] = [];
  const tabListeners: ((id: string) => void)[] = [];
  const range = (n: number) => [...Array(n).keys()];

  const showError = (msg: string) => { errorEl.textContent = msg; errorEl.hidden = !msg; };
  const setStatus = (msg: string) => { statusEl.textContent = msg; };
  const fmt = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

  /** Runs one operation with a busy message; any failure shows the generic "invalid" text. Clicks while busy are ignored. */
  const run = oneAtATime(async (fn: () => Promise<void>) => {
    showError('');
    setStatus(s.busy);
    root.setAttribute('aria-busy', 'true');
    try { await fn(); } catch (e) { console.error('pdf tool', e); showError(s.invalid); } finally { setStatus(''); root.removeAttribute('aria-busy'); }
  });

  const save = (data: Bytes | Blob, name: string, type: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data as BlobPart], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  async function apply(next: Bytes, map?: (number | null)[]) {
    if (doc) history.push(doc);
    if (history.length > 15) history.shift();
    doc = next;
    await refresh(map);
  }

  const target = () => (sel.size ? [...sel].sort((a, b) => a - b) : range(pageCount));

  // ---- the page grid ----
  async function refresh(map?: (number | null)[]) {
    const info = doc ? await loadInfo(doc) : { error: 'invalid' as const };
    if ('error' in info) { showError(s[info.error]); return; }
    const old = thumbs, oldSel = sel;
    pageCount = info.pageCount;
    thumbs = Array(pageCount).fill(null);
    sel = new Set();
    map?.forEach((from, j) => {
      if (from == null) return;
      if (old[from]) thumbs[j] = clone(old[from]!);
      if (oldSel.has(from)) sel.add(j);
    });
    work.hidden = false;
    dropEl.classList.add('compact');
    undoBtn.disabled = history.length === 0;
    const token = ++gen;
    if (viewer) closePdf(viewer);
    viewer = await openPdf(doc!);
    list.replaceChildren(...range(pageCount).map(card));
    observe(token);
    stats();
    listeners.forEach((f) => f());
    stripKey = '';
    void strip();
  }

  // ---- the result strip: every page as a small picture, 100 at a time, shown under every tab but Organize ----
  const BATCH = 100;
  let stripKey = '';
  let stripPage = 0;
  let tabId = 'organize';
  async function strip() {
    const box = q('[data-strip]');
    box.hidden = !doc || tabId === 'organize';
    if (box.hidden) return;
    const batches = Math.max(1, Math.ceil(pageCount / BATCH));
    stripPage = Math.min(stripPage, batches - 1);
    const key = `${gen}:${stripPage}`;
    if (key === stripKey) return;
    stripKey = key;
    const from = stripPage * BATCH, to = Math.min(pageCount, from + BATCH);
    const row = q('[data-striprow]');
    row.replaceChildren();
    q('[data-striptitle]').textContent = s.stripTitle.replace('{n}', String(pageCount));
    const nav = q('[data-stripnav]');
    nav.hidden = batches < 2;
    q('[data-striprange]').textContent = s.stripRange.replace('{a}', String(from + 1)).replace('{b}', String(to));
    q<HTMLButtonElement>('[data-stripprev]').disabled = stripPage === 0;
    q<HTMLButtonElement>('[data-stripnext]').disabled = stripPage >= batches - 1;
    for (let i = from; i < to; i++) {
      try {
        const page = await viewer!.getPage(i + 1);
        const canvas = await renderPage(page, 72 * (96 / page.getViewport({ scale: 1 }).height));
        if (key !== stripKey) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pzoom';
        b.title = `${s.enlarge}: ${s.page} ${i + 1}`;
        b.addEventListener('click', () => view(`${s.page} ${i + 1}`, async () => { const pg = await viewer!.getPage(i + 1); return [await renderPage(pg, (72 * 1600) / pg.getViewport({ scale: 1 }).width)]; }));
        b.append(canvas, Object.assign(document.createElement('span'), { className: 'pn', textContent: String(i + 1) }));
        row.append(b);
      } catch { return; }
    }
  }
  q('[data-stripprev]').addEventListener('click', () => { stripPage--; void strip(); });
  q('[data-stripnext]').addEventListener('click', () => { stripPage++; void strip(); });

  const clone = (c: HTMLCanvasElement) => { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d')!.drawImage(c, 0, 0); return n; };

  function stats() {
    q('[data-stats]').textContent = `${s.file}: ${baseName}.pdf · ${pageCount} ${s.pages} · ${fmt(doc!.length)}${sel.size ? ` · ${sel.size} ${s.selected}` : ''}`;
    list.querySelectorAll<HTMLElement>('[data-i]').forEach((li) => li.classList.toggle('sel', sel.has(Number(li.dataset.i))));
    root.querySelectorAll<HTMLButtonElement>('[data-needsel]').forEach((b) => { b.disabled = !sel.size; });
  }

  // Thumbnails are drawn when a card scrolls into view, one at a time.
  function observe(token: number) {
    const queue: number[] = [];
    let busy = false;
    const pump = async () => {
      if (busy) return;
      busy = true;
      while (queue.length && token === gen) {
        const i = queue.shift()!;
        if (thumbs[i]) continue;
        try {
          const page = await viewer!.getPage(i + 1);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(240 / base.width, 300 / base.height, 2);
          const canvas = await renderPage(page, 72 * scale);
          if (token !== gen) break;
          thumbs[i] = canvas;
          const slot = list.querySelector<HTMLElement>(`[data-i="${i}"] .thumb`);
          slot?.replaceChildren(canvas);
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `${s.page} ${i + 1}`);
        } catch { /* leave this thumbnail blank; the page is still usable */ }
      }
      busy = false;
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); queue.push(Number((e.target as HTMLElement).dataset.i)); }
      void pump();
    }, { rootMargin: '300px' });
    list.querySelectorAll('[data-i]').forEach((li) => io.observe(li));
  }

  const move = (from: number, to: number) => { const order = range(pageCount); order.splice(to, 0, ...order.splice(from, 1)); return order; };

  function card(i: number) {
    const li = document.createElement('li');
    li.className = 'pg';
    li.dataset.i = String(i);
    const label = `${s.page} ${i + 1}`;
    li.innerHTML = `<div class="thumb"></div><span class="grip" title="${s.drag}" aria-hidden="true">${ICONS.grip}</span><span class="tick" aria-hidden="true">✓</span><div class="num">${label}</div><div class="tools"></div>`;
    li.querySelector('.thumb')!.append(thumbs[i] ?? Object.assign(document.createElement('canvas'), { width: 3, height: 4 }));
    const tools = li.querySelector('.tools')!;
    const acts: [string, string, boolean, () => Promise<void>][] = [
      ['earlier', ICONS.earlier, i === 0, async () => { const o = move(i, i - 1); await apply(await extract(doc!, o), o); }],
      ['later', ICONS.later, i === pageCount - 1, async () => { const o = move(i, i + 1); await apply(await extract(doc!, o), o); }],
      ['rotate', ICONS.rotate, false, async () => apply(await rotate(doc!, [i], 90), range(pageCount).map((p) => (p === i ? null : p)))],
      ['del', ICONS.del, pageCount === 1, async () => { const o = range(pageCount).filter((p) => p !== i); await apply(await extract(doc!, o), o); }],
    ];
    for (const [act, svg, off, op] of acts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.act = act;
      b.disabled = off;
      b.title = b.ariaLabel = `${s[act]}: ${label}`;
      b.innerHTML = svg;
      b.addEventListener('click', (e) => { e.stopPropagation(); void run(op); });
      tools.append(b);
    }
    return li;
  }

  let anchor = 0;
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (!li || (e.target as HTMLElement).closest('button')) return;
    const i = Number(li.dataset.i);
    if (e.shiftKey) { const [a, b] = [Math.min(anchor, i), Math.max(anchor, i)]; for (let k = a; k <= b; k++) sel.add(k); }
    else { sel.has(i) ? sel.delete(i) : sel.add(i); anchor = i; }
    stats();
  });
  sortable(list, { items: () => [...list.querySelectorAll<HTMLElement>('[data-i]')], onDrop: (order) => { void run(async () => apply(await extract(doc!, order), order)); } });

  // ---- selection toolbar ----
  const pick = (f: (i: number) => boolean) => { sel = new Set(range(pageCount).filter(f)); stats(); };
  const selActions: Record<string, () => void> = {
    all: () => pick(() => true), none: () => pick(() => false), odd: () => pick((i) => i % 2 === 0), even: () => pick((i) => i % 2 === 1), invert: () => pick((i) => !sel.has(i)),
    rotr: () => void run(async () => { const t = target(); await apply(await rotate(doc!, t, 90), range(pageCount).map((p) => (t.includes(p) ? null : p))); }),
    rotl: () => void run(async () => { const t = target(); await apply(await rotate(doc!, t, 270), range(pageCount).map((p) => (t.includes(p) ? null : p))); }),
    del: () => void run(async () => {
      const keep = range(pageCount).filter((i) => !sel.has(i));
      if (!keep.length) { showError(s.lastPage); return; }
      await apply(await extract(doc!, keep), keep);
    }),
    keep: () => void run(async () => { const o = [...sel].sort((a, b) => a - b); await apply(await extract(doc!, o), o); }),
    dup: () => void run(async () => { const o = range(pageCount).flatMap((i) => (sel.has(i) ? [i, i] : [i])); await apply(await extract(doc!, o), o); }),
    first: () => void run(async () => { const o = [...range(pageCount).filter((i) => sel.has(i)), ...range(pageCount).filter((i) => !sel.has(i))]; await apply(await extract(doc!, o), o); }),
    last: () => void run(async () => { const o = [...range(pageCount).filter((i) => !sel.has(i)), ...range(pageCount).filter((i) => sel.has(i))]; await apply(await extract(doc!, o), o); }),
    save: () => void run(async () => { const o = [...sel].sort((a, b) => a - b); save(await extract(doc!, o), `${baseName}-selection.pdf`, 'application/pdf'); }),
  };
  root.querySelectorAll<HTMLElement>('[data-sel]').forEach((b) => b.addEventListener('click', () => selActions[b.dataset.sel!]?.()));

  // ---- adding files ----
  const kind = (f: File) => {
    const n = f.name.toLowerCase();
    if (f.type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
    if (f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif)$/.test(n)) return 'image';
    return null;
  };

  /** PNG and JPEG go in as they are; everything else the browser can draw is converted through a canvas. */
  async function imageBytes(f: File): Promise<{ bytes: Bytes; type: 'image/png' | 'image/jpeg' }> {
    const raw = new Uint8Array(await f.arrayBuffer());
    if (raw[0] === 0x89 && raw[1] === 0x50) return { bytes: raw, type: 'image/png' };
    if (raw[0] === 0xff && raw[1] === 0xd8) return { bytes: raw, type: 'image/jpeg' };
    const bmp = await createImageBitmap(f);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d')!.drawImage(bmp, 0, 0);
    const blob = await new Promise<Blob>((done, fail) => c.toBlob((b) => (b ? done(b) : fail(new Error('encode'))), 'image/png'));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: 'image/png' };
  }

  /** Makes a file usable: removes owner-only protection, asks for a password when one is needed, and as a last resort rebuilds a damaged file from pictures of its pages. */
  async function prepare(bytes: Bytes, name: string): Promise<Bytes | null> {
    let info = await loadInfo(bytes);
    if ('error' in info && info.error === 'encrypted') {
      try { bytes = await unlock(bytes, ''); info = await loadInfo(bytes); } catch (e) {
        if ((e as Error).message === 'password') { locked = { bytes, name }; unlockForm.hidden = false; unlockForm.querySelector('input')!.focus(); showError(`${name}: ${s.password}`); return null; }
        try { setStatus(s.rebuilding); return await pagesToImagePdf(bytes, 150, undefined, progress); } catch (err) { if (isPasswordError(err)) { locked = { bytes, name }; unlockForm.hidden = false; showError(`${name}: ${s.password}`); return null; } throw err; }
      }
    }
    if ('error' in info) {
      try { setStatus(s.rebuilding); const out = await pagesToImagePdf(bytes, 150, undefined, progress); showError(`${name}: ${s.repaired}`); return out; } catch { throw new Error(`${name}: ${s.invalid}`); }
    }
    return bytes;
  }
  const progress = (i: number, n: number) => setStatus(`${s.busy} ${i}/${n}`);

  async function addFiles(files: File[]) {
    await run(async () => {
      const parts: Bytes[] = [];
      const problems: string[] = [];
      for (const f of files) {
        const k = kind(f);
        if (!k) { problems.push(`${f.name}: ${s.badType}`); continue; }
        try {
          if (k === 'pdf') { const b = await prepare(new Uint8Array(await f.arrayBuffer()), f.name); if (b) parts.push(b); }
          else { const img = await imageBytes(f); parts.push(await imagesToPdf([img])); }
        } catch (e) { problems.push((e as Error).message.includes(':') ? (e as Error).message : `${f.name}: ${k === 'pdf' ? s.invalid : s.badImage}`); }
      }
      if (problems.length) showError(problems.join(' '));
      if (!parts.length) return;
      if (!doc) baseName = (files.find((f) => kind(f))?.name ?? 'document').replace(/\.[^.]+$/, '');
      await apply(doc || parts.length > 1 ? await merge(doc ? [doc, ...parts] : parts) : parts[0], doc ? range(pageCount) : undefined);
    });
  }

  unlockForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!locked) return;
    const { bytes, name } = locked;
    const pw = unlockForm.querySelector<HTMLInputElement>('input')!.value;
    void run(async () => {
      let out: Bytes;
      try { out = await unlock(bytes, pw); } catch (err) {
        if ((err as Error).message === 'password') { showError(s.wrongPw); return; }
        try { setStatus(s.rebuilding); out = await pagesToImagePdf(bytes, 150, pw, progress); } catch (e2) { showError(isPasswordError(e2) ? s.wrongPw : s.invalid); return; }
      }
      unlockForm.hidden = true; unlockForm.reset(); locked = null; showError('');
      if (!doc) baseName = name.replace(/\.[^.]+$/, '');
      await apply(doc ? await merge([doc, out]) : out, doc ? range(pageCount) : undefined);
    });
  });

  fileInput.addEventListener('change', () => { void addFiles([...fileInput.files!]); fileInput.value = ''; });
  q<HTMLInputElement>('[data-camera]').addEventListener('change', (e) => { const t = e.target as HTMLInputElement; void addFiles([...t.files!]); t.value = ''; });
  dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('over'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
  dropEl.addEventListener('drop', (e) => { e.preventDefault(); dropEl.classList.remove('over'); void addFiles([...(e.dataTransfer?.files ?? [])]); });
  root.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  root.addEventListener('drop', (e) => { if (e.dataTransfer?.files.length && !dropEl.contains(e.target as Node)) { e.preventDefault(); void addFiles([...e.dataTransfer.files]); } });

  // ---- bar ----
  undoBtn.addEventListener('click', () => void run(async () => { doc = history.pop()!; await refresh(); }));
  q('[data-reset]').addEventListener('click', () => {
    doc = null; history = []; gen++; sel = new Set(); thumbs = []; if (viewer) closePdf(viewer); viewer = null;
    list.replaceChildren(); q('[data-strip]').hidden = true; work.hidden = true; dropEl.classList.remove('compact'); showError(''); unlockForm.hidden = true; locked = null;
    listeners.forEach((f) => f());
  });
  q('[data-download]').addEventListener('click', () => { if (doc) save(doc, `${baseName}-edited.pdf`, 'application/pdf'); });
  q('[data-range-keep]').addEventListener('click', () => {
    const r = parseRanges(q<HTMLInputElement>('[data-range]').value, pageCount);
    if ('error' in r) { showError(s[r.error]); return; }
    void run(async () => apply(await extract(doc!, r.pages), r.pages));
  });

  // ---- tabs ----
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('section[data-panel]')];
  function openTab(id: string, fromUser = false) {
    const t = tabs.find((b) => b.dataset.tab === id);
    if (!t) return;
    tabs.forEach((b) => { b.setAttribute('aria-selected', String(b === t)); });
    panels.forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.to; });
    setHash(id);
    tabId = id;
    void strip();
    if (!doc && fromUser) { dropEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); fileInput.click(); }
    tabListeners.forEach((f) => f(id));
  }
  const setHash = (id: string) => { try { window.history.replaceState(null, '', `#${id}`); } catch { /* sandboxed frame */ } };
  tabs.forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab!, true)));

  const view = initViewer(root, s);
  const ctx: Ctx = {
    s, root, q,
    doc: () => doc!, pageCount: () => pageCount, baseName: () => baseName, target, selected: () => [...sel].sort((a, b) => a - b),
    apply, run, error: showError, status: setStatus, progress, save, render: makeTextRenderer(),
    pdf: async () => viewer ?? (viewer = await openPdf(doc!)),
    view, onChange: (f) => listeners.push(f), onTab: (f) => tabListeners.push(f),
  };
  initPanels(ctx);
  initEditor(ctx);
  openTab((location.hash.slice(1) && tabs.some((b) => b.dataset.tab === location.hash.slice(1))) ? location.hash.slice(1) : 'organize');
}

const root = document.querySelector<HTMLElement>('[data-pdf]');
if (root) init(root);
