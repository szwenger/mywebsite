import { parseJson, printJson } from './logic';
import { copy, download } from '../dom';

const root = document.querySelector<HTMLElement>('[data-json]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = <T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(n: string) => root.querySelector<T>(`[name="${n}"]`)!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-copy],[data-save]');

  function render() {
    const src = f<HTMLTextAreaElement>('src').value;
    const out = f<HTMLTextAreaElement>('out');
    if (!src.trim()) { out.value = ''; status.className = 'note'; status.textContent = s.empty; buttons.forEach((b) => (b.disabled = true)); return; }
    const r = parseJson(src, f('lenient').checked);
    buttons.forEach((b) => (b.disabled = !r.ok));
    if (!r.ok) {
      out.value = '';
      status.className = 'note bad';
      status.textContent = s[r.err.code].replace('{ch}', JSON.stringify(r.err.ch)).replace('{line}', String(r.err.line)).replace('{col}', String(r.err.col));
      return;
    }
    const ind = f('indent').value;
    out.value = printJson(r.node, { indent: ind === 'tab' ? 'tab' : Number(ind), sort: f('sort').checked });
    status.className = 'note good';
    status.textContent = s.valid;
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(f<HTMLTextAreaElement>('out').value, e.currentTarget as HTMLElement));
  root.querySelector('[data-save]')!.addEventListener('click', () => download(f<HTMLTextAreaElement>('out').value, 'data.json', 'application/json'));
  render();
}
