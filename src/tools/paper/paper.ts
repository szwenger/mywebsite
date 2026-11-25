import { PAPERS, paperSize } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-paper]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const table = root.querySelector<HTMLTableElement>('[data-table]')!;
  const ppi = root.querySelector<HTMLSelectElement>('[name=ppi]')!, orient = root.querySelector<HTMLSelectElement>('[name=orient]')!;
  const groups: [string, string][] = [['A', s.groupA], ['B', s.groupB], ['C', s.groupC], ['US', s.groupUS]];
  const cell = (t: string) => { const td = document.createElement('td'); td.textContent = t; return td; };

  function render() {
    const rows: HTMLElement[] = [];
    const head = document.createElement('thead');
    head.innerHTML = '<tr><th></th><th></th><th></th><th></th><th></th></tr>';
    [s.size, s.mm, s.inch, s.pt, `${s.px} (${ppi.value} PPI)`].forEach((t, i) => { head.querySelectorAll('th')[i].textContent = t; });
    for (const [g, label] of groups) {
      const grp = document.createElement('tr'); grp.className = 'grp';
      const th = document.createElement('th'); th.colSpan = 5; th.textContent = label; grp.append(th); rows.push(grp);
      for (const p of PAPERS.filter((x) => x.group === g)) {
        const z = paperSize(p.name, Number(ppi.value), orient.value === 'l');
        const tr = document.createElement('tr'); tr.dataset.name = p.name;
        tr.append(cell(p.name), cell(z.mm.join(' × ')), cell(z.inch.join(' × ')), cell(z.pt.join(' × ')), cell(z.px.join(' × ')));
        tr.addEventListener('click', () => void copy(z.mm.join(' × '), tr.children[1] as HTMLElement, s.copied));
        rows.push(tr);
      }
    }
    const body = document.createElement('tbody'); body.append(...rows);
    table.replaceChildren(head, body);
  }
  root.addEventListener('change', render);
  render();
}
