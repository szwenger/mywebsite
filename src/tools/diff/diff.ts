import { diffLines } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-diff]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${n}"]`)!;
  const out = root.querySelector<HTMLElement>('[data-out]')!;
  const stats = root.querySelector<HTMLElement>('[data-stats]')!;
  const MARK = { eq: ' ', add: '+', del: '-' } as const;
  let unified = '';

  function render() {
    const r = diffLines(f('a').value, f('b').value, { ignoreWs: (f('ws') as HTMLInputElement).checked, ignoreCase: (f('case') as HTMLInputElement).checked });
    const same = r.stats.added + r.stats.removed === 0;
    stats.textContent = same ? s.same : s.stats.replace('{a}', String(r.stats.added)).replace('{r}', String(r.stats.removed));
    stats.className = `note ${same ? 'good' : ''}`;
    unified = r.ops.map((o) => MARK[o.t] + o.text).join('\n');
    // Long unchanged runs are collapsed so the changes stay visible.
    const rows: HTMLElement[] = [];
    for (let i = 0; i < r.ops.length; i++) {
      const o = r.ops[i];
      const nearChange = r.ops.slice(Math.max(0, i - 3), i + 4).some((x) => x.t !== 'eq');
      if (o.t === 'eq' && !nearChange) { if (rows[rows.length - 1]?.className !== 'gap') rows.push(Object.assign(document.createElement('div'), { className: 'gap', textContent: '…' })); continue; }
      rows.push(Object.assign(document.createElement('div'), { className: o.t, textContent: `${MARK[o.t]} ${o.text}` }));
    }
    out.replaceChildren(...rows);
    out.hidden = rows.length === 0;
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  root.querySelector('[data-swap]')!.addEventListener('click', () => { const t = f('a').value; f('a').value = f('b').value; f('b').value = t; render(); });
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(unified, e.currentTarget as HTMLElement));
  render();
}
