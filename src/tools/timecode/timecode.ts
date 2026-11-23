import { addTimecodes, fromSeconds, parseTimecode, rate, seconds, toFrames, toTimecode } from './logic';
import { copy, flagInvalid } from '../dom';

const root = document.querySelector<HTMLElement>('[data-timecode]');
if (root) {
  const f = (n: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${n}"]`)!;
  const out = root.querySelector<HTMLElement>('[data-result]')!;
  const error = root.querySelector<HTMLElement>('[data-error]')!;
  const drop = f('drop') as HTMLInputElement;
  let frames = 0; // the conversion card's source of truth, so a rate change keeps the frame count

  const current = () => rate(f('rate').value, drop.checked);
  const bad = (name: string, isBad: boolean) => flagInvalid(f(name), isBad);

  function calc() {
    const x = current();
    const res = addTimecodes(f('a').value, f('b').value, Number(f('op').value) as 1, x);
    bad('a', !parseTimecode(f('a').value, x)); bad('b', !parseTimecode(f('b').value, x));
    out.textContent = res ?? '–';
    error.hidden = res !== null;
  }

  function show(skip = '') {
    const x = current();
    if (skip !== 'tc') f('tc').value = toTimecode(frames, x);
    if (skip !== 'frames') f('frames').value = String(frames);
    if (skip !== 'secs') f('secs').value = String(Number(seconds(frames, x).toFixed(4)));
  }

  function fromTc() {
    const x = current();
    const t = parseTimecode(f('tc').value, x);
    bad('tc', !t);
    if (t) { frames = toFrames(t, x); show('tc'); }
  }

  function setRate() {
    const x = rate(f('rate').value);
    drop.disabled = !x.dropOk;
    if (!x.dropOk) drop.checked = false;
    else if (!drop.dataset.touched) drop.checked = true; // broadcast 29.97 and 59.94 are normally drop frame
    calc(); show();
  }

  root.addEventListener('input', (e) => {
    const n = (e.target as HTMLInputElement).name;
    if (n === 'a' || n === 'b' || n === 'op') calc();
    else if (n === 'tc') fromTc();
    else if (n === 'frames') { const v = Number(f('frames').value); if (Number.isInteger(v) && v >= 0) { frames = v; show('frames'); } bad('frames', !(Number.isInteger(v) && v >= 0)); }
    else if (n === 'secs') { const v = Number(f('secs').value.replace(',', '.')); if (Number.isFinite(v) && v >= 0 && f('secs').value.trim()) { frames = fromSeconds(v, current()); show('secs'); bad('secs', false); } else bad('secs', true); }
  });
  f('rate').addEventListener('change', setRate);
  drop.addEventListener('change', () => { drop.dataset.touched = '1'; calc(); show(); });
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(out.textContent ?? '', e.currentTarget as HTMLElement));
  setRate();
}
