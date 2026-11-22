import { fmtBytes, sizeBytes, uploadNeededKbps, videoKbpsForSize } from './logic';

const root = document.querySelector<HTMLElement>('[data-bitrate]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${n}"]`)!;
  const num = (n: string) => Number(f(n).value) || 0;
  const out = (n: string, v: string) => { root.querySelector(`[data-out="${n}"]`)!.textContent = v; };
  const mode = () => (root.querySelector<HTMLInputElement>('[name="mode"]:checked')!.value);
  const kbps = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} ${s.mbps}` : `${Math.round(v)} ${s.kbps}`);

  function render() {
    const m = mode();
    root!.querySelectorAll<HTMLElement>('[data-when],[data-show]').forEach((el) => { el.hidden = (el.dataset.when ?? el.dataset.show) !== m; });
    const secs = num('h') * 3600 + num('m') * 60;
    const audio = num('audio');
    let video: number;
    if (m === 'size') {
      video = num('video');
      out('size', fmtBytes(sizeBytes(video, audio, secs)));
      out('hour', fmtBytes(sizeBytes(video, audio, 3600)));
    } else {
      video = videoKbpsForSize(num('target') * Number(f('unit').value), audio, secs);
      out('rate', kbps(video));
    }
    out('upload', kbps(uploadNeededKbps(video, audio)));
  }

  f('preset').addEventListener('change', () => { if (f('preset').value) f('video').value = f('preset').value; });
  root.addEventListener('input', render);
  root.addEventListener('change', render);
  render();
}
