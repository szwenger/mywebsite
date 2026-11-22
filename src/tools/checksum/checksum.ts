import { Sha256, parseExpected } from './logic';
import { copy, onFiles } from '../dom';

const root = document.querySelector<HTMLElement>('[data-checksum]');
if (root) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const expected = q<HTMLInputElement>('[name="expected"]');
  const bar = q<HTMLProgressElement>('[data-bar]');
  const status = q('[data-status]');
  const cancelBtn = q('[data-cancel]');
  const result = q('[data-result]');
  const hashEl = q('[data-hash]');
  const verdict = q('[data-verdict]');
  let hash = '';
  let run = 0;

  function judge() {
    const text = expected.value.trim();
    verdict.hidden = !hash || !text;
    if (verdict.hidden) return;
    const want = parseExpected(text);
    verdict.className = `note ${!want ? '' : want === hash ? 'good' : 'bad'}`;
    verdict.textContent = !want ? s.noHash : want === hash ? s.match : s.mismatch;
  }

  async function hashFile(file: File) {
    const id = ++run;
    hash = '';
    result.hidden = true;
    q('[data-file]').textContent = `${file.name} (${(file.size / 2 ** 20).toFixed(1)} MB)`;
    bar.hidden = cancelBtn.hidden = false;
    const h = new Sha256();
    const reader = file.stream().getReader();
    let done = 0;
    try {
      for (;;) {
        const { value, done: end } = await reader.read();
        if (id !== run) { await reader.cancel(); status.textContent = s.cancelled; return; }
        if (end) break;
        h.update(value);
        done += value.length;
        bar.value = file.size ? done / file.size : 1;
        status.textContent = `${s.reading} ${Math.round(bar.value * 100)}%`;
      }
      hash = h.digest();
      hashEl.textContent = hash;
      result.hidden = false;
      status.textContent = '';
      judge();
    } catch {
      status.textContent = s.failed;
    } finally {
      if (id === run) bar.hidden = cancelBtn.hidden = true;
    }
  }

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-input]'), (files) => { if (files[0]) void hashFile(files[0]); });
  cancelBtn.addEventListener('click', () => { run++; bar.hidden = cancelBtn.hidden = true; status.textContent = s.cancelled; });
  q('[data-copy]').addEventListener('click', (e) => copy(hash, e.currentTarget as HTMLElement, '✓'));
  expected.addEventListener('input', judge);
}
