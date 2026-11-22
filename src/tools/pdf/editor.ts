import type { Ctx } from './pdf';
import { applyItems, hexToRgb, type Item } from './stamp';
import { renderPage, bytesOf, toBlob } from './raster';
import { rasterizePages } from './rasterize';

type Tool = 'select' | 'text' | 'image' | 'sign' | 'draw' | 'highlight' | 'whiteout' | 'redact';
const PEN = '#d62828';

/** The page editor behind the Edit, Sign and Redact tabs: pick a tool, click or drag on the page, press Apply. */
export function initEditor(c: Ctx) {
  const p = c.root.querySelector<HTMLElement>('[data-panel="edit"]');
  if (!p) return;
  const { s } = c;
  const $ = <T extends HTMLElement>(sel: string) => p.querySelector<T>(sel)!;
  const val = (n: string) => $<HTMLInputElement>(`[name="${n}"]`).value;
  const stage = $('[data-stage]');
  const over = $('[data-over]');
  const nav = $<HTMLInputElement>('[name="epage"]');

  let tool: Tool = 'text';
  let cur = 0;
  let items: Item[] = [];
  const redact = new WeakSet<object>();
  let selected: Item | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let pageSize = { w: 595, h: 842 };
  let sig: { bytes: Uint8Array; aspect: number } | null = null;
  let img: { bytes: Uint8Array; type: 'image/png' | 'image/jpeg'; aspect: number } | null = null;
  let mine = false; // our own apply: keep the items state in sync with it
  let token = 0;

  const pct = (n: number) => `${(n * 100).toFixed(3)}%`;
  const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const color = () => hexToRgb(val('ecolor') || PEN);

  // ---- tool choice ----
  function setTool(t: Tool) {
    tool = t;
    p!.querySelectorAll<HTMLElement>('[data-etool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.etool === t)));
    p!.dataset.tool = t;
    over.dataset.tool = t;
    $('[data-sigbox]').hidden = t !== 'sign';
    $('[data-imgbox]').hidden = t !== 'image';
    $('[data-hint]').textContent = s[`hint_${t}`] ?? '';
  }
  p.querySelectorAll<HTMLElement>('[data-etool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.etool as Tool)));
  c.onTab((id) => {
    if (p.hidden) return;
    if (id === 'sign') setTool('sign'); else if (id === 'redact') setTool('redact'); else if (id === 'edit' && (tool === 'sign' || tool === 'redact')) setTool('text');
    void show(cur);
  });

  // ---- the page ----
  async function show(i: number) {
    if (p!.hidden || !c.pageCount()) return;
    cur = clamp(i, 0, c.pageCount() - 1);
    nav.value = String(cur + 1);
    const t = ++token;
    const pdf = await c.pdf();
    const page = await pdf.getPage(cur + 1);
    const vp = page.getViewport({ scale: 1 });
    pageSize = { w: vp.width, h: vp.height };
    const cv = await renderPage(page, Math.min(200, (72 * 1100) / vp.width));
    if (t !== token) return;
    canvas = cv;
    cv.className = 'epage';
    stage.replaceChildren(cv, over);
    over.style.setProperty('--ar', String(vp.width / vp.height));
    resize();
    paint();
  }
  const resize = () => { if (canvas) over.style.setProperty('--u', String(canvas.getBoundingClientRect().width / pageSize.w)); };
  new ResizeObserver(resize).observe(stage);
  $('[data-eprev]').addEventListener('click', () => void show(cur - 1));
  $('[data-enext]').addEventListener('click', () => void show(cur + 1));
  nav.addEventListener('change', () => void show(Number(nav.value) - 1));

  // ---- drawing the items over the page ----
  function paint() {
    over.querySelectorAll('.eit').forEach((e) => e.remove());
    items.forEach((it) => { if (it.page === cur) over.append(node(it)); });
    $<HTMLButtonElement>('[data-edel]').disabled = !selected;
    $('[data-ecount]').textContent = items.length ? s.editCount.replace('{n}', String(items.length)) : '';
    $<HTMLButtonElement>('[data-do="apply"]').disabled = !items.length;
  }

  const css = (c3: number[]) => `rgb(${c3.map((v) => Math.round(v * 255)).join(',')})`;

  /** Sets the position, size and look of an item's element from the item (also used while dragging). */
  function place(it: Item, el: HTMLElement) {
    if (it.kind === 'text') {
      el.textContent = it.text;
      el.style.cssText = `left:${pct(it.x)};top:${pct(it.y)};font-size:calc(var(--u) * ${it.size}px);color:${css(it.color)};opacity:${it.opacity}`;
    } else if (it.kind === 'rect') {
      el.style.cssText = `left:${pct(it.x)};top:${pct(it.y)};width:${pct(it.w)};height:${pct(it.h)};background:${css(it.color)};opacity:${redact.has(it) ? 0.92 : it.opacity}`;
      el.append(Object.assign(document.createElement('i'), { className: 'grab' }));
    } else if (it.kind === 'image') {
      el.style.cssText = `left:${pct(it.x)};top:${pct(it.y)};width:${pct(it.w)};opacity:${it.opacity}`;
    } else {
      const pl = el.querySelector('polyline')!;
      pl.setAttribute('points', it.points.map(([x, y]) => `${x * 100},${y * 100}`).join(' '));
      pl.setAttribute('stroke', css(it.color));
      pl.style.strokeWidth = `calc(var(--u) * ${it.width}px)`;
    }
  }

  function node(it: Item): HTMLElement {
    const el = document.createElement('div');
    el.className = `eit e${it.kind}${it.kind === 'rect' && redact.has(it) ? ' redact' : ''}`;
    if (it.kind === 'image') {
      const im = new Image();
      im.src = URL.createObjectURL(new Blob([it.bytes as BlobPart], { type: it.type }));
      im.alt = ''; im.draggable = false;
      el.append(im, Object.assign(document.createElement('i'), { className: 'grab' }));
    } else if (it.kind === 'path') el.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
    place(it, el);
    if (it === selected) el.classList.add('on');
    el.addEventListener('pointerdown', (e) => beginMove(e, it, el));
    return el;
  }

  const at = (e: PointerEvent) => { const r = over.getBoundingClientRect(); return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) }; };

  function select(it: Item | null) {
    selected = it;
    if (it?.kind === 'text') { $<HTMLInputElement>('[name="etext"]').value = it.text; $<HTMLInputElement>('[name="esize"]').value = String(it.size); }
    paint();
  }

  // ---- moving and resizing ----
  function beginMove(e: PointerEvent, it: Item, el: HTMLElement) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (selected !== it) {
      selected = it;
      over.querySelectorAll('.eit.on').forEach((n) => n.classList.remove('on'));
      el.classList.add('on');
      $<HTMLButtonElement>('[data-edel]').disabled = false;
      if (it.kind === 'text') { $<HTMLInputElement>('[name="etext"]').value = it.text; $<HTMLInputElement>('[name="esize"]').value = String(it.size); }
    }
    const start = at(e);
    const grab = (e.target as HTMLElement).classList.contains('grab');
    const orig = JSON.parse(JSON.stringify(it, (k, v) => (k === 'bytes' ? undefined : v)));
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const q = at(ev);
      const dx = q.x - start.x, dy = q.y - start.y;
      if (it.kind === 'rect' && grab) { it.w = clamp(orig.w + dx, 0.01, 1 - it.x); it.h = clamp(orig.h + dy, 0.005, 1 - it.y); }
      else if (it.kind === 'image' && grab) it.w = clamp(orig.w + dx, 0.03, 1 - it.x);
      else if (it.kind === 'path') it.points = orig.points.map(([x, y]: [number, number]) => [clamp(x + dx), clamp(y + dy)]);
      else { (it as { x: number }).x = clamp(orig.x + dx); (it as { y: number }).y = clamp(orig.y + dy); }
      if (it.kind === 'rect') el.querySelector('.grab')?.remove();
      place(it, el);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', move), { once: true });
  }

  // ---- creating items ----
  over.addEventListener('pointerdown', (e) => {
    if (e.target !== over || e.button !== 0 || !canvas) return;
    const a = at(e);
    if (tool === 'select') { select(null); return; }
    if (tool === 'text') {
      const it: Item = { kind: 'text', page: cur, text: val('etext') || s.sampleText, x: a.x, y: a.y, size: Number(val('esize')) || 18, color: color(), opacity: 1, rotate: 0, anchor: 'l' };
      items.push(it); select(it);
      $<HTMLInputElement>('[name="etext"]').focus();
      return;
    }
    if (tool === 'image' || tool === 'sign') {
      const src = tool === 'sign' ? sig : img;
      if (!src) { c.error(tool === 'sign' ? s.makeSignature : s.pickImage); return; }
      const w = tool === 'sign' ? 0.24 : 0.3;
      const it: Item = { kind: 'image', page: cur, bytes: src.bytes, type: 'type' in src ? src.type : 'image/png', x: clamp(a.x - w / 2, 0, 1 - w), y: clamp(a.y - (w * pageSize.w) / src.aspect / pageSize.h / 2, 0, 0.95), w, opacity: 1 };
      items.push(it); select(it);
      return;
    }
    over.setPointerCapture(e.pointerId);
    c.error('');
    if (tool === 'draw') {
      const it: Item = { kind: 'path', page: cur, points: [[a.x, a.y]], width: Number(val('ewidth')) || 2, color: color(), opacity: 1 };
      items.push(it);
      const move = (ev: PointerEvent) => { const q = at(ev); it.points.push([q.x, q.y]); paint(); };
      const end = () => { over.removeEventListener('pointermove', move); over.removeEventListener('pointerup', end); if (it.points.length < 2) items = items.filter((x) => x !== it); select(it.points.length < 2 ? null : it); };
      over.addEventListener('pointermove', move); over.addEventListener('pointerup', end);
      return;
    }
    // highlight, whiteout, redact: drag a rectangle
    const rgb = tool === 'highlight' ? hexToRgb('#ffe34d') : tool === 'redact' ? ([0, 0, 0] as [number, number, number]) : ([1, 1, 1] as [number, number, number]);
    const it: Item = { kind: 'rect', page: cur, x: a.x, y: a.y, w: 0, h: 0, color: rgb, opacity: tool === 'highlight' ? 0.4 : 1 };
    if (tool === 'redact') redact.add(it);
    items.push(it);
    const move = (ev: PointerEvent) => { const q = at(ev); it.x = Math.min(a.x, q.x); it.y = Math.min(a.y, q.y); it.w = Math.abs(q.x - a.x); it.h = Math.abs(q.y - a.y); paint(); };
    const end = () => { over.removeEventListener('pointermove', move); over.removeEventListener('pointerup', end); if (it.w < 0.008 || it.h < 0.004) items = items.filter((x) => x !== it); select(it.w < 0.008 ? null : it); };
    over.addEventListener('pointermove', move); over.addEventListener('pointerup', end);
  });

  // ---- editing the selected item ----
  $('[name="etext"]').addEventListener('input', () => { if (selected?.kind === 'text') { selected.text = val('etext') || ' '; paint(); } });
  $('[name="esize"]').addEventListener('input', () => { if (selected?.kind === 'text') { selected.size = Number(val('esize')) || 18; paint(); } });
  $('[name="ecolor"]').addEventListener('input', () => { if (selected && (selected.kind === 'text' || selected.kind === 'path')) { selected.color = color(); paint(); } });
  $('[name="ewidth"]').addEventListener('input', () => { if (selected?.kind === 'path') { selected.width = Number(val('ewidth')) || 2; paint(); } });
  const del = () => { if (!selected) return; items = items.filter((x) => x !== selected); selected = null; paint(); };
  $('[data-edel]').addEventListener('click', del);
  $('[data-eclear]').addEventListener('click', () => { items = []; selected = null; paint(); });
  addEventListener('keydown', (e) => { if (p.hidden || (e.key !== 'Delete' && e.key !== 'Backspace') || (e.target as HTMLElement).closest('input, textarea, select')) return; e.preventDefault(); del(); });

  // ---- image and signature sources ----
  async function toPng(file: File): Promise<{ bytes: Uint8Array; type: 'image/png' | 'image/jpeg'; aspect: number }> {
    const bmp = await createImageBitmap(file);
    const raw = new Uint8Array(await file.arrayBuffer());
    if ((raw[0] === 0x89 && raw[1] === 0x50) || (raw[0] === 0xff && raw[1] === 0xd8)) return { bytes: raw, type: raw[0] === 0xff ? 'image/jpeg' : 'image/png', aspect: bmp.width / bmp.height };
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; cv.getContext('2d')!.drawImage(bmp, 0, 0);
    return { bytes: await bytesOf(await toBlob(cv, 'image/png')), type: 'image/png', aspect: bmp.width / bmp.height };
  }
  $<HTMLInputElement>('[name="eimg"]').addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) { try { img = await toPng(f); c.error(''); } catch { c.error(s.badImage); } }
  });

  // signature: draw, type or upload
  const pad = $<HTMLCanvasElement>('[data-pad]');
  const g = pad.getContext('2d')!;
  const ink = () => { g.lineWidth = 3; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = '#14213d'; };
  let drawing = false;
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); drawing = true; ink(); const r = pad.getBoundingClientRect(); g.beginPath(); g.moveTo((e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height); });
  pad.addEventListener('pointermove', (e) => { if (!drawing) return; const r = pad.getBoundingClientRect(); g.lineTo((e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height); g.stroke(); });
  pad.addEventListener('pointerup', () => { drawing = false; });
  async function trimmed(src: HTMLCanvasElement) {
    const d = src.getContext('2d')!.getImageData(0, 0, src.width, src.height);
    let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (d.data[(y * src.width + x) * 4 + 3] > 10) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < 0) return null;
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1 + 8; out.height = y1 - y0 + 1 + 8;
    out.getContext('2d')!.drawImage(src, x0 - 4, y0 - 4, out.width, out.height, 0, 0, out.width, out.height);
    return { bytes: await bytesOf(await toBlob(out, 'image/png')), aspect: out.width / out.height };
  }
  const sigState = (ok: boolean) => { $('[data-sigok]').hidden = !ok; };
  $('[data-sigclear]').addEventListener('click', () => { g.clearRect(0, 0, pad.width, pad.height); sig = null; sigState(false); });
  $('[data-siguse]').addEventListener('click', async () => { const r = await trimmed(pad); if (r) { sig = r; sigState(true); } else c.error(s.makeSignature); });
  $('[data-sigtype]').addEventListener('click', async () => {
    const text = val('sigtext').trim();
    if (!text) return;
    const cv = document.createElement('canvas'); cv.width = 900; cv.height = 240;
    const x = cv.getContext('2d')!;
    x.font = `italic 120px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive`;
    x.fillStyle = '#14213d'; x.textBaseline = 'middle'; x.fillText(text, 20, 120, 860);
    const r = await trimmed(cv);
    if (r) { sig = r; sigState(true); }
  });
  $<HTMLInputElement>('[name="sigimg"]').addEventListener('change', async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { const r = await toPng(f); sig = { bytes: r.bytes, aspect: r.aspect }; sigState(true); } });

  // ---- apply ----
  $('[data-do="apply"]').addEventListener('click', () => void c.run(async () => {
    c.error('');
    let bytes = await applyItems(c.doc(), items, c.render);
    const pages = [...new Set(items.filter((i) => redact.has(i)).map((i) => i.page))];
    if (pages.length) { c.status(s.redacting); bytes = await rasterizePages(bytes, { pages, dpi: 200, quality: 0.9 }, c.progress); }
    mine = true;
    items = []; selected = null;
    await c.apply(bytes, [...Array(c.pageCount()).keys()].map((i) => (pages.includes(i) ? null : i)));
    mine = false;
  }));

  c.onChange(() => {
    if (!mine) { items = []; selected = null; }
    void show(Math.min(cur, Math.max(0, c.pageCount() - 1)));
  });
  setTool('text');
}
