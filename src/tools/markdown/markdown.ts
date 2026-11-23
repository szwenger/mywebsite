import 'katex/dist/katex.min.css';
import { counts, firstHeading, htmlDocument, markdownToHtml } from './logic';
import { copy, download } from '../dom';

const root = document.querySelector<HTMLElement>('[data-md]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const src = q<HTMLTextAreaElement>('[name="src"]'), view = q('[data-view]'), stat = q('[data-stat]');
  const KEY = 'md-draft';

  function render() {
    const html = markdownToHtml(src.value);
    view.innerHTML = html || `<p class="meta">${s.empty}</p>`;
    const c = counts(src.value);
    stat.textContent = `${c.words} ${s.words} · ${c.chars} ${s.chars}`;
    try { localStorage.setItem(KEY, src.value); } catch { /* private mode */ }
  }

  src.addEventListener('input', render);
  q<HTMLInputElement>('[data-file]').addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) { src.value = await f.text(); render(); }
    (e.target as HTMLInputElement).value = '';
  });
  q('[data-copy]').addEventListener('click', (e) => copy(markdownToHtml(src.value, true), e.currentTarget as HTMLElement, '✓'));
  q('[data-html]').addEventListener('click', () => download(htmlDocument(markdownToHtml(src.value, true), firstHeading(src.value) || 'Document', root.dataset.lang), 'document.html', 'text/html'));
  q('[data-md-save]').addEventListener('click', () => download(src.value, 'document.md', 'text/markdown'));

  let saved = '';
  try { saved = localStorage.getItem(KEY) ?? ''; } catch { /* private mode */ }
  src.value = saved || s.sample;
  render();
}
