// Search on the tools overview: filters the cards as you type. The field itself is components/ExpandSearch.astro.
import './xsearch';
import { finds } from './toolfilter';

const input = document.querySelector<HTMLInputElement>('#xs-input');
if (input) {
  const count = document.querySelector<HTMLElement>('[data-xs-count]')!;
  const cards = [...document.querySelectorAll<HTMLElement>('[data-hay]')];
  const groups = [...document.querySelectorAll<HTMLElement>('[data-group]')];
  const empty = document.querySelector<HTMLElement>('[data-ts-empty]')!;
  const chips = [...document.querySelectorAll<HTMLAnchorElement>('[data-chip]')];
  const list = (v?: string) => (v ?? '').split(' ').filter(Boolean);
  const known = new Set(chips.map((c) => c.dataset.chip!).filter(Boolean));
  // The chosen category or topic lives in the URL hash (#pdf, #math); the search text in ?q=. Both survive a reload.
  // A card belongs to its category and to each of its topics.
  let cat = known.has(location.hash.slice(1)) ? location.hash.slice(1) : '';

  function filter() {
    const q = input!.value;
    let shown = 0;
    // a card is "found" when it matches the search; it is "shown" when it is also in the chosen category
    const found: Record<string, number> = {};
    for (const c of cards) {
      const keys = [c.closest<HTMLElement>('[data-group]')!.dataset.cat!, ...list(c.dataset.topics)];
      const ok = finds({ hay: c.dataset.hay!, accepts: list(c.dataset.in), produces: list(c.dataset.out) }, q);
      if (ok) for (const k of keys) found[k] = (found[k] ?? 0) + 1;
      const vis = ok && (!cat || keys.includes(cat));
      c.hidden = !vis;
      if (vis) shown++;
    }
    for (const g of groups) g.hidden = !g.querySelector('[data-hay]:not([hidden])');
    for (const ch of chips) {
      const id = ch.dataset.chip!;
      const n = id ? (found[id] ?? 0) : Object.values(found).reduce((a, b) => a + b, 0);
      ch.querySelector('[data-n]')!.textContent = String(n);
      ch.toggleAttribute('data-zero', n === 0);
      if (id === cat) ch.setAttribute('aria-current', 'true'); else ch.removeAttribute('aria-current');
    }
    empty.hidden = shown > 0;
    count.hidden = !q.trim();
    count.textContent = `${shown}/${cards.length}`;
    history.replaceState(null, '', location.pathname + (q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '') + (cat ? `#${cat}` : ''));
  }

  for (const ch of chips) ch.addEventListener('click', (e) => { e.preventDefault(); cat = ch.dataset.chip!; filter(); });
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (known.has(h) || !h) { cat = h; filter(); } });
  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cards.find((c) => !c.hidden)?.click(); } });
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  filter();
}
