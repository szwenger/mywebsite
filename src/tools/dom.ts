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

/** Inline SVG for an icon, same markup as components/Icon.astro. */
export const iconSvg = (n: IconName) => `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[n]}</svg>`;

/** Icon-only button built from script (same markup as components/IconButton.astro). `sm` = 28px glyph box inside a 40px hit area. */
export function iconButton(icon: IconName, label: string, sm = false): HTMLButtonElement {
  const b = Object.assign(document.createElement('button'), { type: 'button', className: `btn alt ib${sm ? ' sm' : ''}`, innerHTML: `<span class="glyph">${iconSvg(icon)}</span><span class="done">${iconSvg('check')}</span>` });
  b.setAttribute('aria-label', label);
  return b;
}

export function shake(el: HTMLElement): void {
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

/** Slides a freshly shown panel in from the side the user is travelling towards (dir 1 = from the right). No crossfade; skipped under reduced motion. */
export function slideIn(el: HTMLElement, dir: 1 | -1): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate([{ translate: `${28 * dir}px 0`, opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

const watched = new WeakSet<HTMLElement>();
/** Marks a field invalid (red border via aria-invalid; the message stays in the tool's own live note). It shakes when the field is left (blur) while still invalid, never per keystroke. */
export function flagInvalid(field: HTMLElement, bad: boolean): void {
  field.setAttribute('aria-invalid', String(bad));
  if (watched.has(field)) return;
  watched.add(field);
  field.addEventListener('focusout', () => { if (field.getAttribute('aria-invalid') === 'true') shake(field); });
}

export const $ =<T extends HTMLElement>(root: ParentNode, sel: string): T => root.querySelector<T>(sel)!;

/** Wires a file input and a drop target to one handler. */
export function onFiles(drop: HTMLElement, input: HTMLInputElement, fn: (files: File[]) => void): void {
  input.addEventListener('change', () => { fn([...input.files!]); input.value = ''; });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); fn([...(e.dataTransfer?.files ?? [])]); });
}
