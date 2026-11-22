// Language menu: the letters of the code in the header (EN, DE, RU) roll over one after another when the language
// changes. The page reloads for the new language, so the roll plays twice: from the old code to the new one when you
// click (then we navigate), and again on the new page, which starts on the old code and rolls to the new one.
const KEY = 'galuin-langroll';
const STEP = 70; // ms between letters
const DUR = 360; // ms for one letter

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const keep = (f: () => void) => { try { f(); } catch { /* storage unavailable: the roll just does not replay on arrival */ } };

/** Replaces the text of `el` with rolling slots that move from the letters of `from` to those of `to`. */
function roll(el: HTMLElement, from: string, to: string) {
  const cell = (c: string) => Object.assign(document.createElement('span'), { textContent: c });
  el.classList.remove('go');
  el.replaceChildren(...[...to].map((c, i) => {
    const slot = document.createElement('span');
    slot.className = 'slot';
    const col = document.createElement('span');
    col.className = 'col';
    col.style.transitionDelay = `${i * STEP}ms`;
    col.append(cell(from[i] ?? ' '), cell(c));
    slot.append(col);
    return slot;
  }));
  // two frames so the browser paints the start position before the class starts the transition
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('go')));
}

const code = document.querySelector<HTMLElement>('[data-langcode]');
if (code) {
  const now = code.textContent!.trim();

  let from: string | null = null;
  keep(() => { from = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); });
  if (from && from !== now && !still()) roll(code, from, now);

  // coming back with the browser's back button restores the page as it was left, mid-roll: put the code back
  addEventListener('pageshow', (e) => { if (e.persisted) { code.classList.remove('go'); code.textContent = now; } });

  document.querySelectorAll<HTMLAnchorElement>('.langmenu a[data-lang]').forEach((a) => a.addEventListener('click', (e) => {
    if (still() || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    keep(() => sessionStorage.setItem(KEY, now));
    a.closest('details')?.removeAttribute('open');
    const to = a.dataset.lang!.toUpperCase();
    roll(code, now, to);
    setTimeout(() => { location.href = a.href; }, DUR + STEP * (to.length - 1) + 80);
  }));
}
