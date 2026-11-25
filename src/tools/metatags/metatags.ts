import { displayUrl, lengthState, metaTags, type Spec } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-metatags]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const out = q('[data-out]');
  const text = (sel: string, v: string, fallback = '') => { q(sel).textContent = v || fallback; };

  const spec = (): Spec => ({
    title: f('title').value, description: f('description').value, url: f('url').value, image: f('image').value,
    siteName: f('siteName').value, type: f('type').value, card: f('card').value, locale: f('locale').value,
    themeColor: f('themeColor').value, noindex: f('noindex').checked,
  });

  function counter(name: string, max: number) {
    const v = f(name).value, el = q(`[data-count="${name}"]`);
    const state = lengthState(v, max);
    el.textContent = `${s.chars.replace('{n}', String([...v.trim()].length)).replace('{max}', String(max))}${state === 'long' ? ` · ${s.long}` : ''}`;
    el.classList.toggle('long', state === 'long');
  }

  function render() {
    const o = spec();
    counter('title', 60); counter('description', 160);
    out.textContent = o.title.trim() ? metaTags(o) : s.empty;
    text('[data-su]', displayUrl(o.url), 'example.com');
    text('[data-st]', o.title.trim(), s.titlePh);
    text('[data-sd]', o.description.trim(), s.descriptionPh);
    const card = q('[data-share]'), pic = q('[data-si]');
    card.dataset.card = o.card;
    pic.hidden = !o.image.trim();
    pic.style.backgroundImage = o.image.trim() && /^https?:\/\//i.test(o.image.trim()) ? `url("${o.image.trim().replace(/"/g, '%22')}")` : '';
    text('[data-sh]', (o.siteName.trim() || displayUrl(o.url).split(' ')[0] || 'example.com'));
    text('[data-sti]', o.title.trim(), s.titlePh);
    text('[data-ssd]', o.description.trim(), s.descriptionPh);
  }

  q('[data-copy]').addEventListener('click', (e) => { if (spec().title.trim()) void copy(out.textContent ?? '', e.currentTarget as HTMLElement); });
  root.addEventListener('input', render);
  render();
}
