import { contrast, formats, grades, parseColor, toHex } from './logic';
import { copy } from '../dom';
import { initExtras } from './extras';

const root = document.querySelector<HTMLElement>('[data-color]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement>(`[name="${n}"]`)!;
  const pick = (n: string) => root.querySelector<HTMLInputElement>(`[data-pick="${n}"]`)!;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const el = (tag: string, text = '', cls = '') => Object.assign(document.createElement(tag), { textContent: text, className: cls });

  function render() {
    const fg = parseColor(f('fg').value), bg = parseColor(f('bg').value);
    q('[data-error]').hidden = !!(fg && bg);
    if (!fg || !bg) return;
    pick('fg').value = toHex({ ...fg, a: 1 }).slice(0, 7);
    pick('bg').value = toHex({ ...bg, a: 1 }).slice(0, 7);
    const sample = q('[data-sample]');
    sample.style.color = toHex(fg); sample.style.background = toHex(bg);
    const ratio = contrast(fg, bg);
    q('[data-ratio]').textContent = `${s.contrast}: ${ratio.toFixed(2)} : 1`;
    const g = grades(ratio) as Record<string, boolean>;
    root.querySelectorAll<HTMLElement>('[data-g]').forEach((c) => {
      const ok = g[c.dataset.g!];
      c.className = ok ? 'ok' : 'no';
      c.textContent = `${ok ? '✓' : '✗'} ${ok ? s.pass : s.fail}`;
    });
    q('[data-formats]').replaceChildren(...Object.entries(formats(fg)).map(([name, value]) => {
      const tr = el('tr'), th = el('th', name), td = el('td'), b = el('button', value, 'val mono') as HTMLButtonElement;
      b.type = 'button'; b.title = s.copy;
      b.addEventListener('click', () => copy(value, b, '✓'));
      td.append(b); tr.append(th, td);
      return tr;
    }));
  }

  const extras = initExtras(root);
  const tab = () => root.querySelector<HTMLInputElement>('[name="tab"]:checked')!.value;
  function showTab() {
    root!.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => { el.hidden = el.dataset.when !== tab(); });
    (tab() === 'contrast' ? render : extras[tab()])?.();
  }
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.pick) f(t.dataset.pick).value = t.value;
    if (t.closest('[data-when="contrast"]')) render();
  });
  root.addEventListener('change', (e) => { if ((e.target as HTMLInputElement).name === 'tab') showTab(); });
  q('[data-swap]').addEventListener('click', () => { const a = f('fg').value; f('fg').value = f('bg').value; f('bg').value = a; render(); });
  render();
}
