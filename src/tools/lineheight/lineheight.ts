import { lineHeight, measureWidth, recommendedRatio } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-lh]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const num = (n: string) => Number(f(n).value);
  const nice = (v: number) => (Number.isFinite(v) ? String(Number(v.toFixed(3))) : '–');
  const use = q<HTMLButtonElement>('[data-use]');

  function render() {
    const size = num('size'), measure = num('measure');
    const r = recommendedRatio(size, measure);
    use.textContent = Number.isFinite(r) ? s.recommended.replace('{r}', String(r)) : s.recommend;
    use.dataset.r = String(r);
    const o = lineHeight({ size, ratio: num('ratio'), root: num('root'), grid: num('grid') });
    const w = measureWidth(measure, size);
    q('[data-px]').textContent = `${nice(o.px)} px`;
    q('[data-rem]').textContent = `${nice(o.rem)} rem`;
    q('[data-unitless]').textContent = o.unitless || '–';
    q('[data-snapped]').textContent = `${nice(o.snapped)} px`;
    q('[data-width]').textContent = Number.isFinite(w.px) ? `${w.ch} ch (≈ ${w.px} px)` : '–';
    q('[data-css]').textContent = Number.isFinite(o.px) ? `font-size: ${nice(size)}px;\nline-height: ${o.unitless};\nmax-width: ${w.ch}ch;` : '';
    const sample = q('[data-sample]');
    sample.style.fontSize = Number.isFinite(size) && size > 0 ? `${size}px` : '';
    sample.style.lineHeight = Number.isFinite(o.px) ? o.unitless : '';
    sample.style.maxWidth = Number.isFinite(w.px) ? `${w.ch}ch` : '';
  }

  use.addEventListener('click', () => { f('ratio').value = use.dataset.r!; render(); });
  q('[data-copy]').addEventListener('click', (e) => { const t = q('[data-css]').textContent; if (t) void copy(t, e.currentTarget as HTMLElement); });
  root.addEventListener('input', render);
  render();
}
