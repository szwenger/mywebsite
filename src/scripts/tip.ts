// One tooltip for every icon button (.ib, the accessible name is the tip). The first one waits 450 ms,
// while any tip is open (or was a moment ago) the next shows at once. Touch gets none: a tap is the action.
const DELAY = 450, WARM = 300;
let box: HTMLDivElement | undefined, timer = 0, cool = 0, current: Element | null = null;

function show(el: HTMLElement, instant: boolean): void {
  const text = el.getAttribute('aria-label');
  if (!text) return;
  box ??= Object.assign(document.createElement('div'), { className: 'tip', role: 'tooltip' });
  if (!box.isConnected) document.body.append(box);
  box.textContent = text;
  box.classList.toggle('instant', instant);
  const r = el.getBoundingClientRect(), w = box.offsetWidth;
  box.style.left = `${Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2))}px`;
  box.style.top = `${r.bottom + 8 > innerHeight - 30 ? r.top - box.offsetHeight - 8 : r.bottom + 8}px`;
  box.classList.add('on');
}
function hide(): void {
  clearTimeout(timer); current = null;
  if (box?.classList.contains('on')) { box.classList.remove('on'); cool = Date.now() + WARM; }
}
function over(e: Event): void {
  const el = (e.target as Element).closest<HTMLElement>('.ib');
  if (!el || el === current) return;
  hide(); current = el;
  const warm = Date.now() < cool;
  if (warm) show(el, true); else timer = window.setTimeout(() => show(el, false), DELAY);
}
export function initTips(): void {
  if (!matchMedia('(hover: hover)').matches) return;
  document.addEventListener('pointerover', over);
  document.addEventListener('pointerout', (e) => { if ((e.target as Element).closest?.('.ib')) hide(); });
  document.addEventListener('focusin', (e) => { const el = (e.target as Element).closest?.<HTMLElement>('.ib'); if (el && el.matches(':focus-visible')) { hide(); current = el; show(el, true); } });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  document.addEventListener('pointerdown', hide);
}
