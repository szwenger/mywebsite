import { icons, type IconName } from '../data/icons.ts';
/** Small helpers shared by the tool client scripts. */
export function download(data: Blob | string, name: string, type = 'text/plain'): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Copies text and confirms on the button: icon buttons flip to a check, text buttons flash `done`. A blocked clipboard shakes the button instead of failing silently. */
export async function copy(text: string, btn?: HTMLElement, done = '✓'): Promise<void> {
  try { await navigator.clipboard.writeText(text); } catch { if (btn) { btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 400); } return; }
  if (!btn) return;
  if (btn.classList.contains('ib')) { btn.classList.add('ok'); setTimeout(() => btn.classList.remove('ok'), 1200); return; }
  const old = btn.textContent;
  btn.textContent = done;
  setTimeout(() => { btn.textContent = old; }, 1200);
}

/** Icon-only button built from script (same markup as components/IconButton.astro). `sm` = 28px glyph box inside a 40px hit area. */
export function iconButton(icon: IconName, label: string, sm = false): HTMLButtonElement {
  const svg = (n: IconName) => `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[n]}</svg>`;
  const b = Object.assign(document.createElement('button'), { type: 'button', className: `btn alt ib${sm ? ' sm' : ''}`, innerHTML: `<span class="glyph">${svg(icon)}</span><span class="done">${svg('check')}</span>` });
  b.setAttribute('aria-label', label);
  return b;
}

export const $ = <T extends HTMLElement>(root: ParentNode, sel: string): T => root.querySelector<T>(sel)!;

/** Wires a file input and a drop target to one handler. */
export function onFiles(drop: HTMLElement, input: HTMLInputElement, fn: (files: File[]) => void): void {
  input.addEventListener('change', () => { fn([...input.files!]); input.value = ''; });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); fn([...(e.dataTransfer?.files ?? [])]); });
}
