import type { RegexResult } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-regex]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement & HTMLTextAreaElement>(`[name="${n}"]`)!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const view = root.querySelector<HTMLElement>('[data-view]')!;
  const table = root.querySelector<HTMLTableSectionElement>('[data-rows]')!;
  const replaced = root.querySelector<HTMLElement>('[data-replaced]')!;
  const el = (tag: string, text = '', cls = '') => Object.assign(document.createElement(tag), { textContent: text, className: cls });
  let worker: Worker | null = null;
  let timer = 0;

  const flags = () => [...root.querySelectorAll<HTMLInputElement>('[data-flag]:checked')].map((x) => x.value).join('');
  const say = (msg: string, kind: '' | 'good' | 'bad') => { status.hidden = !msg; status.className = `note ${kind}`; status.textContent = msg; };

  function show(r: RegexResult, text: string) {
    if (r.error) { say(r.error, 'bad'); view.replaceChildren(el('span', text)); table.replaceChildren(); replaced.textContent = ''; return; }
    say(r.hits.length ? (r.truncated ? s.many : s.count.replace('{n}', String(r.hits.length))) : s.none, r.hits.length ? 'good' : '');
    const parts: (string | HTMLElement)[] = [];
    let at = 0, k = 0;
    for (const h of r.hits) {
      if (!h.text) continue;
      parts.push(text.slice(at, h.index), el('mark', h.text, k++ % 2 ? 'b' : 'a'));
      at = h.index + h.text.length;
    }
    parts.push(text.slice(at));
    view.replaceChildren(...parts);
    table.replaceChildren(...r.hits.slice(0, 100).map((h, i) => {
      const tr = el('tr');
      const named = Object.entries(h.named).map(([k2, v]) => `${k2}=${v}`);
      const groups = h.groups.map((g, j) => `$${j + 1}=${g ?? '∅'}`).concat(named).join('   ');
      tr.append(el('td', String(i + 1)), el('td', String(h.index)), el('td', h.text || '∅', 'mono'), el('td', groups, 'mono'));
      return tr;
    }));
    replaced.textContent = r.replaced ?? '';
    replaced.hidden = r.replaced === undefined;
  }

  function run() {
    worker?.terminate(); // a fresh worker per run: a runaway pattern from the previous run can never block this one
    const w = (worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }));
    const text = f('text').value;
    const guard = setTimeout(() => { w.terminate(); if (worker === w) worker = null; say(s.slow, 'bad'); }, 1500);
    w.onmessage = (e: MessageEvent<RegexResult>) => { clearTimeout(guard); show(e.data, text); };
    w.postMessage({ p: f('pattern').value, f: flags(), t: text, r: f('repl').value || undefined });
  }

  root.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(run, 150); });
  root.addEventListener('change', run);
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(replaced.textContent ?? '', e.currentTarget as HTMLElement));
  run();
}
