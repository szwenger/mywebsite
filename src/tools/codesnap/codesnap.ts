import { LANGS, THEMES, renderSnap, type Opts } from './logic';
import { canvasPng, svgToCanvas } from '../raster';
import { copy, download, onFiles } from '../dom';

const PRESETS: [string, string][] = [['#ff7e5f', '#feb47b'], ['#2193b0', '#6dd5ed'], ['#ff9a9e', '#a18cd1'], ['#134e5e', '#71b280'], ['#0f2027', '#2c5364'], ['#8e44ad', '#3498db'], ['#ffecd2', '#fcb69f'], ['#485563', '#29323c'], ['#00c9ff', '#92fe9d'], ['#f12711', '#f5af19']];
const EXT: Record<string, string> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', java: 'java', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp',
  go: 'go', rs: 'rust', php: 'php', rb: 'ruby', sh: 'bash', bash: 'bash', zsh: 'bash', ps1: 'powershell', sql: 'sql', json: 'json', yml: 'yaml', yaml: 'yaml', html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml',
  css: 'css', scss: 'scss', md: 'markdown', diff: 'diff', patch: 'diff', lua: 'lua', dart: 'dart', scala: 'scala', r: 'r', pl: 'perl', hs: 'haskell', ex: 'elixir', exs: 'elixir', kt: 'kotlin', swift: 'swift', toml: 'ini', ini: 'ini',
};
const KEY = 'codesnap-state';

const root = document.querySelector<HTMLElement>('[data-snap]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, any>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const field = (n: string) => q<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(`[name="${n}"]`);
  const view = q('[data-view]'), info = q('[data-info]'), detected = q('[data-detected]'), err = q('[data-error]');
  let current: ReturnType<typeof renderSnap> | null = null;

  const opt = (value: string, text: string) => { const o = document.createElement('option'); o.value = value; o.textContent = text; return o; };
  field('lang').append(opt('auto', s.auto), ...LANGS.map((l) => opt(l.id, l.name)));
  field('theme').append(...THEMES.map((t) => opt(t.id, t.name)));
  field('preset').append(opt('', '—'), ...PRESETS.map((_, i) => opt(String(i), s.presets[i])));

  const num = (n: string, fb: number) => { const v = Number(field(n).value); return Number.isFinite(v) ? v : fb; };
  function read(): Opts {
    return {
      code: field('code').value, lang: field('lang').value, theme: field('theme').value, bgMode: field('bgMode').value as Opts['bgMode'], c1: field('c1').value, c2: field('c2').value, angle: num('angle', 135),
      padding: num('padding', 48), frame: field('frame').value as Opts['frame'], title: field('title').value, lineNumbers: field('lineNumbers').checked, start: num('start', 1), fontSize: num('fontSize', 15),
      radius: num('radius', 12), shadow: field('shadow').checked, marks: field('marks').value, others: field('others').value as Opts['others'], tab: num('tab', 2), minWidth: num('minWidth', 0), watermark: field('watermark').value,
    };
  }

  function render() {
    err.hidden = true;
    const o = read();
    current = o.code.trim() ? renderSnap(o) : null;
    view.classList.toggle('checker', o.bgMode === 'none');
    if (current) {
      view.innerHTML = current.svg;
      const svg = view.querySelector('svg')!;
      svg.removeAttribute('width'); svg.removeAttribute('height');
      info.textContent = `${current.w} × ${current.h} ${s.size} · ${current.lines}`;
      const name = LANGS.find((l) => l.id === current!.lang)?.name ?? current.lang;
      detected.textContent = o.lang === 'auto' ? `${s.detected}: ${name}` : '';
    } else { view.innerHTML = `<p class="meta" style="padding:16px;line-height:1.4">${s.empty}</p>`; info.textContent = ''; detected.textContent = ''; }
    for (const b of root!.querySelectorAll<HTMLButtonElement>('[data-needs]')) b.disabled = !current;
    save();
  }

  function save() {
    const st: Record<string, string | boolean> = {};
    for (const el of root!.querySelectorAll<HTMLInputElement>('[name]')) st[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* private mode */ }
  }
  function load() {
    let st: Record<string, string | boolean> = {};
    try { st = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { /* ignore */ }
    for (const el of root!.querySelectorAll<HTMLInputElement>('[name]')) {
      const v = st[el.name];
      if (v === undefined) continue;
      if (el.type === 'checkbox') el.checked = v === true;
      else if (typeof v === 'string') { el.value = v; if (el.value !== v && el.tagName === 'SELECT') el.selectedIndex = 0; }
    }
    if (!field('code').value) field('code').value = s.sample;
  }

  field('preset').addEventListener('change', () => {
    const p = PRESETS[Number(field('preset').value)];
    if (!p) return;
    field('c1').value = p[0]; field('c2').value = p[1];
    if (field('bgMode').value === 'none') field('bgMode').value = 'gradient';
    render();
  });
  root.addEventListener('input', (e) => { if ((e.target as HTMLElement).getAttribute('name') !== 'preset') render(); });
  root.addEventListener('change', (e) => { if ((e.target as HTMLElement).getAttribute('name') !== 'preset') render(); });

  async function png(): Promise<Blob | null> {
    if (!current) return null;
    let sc = num('scale', 2);
    while (sc > 1 && current.w * current.h * sc * sc > 16e6) sc--;
    return canvasPng(await svgToCanvas(current.svg, current.w, current.h, sc, false));
  }
  const on = (sel: string, fn: (b: HTMLElement) => Promise<void> | void) => q(sel).addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    b.disabled = true;
    try { await fn(b); } catch (x) { console.error(x); err.hidden = false; err.textContent = s.failed; } finally { b.disabled = !current; }
  });
  on('[data-png]', async () => { const b = await png(); if (b) download(b, 'code.png'); });
  on('[data-svg]', () => { if (current) download(current.svg, 'code.svg', 'image/svg+xml'); });
  on('[data-copy-svg]', async (b) => { if (current) await copy(current.svg, b, '✓'); });
  on('[data-copy-img]', async (b) => {
    const blob = await png();
    if (!blob) return;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    const old = b.textContent; b.textContent = '✓'; setTimeout(() => { b.textContent = old; }, 1200);
  });

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-file]'), async ([f]) => {
    if (!f) return;
    field('code').value = (await f.text()).slice(0, 200_000);
    const ext = f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase() : f.name.toLowerCase() === 'dockerfile' ? 'dockerfile' : '';
    field('lang').value = EXT[ext] ?? (ext === 'dockerfile' ? 'dockerfile' : 'auto');
    if (!field('title').value) field('title').value = f.name;
    render();
  });

  load();
  render();
}
