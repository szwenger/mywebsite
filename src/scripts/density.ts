// Grid size toggle on the videos page: 'large' or 'small', remembered in this browser only.
const root = document.querySelector<HTMLElement>('[data-density]');
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-density-set]')];

function apply(size: string) {
  if (!root) return;
  root.dataset.density = size;
  for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.densitySet === size));
}

let saved: string | null = null;
try { saved = localStorage.getItem('videoDensity'); } catch { /* storage blocked: default size */ }
if (saved === 'small' || saved === 'large') apply(saved);

for (const b of buttons) {
  b.addEventListener('click', () => {
    const size = b.dataset.densitySet ?? 'large';
    apply(size);
    try { localStorage.setItem('videoDensity', size); } catch { /* ignore */ }
  });
}
