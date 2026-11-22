import { copy } from '../dom';
import { buildUtm, KEYS } from './logic';

const root = document.querySelector<HTMLElement>('[data-utm]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const out = q<HTMLTextAreaElement>('[name="out"]');
  const open = q<HTMLAnchorElement>('[data-open]');

  function render() {
    const err = q('[data-error]');
    err.hidden = true;
    open.hidden = true;
    out.value = '';
    if (!f('url').value.trim()) return;
    try {
      out.value = buildUtm(f('url').value, Object.fromEntries(KEYS.map((k) => [k, f(k).value])), f('lower').checked);
      open.href = out.value;
      open.hidden = false;
    } catch (e) {
      const code = (e as Error).message;
      // Asking for the source before the link is typed would just be noise; only complain once there is a link.
      err.hidden = false;
      err.textContent = code === 'required' ? s.required : s.url_;
    }
  }
  root.addEventListener('input', render);
  root.addEventListener('change', render);
  q('[data-copy]').addEventListener('click', (e) => { if (out.value) copy(out.value, e.currentTarget as HTMLElement, '✓'); });
}
