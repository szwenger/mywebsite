import { entropyBits, password, poolSets, token, uuid4, uuid7, type PasswordOpts } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-gen]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${n}"]`)!;
  const chk = (n: string) => (f(n) as HTMLInputElement).checked;
  const out = root.querySelector<HTMLElement>('[data-out]')!;
  const strength = root.querySelector<HTMLElement>('[data-strength]')!;
  const kind = () => root.querySelector<HTMLInputElement>('[name="kind"]:checked')!.value;

  function generate() {
    const k = kind();
    root!.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => { el.hidden = el.dataset.when !== k; });
    root!.querySelector('output')!.textContent = f('length').value;
    strength.hidden = k !== 'password';
    if (k === 'password') {
      const o: PasswordOpts = { length: Number(f('length').value), lower: chk('lower'), upper: chk('upper'), digits: chk('digits'), symbols: chk('symbols'), ambiguous: chk('ambiguous') };
      const pool = poolSets(o).join('').length;
      out.textContent = password(o) || s.none;
      strength.textContent = pool ? `${s.entropy}: ${Math.round(entropyBits(pool, o.length))} ${s.bits}` : '';
    } else if (k === 'uuid') {
      const make = f('ver').value === '7' ? uuid7 : uuid4;
      out.textContent = Array.from({ length: Math.min(100, Math.max(1, Number(f('count').value) || 1)) }, () => make()).join('\n');
    } else {
      out.textContent = token(Math.min(128, Math.max(8, Number(f('bytes').value) || 32)), f('enc').value as 'hex');
    }
  }

  root.addEventListener('input', generate);
  root.addEventListener('change', generate);
  root.querySelector('[data-regen]')!.addEventListener('click', generate);
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(out.textContent ?? '', e.currentTarget as HTMLElement));
  generate();
}
