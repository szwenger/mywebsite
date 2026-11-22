import { buildFfmpeg, type AudioFmt, type Encoder, type Task } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-ff]');
if (root) {
  const f = (n: string) => root.querySelector<HTMLInputElement & HTMLSelectElement>(`[name="${n}"]`)!;
  const out = root.querySelector<HTMLElement>('[data-out]')!;
  const warn = root.querySelector<HTMLElement>('[data-warn]')!;

  /** "90", "1:30" or "1:02:03" to seconds. */
  const seconds = (v: string): number => v.trim().split(':').reduce((t, p) => t * 60 + (Number(p) || 0), 0);

  function render() {
    const task = f('task').value as Task;
    root!.querySelectorAll<HTMLElement>('[data-for]').forEach((el) => { el.hidden = !el.dataset.for!.split(' ').includes(task); });
    root!.querySelector('output')!.textContent = f('quality').value;
    const r = buildFfmpeg({
      task, input: f('input').value, encoder: f('encoder').value as Encoder, quality: Number(f('quality').value),
      height: Number(f('height').value), fps: Number(f('fps').value), start: f('start').value.trim(), end: f('end').value.trim(), exact: f('exact').checked,
      audioFmt: f('audioFmt').value as AudioFmt, audioKbps: Number(f('audioKbps').value) || 192,
      gifWidth: Number(f('gifWidth').value) || 480, gifFps: Number(f('gifFps').value) || 12,
      sizeMB: Number(f('sizeMB').value) || 1, durationSec: seconds(f('dur').value),
    });
    warn.hidden = !r.warning;
    out.textContent = r.cmd;
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(out.textContent ?? '', e.currentTarget as HTMLElement));
  render();
}
