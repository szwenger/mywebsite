import { dataUri, decode, decodeJwt, encode, parseDataUri, sniffImage, type Mode } from './logic';
import { copy, download, onFiles } from '../dom';

const root = document.querySelector<HTMLElement>('[data-encode]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as { err: Record<string, string>; claims: Record<string, string> } & Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(`[name="${n}"]`)!;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const error = q('[data-error]');
  const dir = () => root.querySelector<HTMLInputElement>('[name="dir"]:checked')!.value;

  let fileBytes: { bytes: Uint8Array; mime: string; name: string } | null = null; // a picture chosen or dropped, kept until the mode changes
  const size = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

  function renderImage() {
    const typed = f('input').value;
    const found = typed.trim() ? parseDataUri(typed) : fileBytes;
    const img = q<HTMLImageElement>('[data-img]');
    error.hidden = !typed.trim() || !!found;
    error.textContent = s.notImage;
    for (const sel of ['[data-out-uri]', '[data-out-html]', '[data-out-css]']) q<HTMLTextAreaElement>(sel).value = '';
    q('[data-img-size]').textContent = '';
    q('[data-img-warn]').hidden = true; q('[data-save]').hidden = true;
    img.hidden = !found;
    if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    if (!found) return;
    const uri = dataUri(found.bytes, found.mime);
    img.src = img.dataset.url = URL.createObjectURL(new Blob([found.bytes], { type: found.mime }));
    q<HTMLTextAreaElement>('[data-out-uri]').value = uri;
    q<HTMLTextAreaElement>('[data-out-html]').value = `<img src="${uri}" alt="">`;
    q<HTMLTextAreaElement>('[data-out-css]').value = `background-image: url("${uri}");`;
    q('[data-img-size]').textContent = s.imgSize.replace('{a}', size(found.bytes.length)).replace('{b}', size(uri.length));
    q('[data-img-warn]').hidden = uri.length < 10_000;
    q('[data-save]').hidden = false;
  }

  function render() {
    const mode = f('mode').value;
    const jwt = mode === 'jwt', image = mode === 'image';
    q('[data-dir]').hidden = jwt || image;
    q('[data-plain]').hidden = jwt || image;
    q('[data-jwt]').hidden = true;
    q('[data-image]').hidden = !image;
    q('[data-drop]').hidden = !image;
    error.hidden = true;
    if (image) { renderImage(); return; }
    const input = f('input').value;
    if (!input.trim()) { f('out').value = ''; return; }
    try {
      if (jwt) {
        const j = decodeJwt(input);
        q('[data-jwt]').hidden = false;
        q('[data-jwt-header]').textContent = JSON.stringify(j.header, null, 2);
        q('[data-jwt-payload]').textContent = JSON.stringify(j.payload, null, 2);
        q('[data-times-title]').hidden = !j.times.length;
        q('[data-jwt-times]').replaceChildren(...j.times.map((t) => {
          const tr = document.createElement('tr');
          const a = document.createElement('td'), b = document.createElement('td');
          a.textContent = `${t.claim} (${s.claims[t.claim]})`; b.textContent = t.iso.replace('T', ' ').slice(0, 19);
          tr.append(a, b);
          return tr;
        }));
      } else {
        f('out').value = (dir() === 'enc' ? encode : decode)(mode as Mode, input);
      }
    } catch (e) {
      f('out').value = '';
      error.hidden = false;
      error.textContent = s.err[(e as Error).message] ?? (e as Error).message;
    }
  }

  onFiles(q('[data-drop]'), q<HTMLInputElement>('[data-file]'), async (files) => {
    const bytes = new Uint8Array(await files[0].arrayBuffer());
    const mime = sniffImage(bytes) ?? (files[0].type.startsWith('image/') ? files[0].type : null);
    fileBytes = mime ? { bytes, mime, name: files[0].name } : null;
    f('input').value = '';
    if (!fileBytes) { error.hidden = false; error.textContent = s.notImage; return; }
    renderImage();
  }, { paste: true });
  q('[data-copy-uri]').addEventListener('click', (e) => copy(q<HTMLTextAreaElement>('[data-out-uri]').value, e.currentTarget as HTMLElement));
  q('[data-copy-html]').addEventListener('click', (e) => copy(q<HTMLTextAreaElement>('[data-out-html]').value, e.currentTarget as HTMLElement));
  q('[data-copy-css]').addEventListener('click', (e) => copy(q<HTMLTextAreaElement>('[data-out-css]').value, e.currentTarget as HTMLElement));
  q('[data-save]').addEventListener('click', () => {
    const found = f('input').value.trim() ? parseDataUri(f('input').value) : fileBytes;
    if (found) download(new Blob([found.bytes], { type: found.mime }), `${fileBytes?.name.replace(/\.[^.]+$/, '') || 'image'}.${found.mime.split('/')[1].replace('svg+xml', 'svg').replace('jpeg', 'jpg')}`);
  });
  root.addEventListener('input', render);
  root.addEventListener('change', render);
  q('[data-copy]').addEventListener('click', (e) => copy(f('out').value, e.currentTarget as HTMLElement));
  q('[data-use]').addEventListener('click', () => { f('input').value = f('out').value; render(); });
  render();
}
