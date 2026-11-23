import { ALGOS, LABEL, hashAll, parseHash, type Algo } from './logic';
import { copy, onFiles } from '../dom';

const root = document.querySelector<HTMLElement>('[data-checksum]');
if (root) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const expected = q<HTMLInputElement>('[name="expected"]');
  const text = q<HTMLTextAreaElement>('[name="text"]');
  const bar = q<HTMLProgressElement>('[data-bar]');
  const status = q('[data-status]');
  const cancelBtn = q('[data-cancel]');
  const result = q('[data-result]');
  const verdict = q('[data-verdict]');
  const mode = () => q<HTMLInputElement>('[name="mode"]:checked').value;
  const picked = () => ALGOS.filter((a) => q<HTMLInputElement>(`[name="algo"][value="${a}"]`).checked);
  let hashes: Partial<Record<Algo, string>> = {};
  let file: File | undefined;
  let run = 0;

  function show(h: Partial<Record<Algo, string>>) {
    hashes = h;
    for (const a of ALGOS) {
      q(`[data-row="${a}"]`).hidden = !h[a];
      q(`[data-hash="${a}"]`).textContent = h[a] ?? '';
    }
    result.hidden = !Object.keys(h).length;
    judge();
  }

  function judge() {
    const t = expected.value.trim();
    verdict.hidden = !Object.keys(hashes).length || !t;
    if (verdict.hidden) return;
    const want = parseHash(t);
    const have = want && hashes[want.algo];
    verdict.className = `note ${!want || !have ? '' : have === want.hash ? 'good' : 'bad'}`;
    verdict.textContent = !want ? s.noHash : !have ? s.unticked.replace('{algo}', LABEL[want.algo]) : (have === want.hash ? s.match : s.mismatch).replace('{algo}', LABEL[want.algo]);
  }

  /** A pasted hash tells which algorithm to run, so a big file is not read through all four. */
  function followExpected() {
    const want = parseHash(expected.value);
    if (!want) return;
    const box = q<HTMLInputElement>(`[name="algo"][value="${want.algo}"]`);
    if (!box.checked) { box.checked = true; refresh(); }
  }

  async function hashFile(f: File) {
    const id = ++run;
    const algos = picked();
    show({});
    q('[data-file]').textContent = `${f.name} (${(f.size / 2 ** 20).toFixed(1)} MB)`;
    if (!algos.length) return;
    bar.hidden = cancelBtn.hidden = false;
    const h = hashAll(algos);
    const reader = f.stream().getReader();
    let done = 0;
    try {
      for (;;) {
        const { value, done: end } = await reader.read();
        if (id !== run) { await reader.cancel(); status.textContent = s.cancelled; return; }
        if (end) break;
        h.update(value);
        done += value.length;
        bar.value = f.size ? done / f.size : 1;
        status.textContent = `${s.reading} ${Math.round(bar.value * 100)}%`;
      }
      status.textContent = '';
      show(h.digest());
    } catch {
      status.textContent = s.failed;
    } finally {
      if (id === run) bar.hidden = cancelBtn.hidden = true;
    }
  }

  function refresh() {
    const m = mode();
    root!.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => { el.hidden = el.dataset.when !== m; });
    run++; // drops a file read still in flight
    bar.hidden = cancelBtn.hidden = true;
    status.textContent = '';
    if (m === 'text') show(text.value && picked().length ? hashAll(picked()).update(new TextEncoder().encode(text.value)).digest() : {});
    else if (file) void hashFile(file);
    else show({});
  }

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-input]'), (files) => { if (files[0]) { file = files[0]; refresh(); } });
  root.addEventListener('change', (e) => { if ((e.target as HTMLInputElement).name !== 'expected') refresh(); });
  text.addEventListener('input', refresh);
  expected.addEventListener('input', () => { followExpected(); judge(); });
  cancelBtn.addEventListener('click', () => { run++; bar.hidden = cancelBtn.hidden = true; status.textContent = s.cancelled; });
  result.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-copy]');
    if (b) void copy(hashes[b.dataset.copy as Algo] ?? '', b, '✓');
  });
  refresh();
}
