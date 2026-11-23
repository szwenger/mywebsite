import { renderChart, toData, type Kind } from './logic';
import { copy, download, onFiles } from '../dom';
import './graph';

const root = document.querySelector<HTMLElement>('[data-plot]');
if (root) {
  const s = JSON.parse(root.closest<HTMLElement>('[data-s]')!.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (name: string) => q<HTMLInputElement & HTMLSelectElement>(`[name=${name}]`);
  const view = q('[data-view]'), err = q('[data-error]'), info = q('[data-info]');
  let svg = '';

  function render() {
    err.hidden = true; info.textContent = '';
    try {
      const d = toData(f('data').value);
      const [w, h] = f('size').value.split('x').map(Number);
      svg = renderChart(d, { kind: f('kind').value as Kind, title: f('title').value, xLabel: f('xlabel').value, yLabel: f('ylabel').value, width: w, height: h, grid: f('grid').checked, legend: f('legend').checked, zeroBase: f('zero').checked });
      view.innerHTML = svg;
      view.querySelector('svg')!.removeAttribute('width');
      view.querySelector('svg')!.removeAttribute('height');
      info.textContent = `${d.series.length} ${s.series} · ${d.xLabels.length} ${s.points}${d.dropped ? ` · ${s.dropped.replace('{n}', String(d.dropped))}` : ''}`;
    } catch (e) {
      svg = ''; view.innerHTML = '';
      const m = (e as Error).message;
      if (f('data').value.trim()) { err.hidden = false; err.textContent = s[m] ?? m; }
    }
    for (const b of root!.querySelectorAll<HTMLButtonElement>('[data-needs]')) b.disabled = !svg;
  }

  async function png(scale: number): Promise<Blob | null> {
    const [w, h] = f('size').value.split('x').map(Number);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w * scale; c.height = h * scale;
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((done) => c.toBlob(done, 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  q('[data-svg-save]').addEventListener('click', () => download(svg, 'chart.svg', 'image/svg+xml'));
  q('[data-copy]').addEventListener('click', (e) => copy(svg, e.currentTarget as HTMLElement, '✓'));
  q('[data-png-save]').addEventListener('click', async () => { const b = await png(2); if (b) download(b, 'chart.png'); });
  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-file]'), async ([file]) => { if (file) { f('data').value = await file.text(); render(); } });
  f('data').value = s.sample;
  render();
}

// Tabs: function graph (default) and data chart.
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-tab]')];
function showTab(name: string) {
  for (const b of tabs) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  for (const p of document.querySelectorAll<HTMLElement>('[data-panel]')) p.hidden = p.dataset.panel !== name;
  try { localStorage.setItem('plot-tab', name); } catch { /* private mode */ }
}
for (const b of tabs) b.addEventListener('click', () => showTab(b.dataset.tab!));
let tab = 'graph';
try { tab = location.hash.startsWith('#g=') ? 'graph' : localStorage.getItem('plot-tab') ?? 'graph'; } catch { /* private mode */ }
showTab(tab === 'chart' ? 'chart' : 'graph');
