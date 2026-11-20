import QRCode from 'qrcode';
import { urlPayload, vcardPayload, wifiPayload, type WifiSecurity } from './payload';
import { contrastRatio } from './contrast';

type Mode = 'link' | 'wifi' | 'contact';

const root = document.querySelector<HTMLElement>('[data-qr]');
if (root) init(root);

function init(root: HTMLElement) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const field = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
  const canvas = q<HTMLCanvasElement>('[data-canvas]');
  const empty = q('[data-empty]');
  const error = q('[data-error]');
  const warn = q('[data-warn]');
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-download]');
  let mode: Mode = 'link';
  let current = '';

  const payload = (): string => {
    if (mode === 'wifi') {
      const ssid = field('ssid').value;
      if (!ssid) return '';
      return wifiPayload({ ssid, password: field('password').value, security: field('security').value as WifiSecurity, hidden: field('hidden').checked });
    }
    if (mode === 'contact') {
      const name = field('name').value.trim();
      if (!name) return '';
      return vcardPayload({ name, phone: field('phone').value, email: field('email').value, url: field('url').value, org: field('org').value });
    }
    return urlPayload(field('text').value);
  };

  const opts = () => ({ errorCorrectionLevel: 'M' as const, margin: 2, color: { dark: field('fg').value, light: field('bg').value } });

  async function render() {
    const size = Number(field('size').value);
    root.querySelector('output')!.textContent = String(size);
    const low = contrastRatio(field('fg').value, field('bg').value) < 3;
    warn.hidden = !low;
    warn.textContent = low ? warn.dataset.text ?? '' : '';

    current = payload();
    error.hidden = true;
    const show = current !== '';
    canvas.hidden = !show;
    empty.hidden = show;
    buttons.forEach((b) => (b.disabled = !show));
    if (!show) return;
    try {
      await QRCode.toCanvas(canvas, current, { ...opts(), width: size });
    } catch {
      canvas.hidden = true;
      buttons.forEach((b) => (b.disabled = true));
      error.textContent = root.dataset.tooLong ?? '';
      error.hidden = false;
    }
  }

  const save = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  buttons.forEach((b) => b.addEventListener('click', async () => {
    if (!current) return;
    if (b.dataset.download === 'png') canvas.toBlob((blob) => blob && save(blob, 'qr-code.png'), 'image/png');
    else save(new Blob([await QRCode.toString(current, { ...opts(), type: 'svg' })], { type: 'image/svg+xml' }), 'qr-code.svg');
  }));

  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (tab: HTMLButtonElement) => {
    mode = tab.dataset.mode as Mode;
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      root.querySelector<HTMLElement>(`[data-panel="${t.dataset.mode}"]`)!.hidden = !on;
    });
    render();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });

  root.addEventListener('input', render);
  render();
}
