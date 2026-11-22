import { copy, download } from '../dom';
import { csvToJson, detectDelim, jsonToCsv, parseCsv, type Delim } from './logic';

const root = document.querySelector<HTMLElement>('[data-csv]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = <T extends HTMLElement>(name: string) => q<T>(`[name="${name}"]`);
  const input = f<HTMLTextAreaElement>('in');
  const out = f<HTMLTextAreaElement>('out');
  const toJson = () => f<HTMLSelectElement>('dir').value === 'toJson';

  function render() {
    root!.querySelectorAll<HTMLElement>('[data-opt]').forEach((el) => { el.hidden = (el.dataset.opt === 'toJson') !== toJson(); });
    q('[data-error]').hidden = true;
    q('[data-count]').textContent = '';
    try {
      const picked = f<HTMLSelectElement>('delim').value as Delim | '';
      if (toJson()) {
        const delim = picked || detectDelim(input.value);
        const rows = parseCsv(input.value, delim);
        out.value = rows.length ? JSON.stringify(csvToJson(rows, f<HTMLInputElement>('header').checked, f<HTMLInputElement>('infer').checked), null, 2) : '';
        q('[data-count]').textContent = rows.length ? `${rows.length - (f<HTMLInputElement>('header').checked ? 1 : 0)} ${s.rows}, ${Math.max(...rows.map((r) => r.length))} ${s.cols}` : '';
      } else {
        if (!input.value.trim()) { out.value = ''; return; }
        let data: unknown;
        try { data = JSON.parse(input.value); } catch (e) { throw Object.assign(new Error((e as Error).message), { code: 'json' }); }
        out.value = jsonToCsv(data, picked || ',');
        q('[data-count]').textContent = `${out.value.split(/\r?\n/).length - 1} ${s.rows}`;
      }
    } catch (e) {
      out.value = '';
      const err = e as Error & { code?: string };
      q('[data-error]').hidden = false;
      q('[data-error]').textContent = err.code === 'json' ? s.json.replace('{e}', err.message) : (s[err.message] ?? err.message);
    }
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  q<HTMLInputElement>('[data-file]').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    input.value = await file.text();
    f<HTMLSelectElement>('dir').value = /\.json$/i.test(file.name) ? 'toCsv' : 'toJson';
    render();
  });
  q('[data-copy]').addEventListener('click', (e) => copy(out.value, e.currentTarget as HTMLElement, '✓'));
  q('[data-download]').addEventListener('click', () => { if (out.value) download(out.value, toJson() ? 'data.json' : 'data.csv', toJson() ? 'application/json' : 'text/csv'); });
  render();
}
