import { readJpeg, readPdf, readPng, stripJpeg, stripPdf, stripPng, type Entry } from './logic';
import { download, onFiles } from '../dom';

const root = document.querySelector<HTMLElement>('[data-meta]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const list = root.querySelector<HTMLElement>('[data-list]')!;

  function kind(f: File): 'jpeg' | 'png' | 'pdf' | '' {
    if (f.type === 'image/jpeg' || /\.jpe?g$/i.test(f.name)) return 'jpeg';
    if (f.type === 'image/png' || /\.png$/i.test(f.name)) return 'png';
    if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) return 'pdf';
    return '';
  }
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') => Object.assign(document.createElement(tag), { textContent: text, className: cls });

  async function add(file: File) {
    const card = el('section', '', 'card item');
    card.append(el('h2', file.name));
    list.append(card);
    const k = kind(file);
    if (!k) { card.append(el('p', s.unsupported, 'note bad')); return; }
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const entries: Entry[] = k === 'jpeg' ? readJpeg(data) : k === 'png' ? readPng(data) : await readPdf(data);
      if (entries.some((e) => e.key === 'GPS')) card.append(el('p', s.gps, 'note bad gps'));
      if (!entries.length) card.append(el('p', s.none, 'note good'));
      else {
        const table = el('table');
        for (const e of entries) { const tr = table.insertRow(); tr.append(el('th', e.key), el('td', e.value)); }
        card.append(table);
      }
      const btn = el('button', s.strip, 'btn');
      btn.type = 'button';
      btn.addEventListener('click', async () => {
        const out = k === 'jpeg' ? stripJpeg(data) : k === 'png' ? stripPng(data) : await stripPdf(data);
        download(new Blob([out], { type: file.type || `application/${k}` }), file.name.replace(/(\.[^.]+)?$/, `${s.clean}$1`));
      });
      const actions = el('div', '', 'actions');
      actions.append(btn);
      card.append(actions);
    } catch {
      card.append(el('p', s.failed, 'note bad'));
    }
  }

  onFiles(root.querySelector('[data-drop]')!, root.querySelector<HTMLInputElement>('[data-input]')!, (files) => { list.replaceChildren(); files.forEach(add); });
}
