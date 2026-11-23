import 'katex/dist/katex.min.css';
import { SNIPPETS, insertSnippet, renderLatex, toMathml } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-latex]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const src = q<HTMLTextAreaElement>('[name="src"]'), view = q('[data-view]'), err = q('[data-error]');
  const display = q<HTMLInputElement>('[name="display"]'), size = q<HTMLInputElement>('[name="size"]');
  let ok = false;

  function render() {
    const r = renderLatex(src.value, display.checked);
    ok = r.ok && src.value.trim() !== '';
    err.hidden = r.ok;
    err.textContent = r.ok ? '' : r.error;
    if (r.ok) view.innerHTML = r.html;
    view.style.fontSize = `${size.value}%`;
    for (const b of root!.querySelectorAll<HTMLButtonElement>('[data-needs]')) b.disabled = !ok;
    try { localStorage.setItem('latex-draft', src.value); } catch { /* private mode */ }
  }

  const chips = q('[data-chips]');
  for (const sn of SNIPPETS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn alt chip'; b.textContent = sn.label; b.title = sn.tex.replace('$', '');
    b.addEventListener('click', () => {
      const r = insertSnippet(src.value, src.selectionStart, src.selectionEnd, sn.tex);
      src.value = r.text; src.focus(); src.setSelectionRange(r.cursor, r.cursor); render();
    });
    chips.append(b);
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  q('[data-copy-tex]').addEventListener('click', (e) => copy(src.value, e.currentTarget as HTMLElement, '✓'));
  q('[data-copy-mml]').addEventListener('click', (e) => { try { void copy(toMathml(src.value, display.checked), e.currentTarget as HTMLElement, '✓'); } catch { /* shown as error already */ } });

  let saved = '';
  try { saved = localStorage.getItem('latex-draft') ?? ''; } catch { /* private mode */ }
  src.value = saved || s.sample;
  render();
}
