// Search on the tools overview: filters the cards as you type. The field itself is components/ExpandSearch.astro.
import './xsearch';
import { matches } from './toolfilter';

const input = document.querySelector<HTMLInputElement>('#xs-input');
if (input) {
  const count = document.querySelector<HTMLElement>('[data-xs-count]')!;
  const cards = [...document.querySelectorAll<HTMLElement>('[data-hay]')];
  const groups = [...document.querySelectorAll<HTMLElement>('[data-group]')];
  const empty = document.querySelector<HTMLElement>('[data-ts-empty]')!;

  function filter() {
    const q = input!.value;
    let shown = 0;
    for (const c of cards) { const ok = matches(c.dataset.hay!, q); c.hidden = !ok; if (ok) shown++; }
    for (const g of groups) g.hidden = !g.querySelector('[data-hay]:not([hidden])');
    empty.hidden = shown > 0;
    count.hidden = !q.trim();
    count.textContent = `${shown}/${cards.length}`;
    history.replaceState(null, '', q.trim() ? `?q=${encodeURIComponent(q.trim())}` : location.pathname);
  }

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cards.find((c) => !c.hidden)?.click(); } });
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  filter();
}
