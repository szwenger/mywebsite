// Theme switch. Three motions, picked by themeMotion():
//  ink  - desktop: the new theme spreads from the toggle through a ragged turbulence-displaced blob (View Transition + SVG mask).
//  veil - phones and tablets: a veil in the old background colour fades in, the theme flips behind it, the veil fades out. Opacity only.
//  none - reduced motion, or no click position.
// The ink reveal re-rasterises an SVG turbulence filter on every frame of a full-screen mask. That is fine on a desktop GPU, but on iPhone it
// stutters, and on iPad Safari the old page flashes back once the transition ends. So touch devices never take that path.
const BLOB = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><filter id="f" x="-25%" y="-25%" width="150%" height="150%">` +
  `<feTurbulence type="fractalNoise" baseFrequency=".016" numOctaves="4" seed="7"/><feDisplacementMap in="SourceGraphic" scale="80"/></filter>` +
  `<g filter="url(#f)"><circle cx="200" cy="200" r="150"/><circle cx="330" cy="120" r="22"/><circle cx="85" cy="300" r="18"/><circle cx="310" cy="320" r="12"/></g></svg>`,
);
const INK = `url("data:image/svg+xml,${BLOB}")`;

export type ThemeMotion = 'none' | 'ink' | 'veil';
export interface MotionEnv { origin: boolean; reduced: boolean; viewTransitions: boolean; touch: boolean }

export function themeMotion(e: MotionEnv): ThemeMotion {
  if (!e.origin || e.reduced) return 'none';
  return e.viewTransitions && !e.touch ? 'ink' : 'veil';
}

/** Flips the theme with every transition switched off for one frame, so colours never wave through their own transitions. */
function apply(next: 'dark' | 'light'): void {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* storage blocked: the choice lasts for this page only */ }
  getComputedStyle(root).color; // force the style recalculation while transitions are off
  requestAnimationFrame(() => root.classList.remove('theme-switching'));
}

function ink(next: 'dark' | 'light', x: number, y: number): void {
  const size = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 0.3;
  document.documentElement.style.setProperty('--ink', INK);
  document.startViewTransition(() => apply(next)).ready.then(() => {
    document.documentElement.animate(
      { maskSize: ['0px', `${size}px`], maskPosition: [`${x}px ${y}px`, `${x - size / 2}px ${y - size / 2}px`] },
      { duration: 1400, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

function veil(next: 'dark' | 'light'): void {
  if (document.querySelector('.theme-veil')) return; // a switch is already running
  const v = document.createElement('div');
  v.className = 'theme-veil';
  v.setAttribute('aria-hidden', 'true');
  v.style.background = getComputedStyle(document.body).backgroundColor;
  document.body.append(v);
  v.animate({ opacity: [0, 1] }, { duration: 140, easing: 'ease-out', fill: 'forwards' }).finished.then(() => {
    apply(next);
    // two frames, so the new theme is painted under the opaque veil before it lifts
    requestAnimationFrame(() => requestAnimationFrame(() => {
      v.animate({ opacity: [1, 0] }, { duration: 260, easing: 'ease-in', fill: 'forwards' }).finished.then(() => v.remove(), () => v.remove());
    }));
  }, () => { apply(next); v.remove(); });
}

export function toggleTheme(origin?: { x: number; y: number }): 'dark' | 'light' {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  const motion = themeMotion({
    origin: !!origin,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    viewTransitions: !!document.startViewTransition,
    touch: matchMedia('(pointer: coarse)').matches || CSS.supports('-webkit-touch-callout', 'none'), // second test: iPadOS with a mouse still counts
  });
  if (motion === 'ink') ink(next, origin!.x, origin!.y);
  else if (motion === 'veil') veil(next);
  else apply(next);
  return next;
}

export function initTheme(): void {
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    const r = b.getBoundingClientRect();
    toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }));
}
