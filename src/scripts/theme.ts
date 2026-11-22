// Ink-blot reveal: the new theme spreads from the toggle through a ragged turbulence-displaced blob.
const BLOB = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><filter id="f" x="-25%" y="-25%" width="150%" height="150%">` +
  `<feTurbulence type="fractalNoise" baseFrequency=".016" numOctaves="4" seed="7"/><feDisplacementMap in="SourceGraphic" scale="80"/></filter>` +
  `<g filter="url(#f)"><circle cx="200" cy="200" r="150"/><circle cx="330" cy="120" r="22"/><circle cx="85" cy="300" r="18"/><circle cx="310" cy="320" r="12"/></g></svg>`,
);
const INK = `url("data:image/svg+xml,${BLOB}")`;

function apply(next: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* storage blocked: the choice lasts for this page only */ }
}

export function toggleTheme(origin?: { x: number; y: number }): 'dark' | 'light' {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  if (!origin || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply(next);
    return next;
  }
  const { x, y } = origin;
  const size = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 0.3;
  document.startViewTransition(() => apply(next)).ready.then(() => {
    document.documentElement.animate(
      { maskSize: ['0px', `${size}px`], maskPosition: [`${x}px ${y}px`, `${x - size / 2}px ${y - size / 2}px`] },
      { duration: 1400, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
  return next;
}

export function initTheme(): void {
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    const r = b.getBoundingClientRect();
    const root = document.documentElement;
    root.style.setProperty('--ink', INK);
    toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }));
}
