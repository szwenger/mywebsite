import { brailleDecode, brailleEncode, caesar, caesarAll, morseDecode, morseEncode, morseTimings, natoDecode, natoEncode, vigenere, type MorseAlphabet, type Result } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-codes]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${n}"]`)!;
  const pick = (n: string) => root.querySelector<HTMLInputElement>(`[name="${n}"]:checked`)!.value;
  const note = root.querySelector<HTMLElement>('[data-note]')!;
  const playBtn = root.querySelector<HTMLButtonElement>('[data-play]')!;
  let brute = false; // the "all shifts" list stays until the next edit
  let ctx: AudioContext | null = null;
  let playing: OscillatorNode | null = null;

  function compute(): { out: string; note: string } {
    const mode = pick('mode'), enc = pick('dir') === 'encode', text = f('input').value;
    const alpha = f('alphabet').value as MorseAlphabet;
    const shift = Number(f('shift').value);
    const r = (x: Result) => ({ out: x.out, note: x.unknown ? s[enc ? 'skipped' : 'unrecognised'].replace('{n}', String(x.unknown)) : '' });
    switch (mode) {
      case 'morse': return r(enc ? morseEncode(text, alpha) : morseDecode(text, alpha));
      case 'nato': return r(enc ? natoEncode(text) : natoDecode(text));
      case 'braille': return r(enc ? brailleEncode(text) : brailleDecode(text));
      case 'caesar': return { out: brute && !enc ? caesarAll(text).map((x) => `${x.shift}: ${x.text}`).join('\n') : caesar(text, enc ? shift : -shift), note: '' };
      default: return { out: vigenere(text, f('key').value, enc ? 1 : -1), note: /[a-z]/i.test(f('key').value) || !text ? '' : s.needKey };
    }
  }

  function render() {
    const mode = pick('mode');
    root!.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => { el.hidden = el.dataset.when !== mode; });
    root!.querySelector('[name="wpmOut"]')!.textContent = f('wpm').value;
    root!.querySelector('[name="shiftOut"]')!.textContent = f('shift').value;
    root!.querySelector<HTMLElement>('[data-brute]')!.hidden = pick('dir') !== 'decode';
    const r = compute();
    f('output').value = r.out;
    note.textContent = r.note;
    note.hidden = !r.note;
  }

  function stop() { playing?.stop(); playing = null; playBtn.textContent = s.play; }

  function play() {
    if (playing) { stop(); return; }
    const code = pick('dir') === 'encode' ? f('output').value : f('input').value;
    const steps = morseTimings(code, Number(f('wpm').value));
    if (!steps.length) return;
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = 620;
    osc.connect(gain).connect(ctx.destination);
    let t = ctx.currentTime + 0.05;
    for (const st of steps) {
      // a 5 ms ramp keeps the key clicks out
      gain.gain.setValueAtTime(0, t);
      if (st.on) { gain.gain.linearRampToValueAtTime(0.4, t + 0.005); gain.gain.setValueAtTime(0.4, t + st.ms / 1000 - 0.005); gain.gain.linearRampToValueAtTime(0, t + st.ms / 1000); }
      t += st.ms / 1000;
    }
    osc.start(); osc.stop(t + 0.05);
    osc.onended = () => { if (playing === osc) stop(); };
    playing = osc;
    playBtn.textContent = s.stop;
  }

  root.addEventListener('input', () => { brute = false; render(); });
  root.addEventListener('change', () => { brute = false; stop(); render(); });
  root.querySelector('[data-brute]')!.addEventListener('click', () => { brute = true; render(); });
  playBtn.addEventListener('click', play);
  root.querySelector('[data-copy]')!.addEventListener('click', (e) => copy(f('output').value, e.currentTarget as HTMLElement));
  render();
}
