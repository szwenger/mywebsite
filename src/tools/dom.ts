/** Small helpers shared by the tool client scripts. */
export function download(data: Blob | string, name: string, type = 'text/plain'): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Copies text and flashes the button label; falls back to selecting nothing when the clipboard is blocked. */
export async function copy(text: string, btn?: HTMLElement, done = '✓'): Promise<void> {
  try { await navigator.clipboard.writeText(text); } catch { return; }
  if (!btn) return;
  const old = btn.textContent;
  btn.textContent = done;
  setTimeout(() => { btn.textContent = old; }, 1200);
}

export const $ = <T extends HTMLElement>(root: ParentNode, sel: string): T => root.querySelector<T>(sel)!;

/** Wires a file input and a drop target to one handler. */
export function onFiles(drop: HTMLElement, input: HTMLInputElement, fn: (files: File[]) => void): void {
  input.addEventListener('change', () => { fn([...input.files!]); input.value = ''; });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); fn([...(e.dataTransfer?.files ?? [])]); });
}
