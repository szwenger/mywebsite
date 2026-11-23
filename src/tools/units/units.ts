import { CATEGORIES, category, convert, convertBase, format, parseNumber, type Unit } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-units]');
if (root) init(root);

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.s!) as { locale: string; cats: Record<string, string>; names: Record<string, string>; copied: string };
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const chips = q('[data-cats]'), val = q<HTMLInputElement>('[name=value]'), from = q<HTMLSelectElement>('[name=from]'), to = q<HTMLSelectElement>('[name=to]');
  const out = q('[data-out]'), table = q('[data-table]'), ctxRow = q('[data-ctx]');
  const rem = q<HTMLInputElement>('[name=rem]'), ppi = q<HTMLInputElement>('[name=ppi]');
  const sub = (n: string) => n.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
  let cat = CATEGORIES[0].id;

  /** The unit's name in the page language: the browser's own for the sanctioned units, else the table from the page, else English. */
  const label = (x: Unit) => {
    if (x.intl) {
      try { const p = new Intl.NumberFormat(s.locale, { style: 'unit', unit: x.intl, unitDisplay: 'long' }).formatToParts(1).find((t) => t.type === 'unit'); if (p) return p.value.charAt(0).toLocaleUpperCase(s.locale) + p.value.slice(1); } catch { /* unit unknown to this browser */ }
    }
    return s.names[`${cat}/${x.id}`] ?? s.names[x.id] ?? x.name;
  };
  const option = (x: Unit) => { const o = document.createElement('option'); o.value = x.id; o.textContent = `${x.id} · ${label(x)}`; return o; };

  chips.replaceChildren(...CATEGORIES.map((c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.cat = c.id; b.textContent = s.cats[c.id];
    b.addEventListener('click', () => pick(c.id));
    return b;
  }));

  function pick(id: string, keep = false) {
    cat = id;
    for (const b of chips.querySelectorAll<HTMLElement>('[data-cat]')) b.setAttribute('aria-pressed', String(b.dataset.cat === id));
    const units = category(id).units;
    const [a, b] = [from.value, to.value];
    from.replaceChildren(...units.map(option)); to.replaceChildren(...units.map(option));
    from.value = keep && units.some((x) => x.id === a) ? a : units[0].id;
    to.value = keep && units.some((x) => x.id === b) ? b : units[Math.min(1, units.length - 1)].id;
    ctxRow.hidden = !category(id).ctx;
    for (const h of root.querySelectorAll<HTMLElement>('[data-hint]')) h.hidden = h.dataset.hint !== id;
    const base = !!category(id).base;
    val.inputMode = base ? 'text' : 'decimal';
    if (base) { from.value = '10'; to.value = '16'; } // a number typed in another category is read as decimal
    render();
  }

  function render() {
    const base = !!category(cat).base;
    const ctx = { rem: parseNumber(rem.value) || undefined, ppi: parseNumber(ppi.value) || undefined };
    const n = base ? NaN : parseNumber(val.value);
    // One conversion for both kinds: a number string for the bases, a formatted number otherwise.
    const show = (to: string) => base ? (convertBase(val.value, Number(from.value), Number(to)) || '–') : format(Number.isNaN(n) ? NaN : convert(cat, from.value, to, n, ctx), s.locale);
    const units = category(cat).units;
    table.replaceChildren(...units.map((x) => {
      const r = document.createElement('button');
      r.type = 'button'; r.className = 'urow'; r.dataset.id = x.id;
      const text = show(x.id);
      r.innerHTML = '<span class="un"></span><b class="uv"></b>';
      r.querySelector('.un')!.textContent = `${label(x)} (${x.id})`;
      r.querySelector('.uv')!.textContent = text;
      r.addEventListener('click', () => { to.value = x.id; render(); void copy(text, r.querySelector<HTMLElement>('.uv')!, s.copied); });
      if (x.id === to.value) r.setAttribute('aria-current', 'true');
      return r;
    }));
    const res = show(to.value);
    if (base ? res === '–' : Number.isNaN(n)) { out.textContent = ''; return; }
    out.textContent = base ? `${val.value.trim()}${sub(from.value)} = ${res}${sub(to.value)}` : `${format(n, s.locale)} ${from.value} = ${res} ${to.value}`;
  }

  val.addEventListener('input', render);
  from.addEventListener('change', render);
  to.addEventListener('change', render);
  rem.addEventListener('input', render);
  ppi.addEventListener('input', render);
  q('[data-swap]').addEventListener('click', () => { [from.value, to.value] = [to.value, from.value]; render(); });
  val.value = '1';
  pick(CATEGORIES[0].id);
}
