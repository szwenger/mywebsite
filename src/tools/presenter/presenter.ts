import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { clampPage, elapsedMs, fmtTime, isOver } from './logic';
import { onFiles } from '../dom';

// The worker is bundled into our own assets; nothing is loaded from a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const root = document.querySelector<HTMLElement>('[data-presenter]');
if (root) init(root);

/** Page of the second window. It only shows what the presenter sends and forwards a few keys back. */
const BEAMER_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Beamer</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;cursor:none}
#slide{max-width:100vw;max-height:100vh;display:block}#blank{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .25s}#blank.on{opacity:1}</style></head>
<body><img id="slide" alt=""><div id="blank"></div><script>
var me=location.origin;
addEventListener('message',function(e){if(e.origin!==me)return;var d=e.data;
if(d.type==='slide')document.getElementById('slide').src=d.src;
if(d.type==='blank')document.getElementById('blank').className=d.on?'on':'';});
addEventListener('keydown',function(e){var k=e.key,o=window.opener;
if(k==='f'||k==='F'){if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(function(){});else document.exitFullscreen();return;}
if(!o)return;
if(k==='ArrowRight'||k===' '||k==='PageDown')o.postMessage({type:'nav',dir:1},me);
else if(k==='ArrowLeft'||k==='PageUp')o.postMessage({type:'nav',dir:-1},me);
else if(k==='b'||k==='B')o.postMessage({type:'blank'},me);});
<\/script></body></html>`;

type Msg = Record<string, string>;

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.strings!) as Msg;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const dropEl = q('[data-drop]');
  const fileInput = q<HTMLInputElement>('[data-file]');
  const errorEl = q('[data-error]');
  const stage = q('[data-stage]');
  const nameEl = q('[data-name]');
  const curWrap = q('[data-curwrap]');
  const cur = q<HTMLCanvasElement>('[data-cur]');
  const nextWrap = q('[data-nextwrap]');
  const next = q<HTMLCanvasElement>('[data-next]');
  const endMsg = q('[data-end]');
  const numEl = q('[data-num]');
  const totEl = q('[data-total]');
  const prevBtn = q<HTMLButtonElement>('[data-prev]');
  const nextBtn = q<HTMLButtonElement>('[data-nextbtn]');
  const blankBtn = q<HTMLButtonElement>('[data-blank]');
  const timerEl = q('[data-timer]');
  const targetEl = q<HTMLInputElement>('[data-target]');
  const startBtn = q<HTMLButtonElement>('[data-start]');

  let pdf: pdfjs.PDFDocumentProxy | null = null;
  let page = 1;
  let total = 0;
  let gen = 0; // bumped on every redraw so a stale one stops
  let beamer: Window | null = null;
  let blanked = false;
  const origin = location.origin;

  const fail = (msg: string) => { errorEl.textContent = msg; errorEl.hidden = false; };

  // ---- loading ----
  async function load(file: File) {
    errorEl.hidden = true;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return fail(s.badType);
    let doc: pdfjs.PDFDocumentProxy;
    try {
      doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    } catch (e) {
      return fail((e as Error)?.name === 'PasswordException' ? s.encrypted : s.invalid);
    }
    void pdf?.destroy();
    pdf = doc;
    total = doc.numPages;
    page = 1;
    totEl.textContent = String(total);
    nameEl.textContent = file.name;
    dropEl.hidden = true;
    stage.hidden = false;
    await redraw();
  }

  // ---- drawing ----
  const running = new WeakMap<HTMLCanvasElement, pdfjs.RenderTask>();
  async function draw(canvas: HTMLCanvasElement, n: number, maxW: number, maxH: number) {
    if (!pdf || maxW <= 0 || maxH <= 0) return;
    const p = await pdf.getPage(n);
    const base = p.getViewport({ scale: 1 });
    const dpr = window.devicePixelRatio || 1;
    const view = p.getViewport({ scale: Math.min(maxW / base.width, maxH / base.height) * dpr });
    running.get(canvas)?.cancel(); // two renders on one canvas make pdf.js throw
    canvas.width = Math.floor(view.width);
    canvas.height = Math.floor(view.height);
    canvas.style.width = `${view.width / dpr}px`;
    canvas.style.height = `${view.height / dpr}px`;
    const task = p.render({ canvas, viewport: view });
    running.set(canvas, task);
    try { await task.promise; } catch (e) { if ((e as Error)?.name !== 'RenderingCancelledException') throw e; }
  }

  async function redraw() {
    if (!pdf) return;
    const token = ++gen;
    numEl.textContent = String(page);
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= total;
    const hasNext = page < total;
    next.hidden = !hasNext;
    endMsg.hidden = hasNext;
    try {
      await draw(cur, page, curWrap.clientWidth, curWrap.clientHeight);
      if (hasNext && token === gen) await draw(next, page + 1, nextWrap.clientWidth, nextWrap.clientHeight);
      if (token === gen) await syncBeamer();
    } catch { fail(s.invalid); }
  }

  const goTo = (n: number) => {
    const to = clampPage(n, total);
    if (!pdf || to === page) return;
    page = to;
    void redraw();
  };

  // ---- beamer window ----
  async function syncBeamer() {
    if (!pdf || !beamer || beamer.closed) return;
    const p = await pdf.getPage(page);
    const base = p.getViewport({ scale: 1 });
    const view = p.getViewport({ scale: 1920 / base.width });
    const c = document.createElement('canvas');
    c.width = Math.floor(view.width);
    c.height = Math.floor(view.height);
    await p.render({ canvas: c, viewport: view }).promise;
    beamer.postMessage({ type: 'slide', src: c.toDataURL('image/jpeg', 0.92) }, origin);
  }

  function openBeamer() {
    if (beamer && !beamer.closed) { beamer.focus(); return; }
    const url = URL.createObjectURL(new Blob([BEAMER_HTML], { type: 'text/html' }));
    beamer = window.open(url, 'beamer', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    if (!beamer) return fail(s.popup);
    errorEl.hidden = true;
    // The page needs a moment to attach its listener, then gets the slide and the blank state.
    setTimeout(() => { beamer?.postMessage({ type: 'blank', on: blanked }, origin); void syncBeamer(); URL.revokeObjectURL(url); }, 600);
  }

  function toggleBlank() {
    blanked = !blanked;
    blankBtn.setAttribute('aria-pressed', String(blanked));
    if (beamer && !beamer.closed) beamer.postMessage({ type: 'blank', on: blanked }, origin);
  }

  // ---- timer ----
  let banked = 0;
  let startedAt: number | null = null;
  const secs = () => elapsedMs(banked, startedAt, Date.now()) / 1000;
  function paintTimer() {
    const text = fmtTime(secs());
    if (timerEl.textContent !== text) timerEl.textContent = text;
    timerEl.classList.toggle('over', isOver(secs(), targetEl.valueAsNumber));
  }
  setInterval(() => { if (startedAt !== null) paintTimer(); }, 250);

  function toggleTimer() {
    if (startedAt === null) startedAt = Date.now();
    else { banked = elapsedMs(banked, startedAt, Date.now()); startedAt = null; }
    startBtn.textContent = startedAt === null ? s.start : s.pause;
    startBtn.classList.toggle('on', startedAt !== null);
    paintTimer();
  }

  // ---- wiring ----
  onFiles(dropEl, fileInput, ([f]) => { if (f) void load(f); });

  prevBtn.addEventListener('click', () => goTo(page - 1));
  nextBtn.addEventListener('click', () => goTo(page + 1));
  q('[data-beamer]').addEventListener('click', openBeamer);
  blankBtn.addEventListener('click', toggleBlank);
  startBtn.addEventListener('click', toggleTimer);
  q('[data-reset]').addEventListener('click', () => {
    banked = 0;
    startedAt = null;
    startBtn.textContent = s.start;
    startBtn.classList.remove('on');
    paintTimer();
  });
  targetEl.addEventListener('input', paintTimer);

  window.addEventListener('message', (e) => {
    if (e.origin !== origin || e.source !== beamer) return;
    if (e.data?.type === 'nav') goTo(page + e.data.dir);
    if (e.data?.type === 'blank') toggleBlank();
  });

  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (!pdf || e.ctrlKey || e.metaKey || e.altKey || t.tagName === 'INPUT') return;
    switch (e.key) {
      case ' ': if (t.tagName === 'BUTTON') return; // let Space press the focused button
      // falls through
      case 'ArrowRight': case 'PageDown': e.preventDefault(); goTo(page + 1); break;
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); goTo(page - 1); break;
      case 'b': case 'B': toggleBlank(); break;
      case 'f': case 'F': beamer?.focus(); break;
      case 'o': case 'O': fileInput.click(); break;
    }
  });

  let timer: number | undefined;
  new ResizeObserver(() => { clearTimeout(timer); timer = window.setTimeout(() => void redraw(), 150); }).observe(curWrap);
}
