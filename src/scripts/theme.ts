// Theme switch. The new theme spreads from the toggle through a ragged ink blot (View Transition + mask), on every device.
// The blot is drawn once with an SVG turbulence filter and then rasterised to a bitmap. Scaling a bitmap mask is cheap; scaling the SVG
// itself re-runs the filter at the new size on every frame, which is what made iPhone stutter.
const SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><filter id="f" x="-25%" y="-25%" width="150%" height="150%">` +
  `<feTurbulence type="fractalNoise" baseFrequency=".016" numOctaves="4" seed="7"/><feDisplacementMap in="SourceGraphic" scale="80"/></filter>` +
  `<g filter="url(#f)"><circle cx="200" cy="200" r="150"/><circle cx="330" cy="120" r="22"/><circle cx="85" cy="300" r="18"/><circle cx="310" cy="320" r="12"/></g></svg>`,
);
const SVG_URL = `url("data:image/svg+xml,${SVG}")`;
const BITMAP = 768;

let inkMask: Promise<string> | undefined;
/** The blot as a PNG data URL, or the SVG itself when the canvas path fails. Built once. */
function ink(): Promise<string> {
  inkMask ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = BITMAP;
        c.getContext('2d')!.drawImage(img, 0, 0, BITMAP, BITMAP);
        resolve(`url("${c.toDataURL('image/png')}")`);
      } catch { resolve(SVG_URL); }
    };
    img.onerror = () => resolve(SVG_URL);
    img.src = `data:image/svg+xml,${SVG}`;
  });
  return inkMask;
}

export type ThemeMotion = 'none' | 'ink';
export interface MotionEnv { origin: boolean; reduced: boolean; viewTransitions: boolean }

export function themeMotion(e: MotionEnv): ThemeMotion {
  return e.origin && !e.reduced && e.viewTransitions ? 'ink' : 'none';
}

/** Flips the theme with every transition switched off for one frame, so colours never wave through their own transitions
 *  (the new-page snapshot would otherwise catch them half way, and the old colours flash back when the reveal ends). */
function apply(next: 'dark' | 'light'): void {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* storage blocked: the choice lasts for this page only */ }
  getComputedStyle(root).color; // force the style recalculation while transitions are off
  requestAnimationFrame(() => root.classList.remove('theme-switching'));
}

function reveal(next: 'dark' | 'light', x: number, y: number): void {
  const size = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 0.3;
  ink().then((mask) => {
    document.documentElement.style.setProperty('--ink', mask);
    return document.startViewTransition(() => apply(next)).ready;
  }).then(() => {
    document.documentElement.animate(
      { maskSize: ['0px', `${size}px`], maskPosition: [`${x}px ${y}px`, `${x - size / 2}px ${y - size / 2}px`] },
      { duration: 1400, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

export function toggleTheme(origin?: { x: number; y: number }): 'dark' | 'light' {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  const motion = themeMotion({
    origin: !!origin,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    viewTransitions: !!document.startViewTransition,
  });
  if (motion === 'ink') reveal(next, origin!.x, origin!.y);
  else apply(next);
  return next;
}

export function initTheme(): void {
  void ink(); // rasterise now, so the first click does not wait for it
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    const r = b.getBoundingClientRect();
    toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }));
}
