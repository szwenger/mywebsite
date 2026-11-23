// The palette, gradient and colour-blindness panels of the colour tool.
import { KINDS, SCHEMES, gradient, harmony, luminance, parseColor, shades, simulate, toHex, type Rgb, type Scheme } from './logic';
import { copy } from '../dom';

export function initExtras(root: HTMLElement) {
  const f = (n: string) => root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${n}"]`)!;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const fail = (id: string, bad: boolean) => { q(`[data-xerror="${id}"]`).hidden = !bad; };

  /** A colour chip showing its hex code; clicking copies it. */
  function swatch(c: Rgb, label = ''): HTMLButtonElement {
    const hex = toHex(c).slice(0, 7);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sw';
    b.style.background = hex;
    b.style.color = luminance(c) > 0.35 ? '#111' : '#fff';
    b.textContent = label ? `${label} ${hex}` : hex;
    b.addEventListener('click', () => copy(hex, b, '✓'));
    return b;
  }

  function palette() {
    const c = parseColor(f('base').value);
    fail('palette', !c);
    if (!c) return;
    q('[data-harmony]').replaceChildren(...harmony(c, f('scheme').value as Scheme).map((x) => swatch(x)));
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    q('[data-shades]').replaceChildren(...shades(c).map((x, i) => swatch(x, String(steps[i]))));
  }

  function grad() {
    const a = parseColor(f('ga').value), b = parseColor(f('gb').value);
    fail('gradient', !(a && b));
    q('[name="stepsOut"]').textContent = f('steps').value;
    if (!a || !b) return;
    const stops = gradient(a, b, Number(f('steps').value)).map((x) => toHex(x).slice(0, 7));
    q('[data-gradbar]').style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
    q('[data-gradstops]').replaceChildren(...stops.map((hex) => swatch(parseColor(hex)!)));
    q('[data-css]').textContent = `background: linear-gradient(90deg, ${stops.join(', ')});`;
  }

  function blind() {
    const colours = f('list').value.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean).map((x) => parseColor(x));
    const ok = colours.filter((x): x is Rgb => !!x);
    fail('blind', !ok.length || ok.length < colours.length);
    q('[data-blind]').replaceChildren(...ok.map((c) => {
      const row = document.createElement('div');
      row.className = 'brow';
      row.append(swatch(c), ...KINDS.map((k) => swatch(simulate(c, k))));
      return row;
    }));
  }

  const handlers: Record<string, () => void> = { palette, gradient: grad, blind };
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.pickto) f(t.dataset.pickto).value = t.value;
    const panel = t.closest<HTMLElement>('[data-when]')?.dataset.when;
    if (panel) handlers[panel]?.();
  });
  q('[data-copycss]').addEventListener('click', (e) => copy(q('[data-css]').textContent ?? '', e.currentTarget as HTMLElement));
  return handlers;
}
