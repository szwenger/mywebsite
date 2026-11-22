import { stats, transforms } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-textkit]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const loc = root.dataset.lang!;
  const area = root.querySelector<HTMLTextAreaElement>('[name="text"]')!;
  const undo = root.querySelector<HTMLButtonElement>('[data-undo]')!;
  const num = new Intl.NumberFormat(loc);
  const history: string[] = [];

  function update() {
    const st = stats(area.value) as unknown as Record<string, number>;
    root!.querySelectorAll<HTMLElement>('[data-stat]').forEach((dd) => {
      const v = st[dd.dataset.stat!];
      dd.textContent = dd.dataset.stat === 'readMin' ? (v === 0 ? '0' : v < 1 ? '< 1' : `${Math.round(v)}`) + ` ${s.min}` : num.format(v);
    });
    undo.disabled = history.length === 0;
  }

  area.addEventListener('input', () => { history.length = 0; update(); }); // typing starts a fresh undo history
  root.querySelectorAll<HTMLElement>('[data-t]').forEach((b) => b.addEventListener('click', () => {
    const next = transforms[b.dataset.t!](area.value);
    if (next === area.value) return;
    history.push(area.value);
    if (history.length > 20) history.shift();
    area.value = next;
    update();
  }));
  undo.addEventListener('click', () => { area.value = history.pop() ?? area.value; update(); });
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(area.value, e.currentTarget as HTMLElement));
  update();
}
