import { clock, encodeWav, fade, normalize, parseClock, peaks, toMono, trim } from './logic';
import { download, onFiles } from '../dom';

const root = document.querySelector<HTMLElement>('[data-audio]');
if (root) init(root);

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (name: string) => q<HTMLInputElement>(`[name=${name}]`);
  const work = q('[data-work]'), cv = q<HTMLCanvasElement>('[data-wave]'), err = q('[data-error]'), info = q('[data-info]'), playBtn = q('[data-play]');
  let buf: AudioBuffer | null = null;
  let name = 'audio';
  let start = 0, end = 0;
  let wave: Float32Array = new Float32Array(0);
  let ctx: AudioContext | null = null, src: AudioBufferSourceNode | null = null;

  const fail = (m: string) => { err.textContent = m; err.hidden = !m; };
  const channels = () => Array.from({ length: buf!.numberOfChannels }, (_, i) => buf!.getChannelData(i));

  async function load(files: File[]) {
    const file = files.find((x) => x.type.startsWith('audio/') || x.type.startsWith('video/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm|mp4)$/i.test(x.name));
    if (!file) { if (files.length) fail(s.badType); return; }
    stop();
    try {
      // An offline context decodes without waiting for a click, which a live one may refuse.
      const dec = new OfflineAudioContext(1, 1, 48000);
      buf = await dec.decodeAudioData(await file.arrayBuffer());
    } catch { buf = null; fail(s.failed); return; }
    fail('');
    name = file.name.replace(/\.[^.]+$/, '') || 'audio';
    start = 0; end = buf.duration;
    wave = peaks(channels(), 1200);
    work.hidden = false;
    info.textContent = `${clock(buf.duration)} · ${buf.sampleRate / 1000} kHz · ${buf.numberOfChannels === 1 ? s.mono : s.stereo}`;
    sync();
  }

  function draw() {
    if (!buf) return;
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const g = cv.getContext('2d')!;
    const css = getComputedStyle(cv);
    const ink = css.getPropertyValue('--accent').trim() || '#6d78e8', muted = css.getPropertyValue('--muted').trim() || '#999';
    const w = cv.width, h = cv.height, mid = h / 2;
    const x0 = (start / buf.duration) * w, x1 = (end / buf.duration) * w;
    for (let x = 0; x < w; x++) {
      const p = wave[Math.min(wave.length - 1, Math.floor((x / w) * wave.length))];
      g.fillStyle = x >= x0 && x <= x1 ? ink : muted;
      g.globalAlpha = x >= x0 && x <= x1 ? 1 : 0.35;
      const hh = Math.max(1, p * (h - 8));
      g.fillRect(x, mid - hh / 2, 1, hh);
    }
    g.globalAlpha = 1;
    g.fillStyle = ink;
    for (const x of [x0, x1]) g.fillRect(Math.round(x) - 1, 0, 3, h);
  }

  function sync() {
    f('start').value = clock(start); f('end').value = clock(end);
    q('[data-len]').textContent = `${s.selected}: ${clock(end - start)}`;
    draw();
  }

  // Drag a handle: whichever is closer to the pointer moves.
  let drag: 'start' | 'end' | null = null;
  const at = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * buf!.duration; };
  cv.addEventListener('pointerdown', (e) => {
    if (!buf) return;
    const t = at(e);
    drag = Math.abs(t - start) <= Math.abs(t - end) ? 'start' : 'end';
    cv.setPointerCapture(e.pointerId);
    move(e);
  });
  function move(e: PointerEvent) {
    if (!drag || !buf) return;
    const t = at(e);
    if (drag === 'start') start = Math.min(t, end - 0.05); else end = Math.max(t, start + 0.05);
    start = Math.max(0, start); end = Math.min(buf.duration, end);
    sync();
  }
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('pointercancel', () => { drag = null; });

  const typed = (name: 'start' | 'end') => () => {
    if (!buf) return;
    const t = parseClock(f(name).value);
    if (Number.isNaN(t)) { sync(); return; }
    if (name === 'start') start = Math.min(Math.max(0, t), end - 0.05); else end = Math.max(Math.min(buf.duration, t), start + 0.05);
    sync();
  };
  f('start').addEventListener('change', typed('start'));
  f('end').addEventListener('change', typed('end'));

  function stop() { try { src?.stop(); } catch { /* already stopped */ } src = null; playBtn.textContent = s.play; }
  playBtn.addEventListener('click', () => {
    if (!buf) return;
    if (src) { stop(); return; }
    ctx ??= new AudioContext();
    void ctx.resume();
    src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => { src = null; playBtn.textContent = s.play; };
    src.start(0, start, end - start);
    playBtn.textContent = s.stop;
  });

  q('[data-save]').addEventListener('click', () => {
    if (!buf) return;
    let ch = trim(channels(), buf.sampleRate, start, end).map((c) => Float32Array.from(c)); // copies: the effects below change samples in place
    if (f('mono').checked) ch = toMono(ch);
    fade(ch, buf.sampleRate, Number(f('fadein').value) || 0, Number(f('fadeout').value) || 0);
    if (f('norm').checked) normalize(ch);
    download(new Blob([encodeWav(ch, buf.sampleRate)], { type: 'audio/wav' }), `${name}-cut.wav`);
  });

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-file]'), (x) => void load(x));
  window.addEventListener('resize', draw);
}
