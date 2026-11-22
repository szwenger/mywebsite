import { decode, decodeJwt, encode, type Mode } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-encode]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as { err: Record<string, string>; claims: Record<string, string> };
  const f = (n: string) => root.querySelector<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(`[name="${n}"]`)!;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const error = q('[data-error]');
  const dir = () => root.querySelector<HTMLInputElement>('[name="dir"]:checked')!.value;

  function render() {
    const mode = f('mode').value;
    const jwt = mode === 'jwt';
    q('[data-dir]').hidden = jwt;
    q('[data-plain]').hidden = jwt;
    q('[data-jwt]').hidden = true;
    error.hidden = true;
    const input = f('input').value;
    if (!input.trim()) { f('out').value = ''; return; }
    try {
      if (jwt) {
        const j = decodeJwt(input);
        q('[data-jwt]').hidden = false;
        q('[data-jwt-header]').textContent = JSON.stringify(j.header, null, 2);
        q('[data-jwt-payload]').textContent = JSON.stringify(j.payload, null, 2);
        q('[data-times-title]').hidden = !j.times.length;
        q('[data-jwt-times]').replaceChildren(...j.times.map((t) => {
          const tr = document.createElement('tr');
          const a = document.createElement('td'), b = document.createElement('td');
          a.textContent = `${t.claim} (${s.claims[t.claim]})`; b.textContent = t.iso.replace('T', ' ').slice(0, 19);
          tr.append(a, b);
          return tr;
        }));
      } else {
        f('out').value = (dir() === 'enc' ? encode : decode)(mode as Mode, input);
      }
    } catch (e) {
      f('out').value = '';
      error.hidden = false;
      error.textContent = s.err[(e as Error).message] ?? (e as Error).message;
    }
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  q('[data-copy]').addEventListener('click', (e) => copy(f('out').value, e.currentTarget as HTMLElement));
  q('[data-use]').addEventListener('click', () => { f('input').value = f('out').value; render(); });
  render();
}
