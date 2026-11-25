import QRCode from 'qrcode';
import { urlPayload, vcardPayload, wifiPayload, type WifiSecurity } from './payload';
import { contrastRatio } from './contrast';
import { qrSvg, type QrStyle } from './style-logic';

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

  let logoHref = '';
  const pick = (name: string) => root.querySelector<HTMLSelectElement>(`[name="${name}"]`)!.value;
  const style = (): QrStyle => ({
    shape: pick('shape') as QrStyle['shape'],
    finder: pick('finder') as QrStyle['finder'],
    gradient: pick('gradient') as QrStyle['gradient'],
    frame: pick('frame') as QrStyle['frame'],
    fg: field('fg').value,
    fg2: field('fg2').value,
    bg: field('bg').value,
    label: field('label').value,
    logo: logoHref ? { href: logoHref, ratio: Number(field('logosize').value) / 100 } : undefined,
  });

  /** The code as SVG text, or '' when the data does not fit. */
  function build(px: number): string {
    const st = style();
    const qr = QRCode.create(current, { errorCorrectionLevel: logoHref ? 'H' : 'M' });
    const m = qr.modules;
    return qrSvg(m.size, (r, c) => !!m.get(r, c), st, px);
  }

  async function render() {
    const size = Number(field('size').value);
    root.querySelector('output')!.textContent = String(size);
    const st = style();
    const low = contrastRatio(st.fg, st.bg) < 3 || (st.gradient !== 'none' && contrastRatio(st.fg2, st.bg) < 3);
    warn.hidden = !low;
    warn.textContent = low ? warn.dataset.text ?? '' : '';
    const shown: Record<string, boolean> = { gradient: st.gradient !== 'none', label: st.frame === 'label', logo: !!logoHref };
    root.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => { el.hidden = !shown[el.dataset.when!]; });

    current = payload();
    error.hidden = true;
    const show = current !== '';
    canvas.hidden = !show;
    empty.hidden = show;
    buttons.forEach((b) => (b.disabled = !show));
    if (!show) return;
    try {
      const img = new Image();
      img.src = URL.createObjectURL(new Blob([build(size)], { type: 'image/svg+xml' }));
      await img.decode();
      URL.revokeObjectURL(img.src);
      canvas.width = size;
      canvas.height = Math.round((size * img.naturalHeight) / img.naturalWidth);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    } catch {
      canvas.hidden = true;
      buttons.forEach((b) => (b.disabled = true));
      error.textContent = root.dataset.tooLong ?? '';
      error.hidden = false;
    }
  }

  /** Centre image: shrunk to 256 px so the SVG stays small. */
  async function setLogo(file?: File) {
    logoHref = '';
    if (file) {
      try {
        const bmp = await createImageBitmap(file);
        const k = Math.min(1, 256 / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * k);
        c.height = Math.round(bmp.height * k);
        c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
        bmp.close();
        logoHref = c.toDataURL('image/png');
      } catch { /* not an image: ignore */ }
    }
    render();
  }
  field('logo').addEventListener('change', (e) => setLogo((e.target as HTMLInputElement).files?.[0]));
  q('[data-logo-clear]').addEventListener('click', () => { field('logo').value = ''; setLogo(); });

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
    else save(new Blob([build(Number(field('size').value))], { type: 'image/svg+xml' }), 'qr-code.svg');
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

// QR code or barcode: both panels live on the page, the radio switches them. /tools/qr/#barcode opens the second.
const kinds = [...document.querySelectorAll<HTMLInputElement>('input[name="kind"][type="radio"]')];
const showKind = () => {
  const on = kinds.find((k) => k.checked)?.value;
  document.querySelectorAll<HTMLElement>('[data-kind]').forEach((el) => { el.hidden = el.dataset.kind !== on; });
};
const wanted = kinds.find((k) => k.value === location.hash.slice(1));
if (wanted) wanted.checked = true;
kinds.forEach((k) => k.addEventListener('change', showKind));
showKind();
