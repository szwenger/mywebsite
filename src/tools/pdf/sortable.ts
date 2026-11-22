/** Pointer-driven reordering for a grid of cards (`[data-i]` children): the grabbed card follows the pointer, the others slide to
 *  make room while you move, and it settles into its slot on release. Works for mouse, pen and touch (touch grabs by `.grip`, so the page still scrolls). */
export interface SortOpts {
  /** The cards in their current order. */
  items(): HTMLElement[];
  /** Called after a drop that changed the order: `order[p]` is the old index of the card now at position p. The DOM is already in that order. */
  onDrop(order: number[]): void;
}

interface Slot { x: number; y: number; w: number; h: number }
const DEAD = 5; // px of movement before a press turns into a drag

export function sortable(list: HTMLElement, o: SortOpts): void {
  let pending: { el: HTMLElement; id: number; x: number; y: number } | null = null;
  let d: { el: HTMLElement; id: number; items: HTMLElement[]; slots: Slot[]; from: number; to: number; sx: number; sy: number; cx: number; cy: number; raf: number } | null = null;

  const center = (s: Slot) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });
  const order = (from: number, to: number, n: number) => { const a = [...Array(n).keys()]; a.splice(to, 0, ...a.splice(from, 1)); return a; };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function layout() {
    if (!d) return;
    const dx = d.cx + scrollX - d.sx, dy = d.cy + scrollY - d.sy;
    d.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.05) rotate(-1.2deg)`;
    const c0 = center(d.slots[d.from]);
    const cx = c0.x + dx, cy = c0.y + dy;
    let best = d.from, bestDist = Infinity;
    d.slots.forEach((s, j) => { const c = center(s); const dist = (c.x - cx) ** 2 + (c.y - cy) ** 2; if (dist < bestDist) { bestDist = dist; best = j; } });
    d.to = best;
    const next = order(d.from, d.to, d.items.length); // next[p] = card at position p
    next.forEach((k, p) => {
      if (k === d!.from) return;
      d!.items[k].style.transform = `translate(${d!.slots[p].x - d!.slots[k].x}px, ${d!.slots[p].y - d!.slots[k].y}px)`;
    });
  }

  function loop() {
    if (!d) return;
    const edge = 80, h = innerHeight;
    const speed = d.cy < edge ? -(edge - d.cy) / edge * 22 : d.cy > h - edge ? (d.cy - (h - edge)) / edge * 22 : 0;
    if (speed) { scrollBy(0, speed); layout(); }
    d.raf = requestAnimationFrame(loop);
  }

  function start(p: NonNullable<typeof pending>) {
    const items = o.items();
    const from = items.indexOf(p.el);
    if (from < 0) return;
    const slots = items.map((el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; });
    d = { el: p.el, id: p.id, items, slots, from, to: from, sx: p.x + scrollX, sy: p.y + scrollY, cx: p.x, cy: p.y, raf: 0 };
    p.el.setPointerCapture(p.id);
    const t = reduced() ? 'none' : 'transform .22s cubic-bezier(.2,.8,.2,1)';
    for (const el of items) el.style.transition = el === p.el ? 'none' : t;
    p.el.classList.add('grabbed');
    list.classList.add('sorting');
    d.raf = requestAnimationFrame(loop);
    layout();
  }

  function finish(cancel: boolean) {
    if (!d) return;
    const { el, items, slots, from, raf } = d;
    cancelAnimationFrame(raf);
    const to = cancel ? from : d.to;
    d = null;
    if (el.hasPointerCapture?.(pending?.id ?? -1)) el.releasePointerCapture(pending!.id);
    // Settle into the slot, then swap the DOM order and drop the transforms in the same frame so nothing jumps.
    el.style.transition = reduced() ? 'none' : 'transform .2s cubic-bezier(.2,.8,.2,1)';
    el.style.transform = `translate(${slots[to].x - slots[from].x}px, ${slots[to].y - slots[from].y}px)`;
    const done = () => {
      for (const it of items) { it.style.transition = 'none'; it.style.transform = ''; }
      el.classList.remove('grabbed');
      list.classList.remove('sorting');
      const next = order(from, to, items.length);
      if (to !== from) { for (const k of next) list.append(items[k]); o.onDrop(next); }
      requestAnimationFrame(() => items.forEach((it) => { it.style.transition = ''; }));
    };
    setTimeout(done, reduced() ? 0 : 210);
    list.dataset.noclick = '1';
    setTimeout(() => { delete list.dataset.noclick; }, 0);
  }

  list.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || d) return;
    const t = e.target as HTMLElement;
    const el = t.closest<HTMLElement>('[data-i]');
    if (!el || t.closest('button, a, input, select')) return;
    if (e.pointerType !== 'mouse' && !t.closest('.grip')) return;
    pending = { el, id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  list.addEventListener('pointermove', (e) => {
    if (d) { if (e.pointerId === d.id) { d.cx = e.clientX; d.cy = e.clientY; layout(); } return; }
    if (pending && e.pointerId === pending.id && Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > DEAD) start(pending);
  });
  const up = (cancel: boolean) => (e: PointerEvent) => { if (d && e.pointerId === d.id) finish(cancel); pending = d ? pending : null; };
  list.addEventListener('pointerup', up(false));
  list.addEventListener('pointercancel', up(true));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && d) finish(true); });
  // A drag must not count as a click (which would select the card).
  list.addEventListener('click', (e) => { if (list.dataset.noclick) { e.stopPropagation(); e.preventDefault(); } }, true);
  list.addEventListener('dragstart', (e) => e.preventDefault());
}
