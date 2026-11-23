import { statusMatches } from './logic';

const root = document.querySelector<HTMLElement>('[data-http]');
if (root) {
  const input = root.querySelector<HTMLInputElement>('[name="q"]')!;
  const none = root.querySelector<HTMLElement>('[data-none-msg]')!;
  const rows = [...root.querySelectorAll<HTMLElement>('[data-code]')];
  const groups = [...root.querySelectorAll<HTMLElement>('[data-group]')];
  const filter = () => {
    for (const r of rows) r.hidden = !statusMatches(Number(r.dataset.code), r.dataset.hay!, input.value);
    for (const g of groups) g.hidden = !g.querySelector('[data-code]:not([hidden])');
    none.hidden = groups.some((g) => !g.hidden);
  };
  input.addEventListener('input', filter);
}
