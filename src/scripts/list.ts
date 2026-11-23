// Search and pagination for any [data-list] block. Without JS every item simply stays visible.
//   <div data-list data-per="10" data-key="p">
//     <input type="search" data-list-search>              optional
//     <div data-item data-text="normalized words">…</div> the items
//     <p data-list-empty hidden>…</p>                     optional "nothing found"
//     <nav data-list-pager data-prev data-next data-page></nav>
//   </div>
// State lives in the URL (?q=…&p=2) via replaceState, so a reload or a shared link lands on the same view.
import { clampPage, matches, pageCount, pageList, pageRange } from '../lib/list';
import { icons, type IconName } from '../data/icons';

function init(root: HTMLElement) {
  const per = Number(root.dataset.per) || 12;
  const key = root.dataset.key || 'p';
  const items = [...root.querySelectorAll<HTMLElement>('[data-item]')];
  const search = root.querySelector<HTMLInputElement>('[data-list-search]');
  const pager = root.querySelector<HTMLElement>('[data-list-pager]');
  const empty = root.querySelector<HTMLElement>('[data-list-empty]');

  const params = new URLSearchParams(location.search);
  let query = search ? params.get('q') ?? '' : '';
  let page = Number(params.get(key)) || 1;
  if (search) search.value = query;

  function drawPager(count: number) {
    if (!pager) return;
    const nums = pageList(count, page);
    pager.hidden = nums.length === 0;
    pager.replaceChildren();
    const go = (p: number) => { page = p; render(true); };
    const button = (label: IconName | string, aria: string, p: number, disabled = false) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', aria); b.disabled = disabled;
      if (label in icons) b.innerHTML = `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[label as IconName]}</svg>`;
      else b.textContent = label;
      if (p === page && /^\d+$/.test(label)) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => go(p));
      return b;
    };
    pager.append(button('prev', pager.dataset.prev ?? 'Previous', page - 1, page <= 1));
    for (const n of nums) {
      if (n === '…') { const s = document.createElement('span'); s.textContent = '…'; s.setAttribute('aria-hidden', 'true'); pager.append(s); }
      else pager.append(button(String(n), `${pager.dataset.page ?? 'Page'} ${n}`, n));
    }
    pager.append(button('next', pager.dataset.next ?? 'Next', page + 1, page >= count));
  }

  function render(scroll = false) {
    const hits = items.filter((el) => matches(el.dataset.text ?? '', query));
    const count = pageCount(hits.length, per);
    page = clampPage(page, count);
    const [a, b] = pageRange(hits.length, per, page);
    const shown = new Set(hits.slice(a, b));
    for (const el of items) el.hidden = !shown.has(el);
    if (empty) empty.hidden = hits.length > 0;
    drawPager(count);

    const url = new URL(location.href);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    if (page > 1) url.searchParams.set(key, String(page)); else url.searchParams.delete(key);
    history.replaceState(null, '', url);
    if (scroll) root.scrollIntoView({ block: 'start' });
  }

  search?.addEventListener('input', () => { query = search.value; page = 1; render(); });
  render();
}

document.querySelectorAll<HTMLElement>('[data-list]').forEach(init);
