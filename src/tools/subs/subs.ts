import { parseCues, shift, toSrt, toVtt } from './logic';
import { copy, download } from '../dom';

const root = document.querySelector<HTMLElement>('[data-subs]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(`[name="${n}"]`)!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  let fileStem = 'subtitles';

  function render() {
    const cues = parseCues(f('src').value);
    status.hidden = !f('src').value.trim();
    if (!cues.length) { f('out').value = ''; status.className = 'note bad'; status.textContent = s.bad; return; }
    const out = shift(cues, Math.round((Number(f('offset').value) || 0) * 1000), Number(f('speed').value));
    f('out').value = f('fmt').value === 'vtt' ? toVtt(out) : toSrt(out);
    status.className = 'note good';
    status.textContent = s.cues.replace('{n}', String(out.length));
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  f('file').addEventListener('change', async () => {
    const file = f('file').files?.[0];
    if (!file) return;
    fileStem = file.name.replace(/\.[^.]+$/, '');
    f('src').value = await file.text();
    f('file').value = '';
    render();
  });
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(f('out').value, e.currentTarget as HTMLElement));
  root.querySelector('[data-save]')!.addEventListener('click', () => {
    if (f('out').value) download(f('out').value, `${fileStem}.${f('fmt').value}`, f('fmt').value === 'vtt' ? 'text/vtt' : 'application/x-subrip');
  });
}
