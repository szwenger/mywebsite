/** A full-screen viewer for rendered pages: wheel or +/- to zoom, drag to move, pinch on touch, double-click to toggle, Esc to close. */
type Msg = Record<string, string>;
const MAX = 8;

export function initViewer(root: HTMLElement, s: Msg): (title: string, load: () => Promise<HTMLCanvasElement[]>) => void {
  const dlg = root.querySelector<HTMLDialogElement>('[data-pview]')!;
  const stage = dlg.querySelector<HTMLElement>('[data-pvstage]')!;
  const pan = dlg.querySelector<HTMLElement>('[data-pvpan]')!;
  const title = dlg.querySelector<HTMLElement>('[data-pvtitle]')!;
  const pct = dlg.querySelector<HTMLElement>('[data-pvpct]')!;

  let k = 1, tx = 0, ty = 0, fit = 1;
  let token = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let last: { d: number; cx: number; cy: number } | null = null;

  const size = () => ({ w: pan.offsetWidth, h: pan.offsetHeight, sw: stage.clientWidth, sh: stage.clientHeight });
  function apply() {
    const { w, h, sw, sh } = size();
    // keep some of the page on screen
    const keep = 80;
    tx = Math.min(sw - keep, Math.max(keep - w * k, tx));
    ty = Math.min(sh - keep, Math.max(keep - h * k, ty));
    pan.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    pct.textContent = `${Math.round(k * 100)} %`;
  }
  function fitView() {
    const { w, h, sw, sh } = size();
    if (!w || !h) return;
    fit = Math.min(sw / w, sh / h, 1);
    k = fit;
    tx = (sw - w * k) / 2;
    ty = (sh - h * k) / 2;
    apply();
  }
  /** Zooms to `next`, keeping the point (px, py) of the stage where it is. */
  function zoomAt(next: number, px: number, py: number) {
    next = Math.min(MAX, Math.max(fit * 0.5, next));
    tx = px - ((px - tx) * next) / k;
    ty = py - ((py - ty) * next) / k;
    k = next;
    apply();
  }
  const centre = () => ({ x: stage.clientWidth / 2, y: stage.clientHeight / 2 });
  const rel = (e: { clientX: number; clientY: number }) => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  stage.addEventListener('wheel', (e) => { e.preventDefault(); const p = rel(e); zoomAt(k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y); }, { passive: false });
  stage.addEventListener('dblclick', (e) => { const p = rel(e); if (k > fit * 1.05) { fitView(); } else zoomAt(Math.max(1, fit * 2.5), p.x, p.y); });
  stage.addEventListener('pointerdown', (e) => {
    try { stage.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.classList.add('drag');
    last = null;
  });
  stage.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { tx += e.clientX - p.x; ty += e.clientY - p.y; apply(); return; }
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const c = rel({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
    if (last && last.d > 0) { tx += c.x - last.cx; ty += c.y - last.cy; zoomAt(k * (d / last.d), c.x, c.y); }
    last = { d, cx: c.x, cy: c.y };
  });
  const up = (e: PointerEvent) => { pointers.delete(e.pointerId); last = null; if (!pointers.size) stage.classList.remove('drag'); };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  dlg.addEventListener('keydown', (e) => {
    const c = centre();
    if (e.key === '+' || e.key === '=') zoomAt(k * 1.25, c.x, c.y);
    else if (e.key === '-') zoomAt(k / 1.25, c.x, c.y);
    else if (e.key === '0') fitView();
    else if (e.key.startsWith('Arrow')) { const st = 60; if (e.key === 'ArrowLeft') tx += st; if (e.key === 'ArrowRight') tx -= st; if (e.key === 'ArrowUp') ty += st; if (e.key === 'ArrowDown') ty -= st; apply(); }
    else return;
    e.preventDefault();
  });
  dlg.querySelector('[data-pvin]')!.addEventListener('click', () => { const c = centre(); zoomAt(k * 1.25, c.x, c.y); });
  dlg.querySelector('[data-pvout]')!.addEventListener('click', () => { const c = centre(); zoomAt(k / 1.25, c.x, c.y); });
  dlg.querySelector('[data-pvfit]')!.addEventListener('click', fitView);
  dlg.querySelector('[data-pvclose]')!.addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { token++; pan.replaceChildren(); pointers.clear(); });
  addEventListener('resize', () => { if (dlg.open) fitView(); });

  return (name, load) => {
    const mine = ++token;
    title.textContent = name;
    dlg.setAttribute('aria-label', name);
    pan.replaceChildren(Object.assign(document.createElement('p'), { className: 'pv-wait', textContent: s.busy }));
    if (!dlg.open) dlg.showModal();
    void load().then((canvases) => {
      if (mine !== token) return;
      pan.replaceChildren(...canvases);
      fitView();
      stage.focus();
    }).catch(() => { if (mine === token) pan.replaceChildren(Object.assign(document.createElement('p'), { className: 'pv-wait', textContent: s.invalid })); });
  };
}
