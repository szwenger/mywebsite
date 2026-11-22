import { chmodWords, octal, parseMode, symbolic } from './logic';

const root = document.querySelector<HTMLElement>('[data-chmod]');
if (root) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const boxes = [...root.querySelectorAll<HTMLInputElement>('[data-bit]')];
  const field = q<HTMLInputElement>('[name="mode"]');

  const show = (mode: number) => {
    q('[data-octal]').textContent = octal(mode);
    q('[data-sym]').textContent = symbolic(mode);
    q('[data-cmd]').textContent = `chmod ${octal(mode)} file   # ${chmodWords(mode)}`;
    for (const b of boxes) b.checked = !!(mode & (1 << Number(b.dataset.bit)));
  };
  field.addEventListener('input', () => {
    const m = parseMode(field.value);
    q('[data-error]').hidden = m !== null || !field.value.trim();
    q('[data-ok]').hidden = m === null;
    if (m !== null) show(m);
  });
  for (const b of boxes) b.addEventListener('change', () => {
    const m = boxes.reduce((a, x) => (x.checked ? a | (1 << Number(x.dataset.bit)) : a), 0);
    field.value = octal(m);
    q('[data-error]').hidden = true;
    q('[data-ok]').hidden = false;
    show(m);
  });
  root.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) => b.addEventListener('click', () => { field.value = b.dataset.preset!; field.dispatchEvent(new Event('input')); }));
  field.dispatchEvent(new Event('input'));
}
