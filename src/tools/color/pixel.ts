// The "pixel picker" panel of the colour tool: point at a picture, see the colour under the pointer in a loupe, click to keep it.
import { formats, toHex } from './logic';
import { loupePlacement, pixelAt, toImageXY } from './pixel-logic';
import { copy, onFiles } from '../dom';
import { fitsCanvas, isImage } from '../image/logic';
import { decodeImage } from '../imageio';

const LOUPE = 120, CELLS = 15, MAX_SAVED = 24;

export function initPixel(root: HTMLElement, s: Record<string, string>) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(`[data-when="pixel"] ${sel}`)!;
  const drop = q('[data-pdrop]'), input = q<HTMLInputElement>('[data-pfile]'), work = q('[data-pwork]'), err = q('[data-perror]');
  const canvas = q<HTMLCanvasElement>('[data-pcanvas]'), loupe = q<HTMLCanvasElement>('[data-ploupe]'), stage = q('[data-pstage]');
  const chip = q('[data-pchip]'), values = q('[data-pvalues]'), saved = q('[data-psaved]');
  const g = canvas.getContext('2d', { willReadFrequently: true })!, lg = loupe.getContext('2d')!;
  let at = { x: 0, y: 0 };
  let down = false;
  const keep: string[] = [];

  const fail = (m: string) => { err.textContent = m; err.hidden = !m; };

  async function load(files: File[]) {
    const file = files.find(isImage);
    if (!file) { if (files.length) fail(s.pBadType); return; }
    try {
      const bmp = await decodeImage(file);
      if (!fitsCanvas({ w: bmp.width, h: bmp.height })) { bmp.close(); fail(s.pFailed); return; }
      const { width, height } = bmp; // a closed bitmap reports 0 x 0
      canvas.width = width; canvas.height = height;
      g.drawImage(bmp, 0, 0);
      bmp.close();
      fail('');
      work.hidden = false;
      keep.length = 0; renderSaved();
      read({ x: width >> 1, y: height >> 1 }, false);
    } catch { fail(s.pFailed); }
  }

  /** Shows the colour at a picture pixel; `loupeAt` places the loupe next to the pointer. */
  function read(p: { x: number; y: number }, loupeAt: { px: number; py: number } | false) {
    at = p;
    const c = pixelAt(g.getImageData(p.x, p.y, 1, 1).data, 1, 0, 0);
    const hex = toHex({ ...c, a: 1 });
    chip.style.background = hex;
    values.replaceChildren(...Object.entries(formats({ ...c, a: 1 })).slice(0, 4).map(([name, value]) => {
      const row = document.createElement('div'), b = document.createElement('button');
      b.type = 'button'; b.className = 'val mono'; b.textContent = value; b.title = s.copy;
      b.addEventListener('click', () => void copy(value, b, '✓'));
      row.append(Object.assign(document.createElement('span'), { textContent: name }), b);
      return row;
    }));
    q('[data-pxy]').textContent = `${p.x}, ${p.y}`;
    if (!loupeAt) { loupe.hidden = true; return; }
    lg.imageSmoothingEnabled = false;
    lg.clearRect(0, 0, LOUPE, LOUPE);
    const half = CELLS >> 1, cell = LOUPE / CELLS;
    lg.drawImage(canvas, p.x - half, p.y - half, CELLS, CELLS, 0, 0, LOUPE, LOUPE);
    lg.lineWidth = 2; lg.strokeStyle = '#000'; lg.strokeRect(half * cell, half * cell, cell, cell);
    lg.lineWidth = 1; lg.strokeStyle = '#fff'; lg.strokeRect(half * cell + 2, half * cell + 2, cell - 4, cell - 4);
    const r = canvas.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const pos = loupePlacement(loupeAt.px + (r.left - sr.left), loupeAt.py + (r.top - sr.top), sr.width, LOUPE);
    loupe.style.left = `${pos.left}px`; loupe.style.top = `${pos.top}px`;
    loupe.hidden = false;
  }

  function keepColour() {
    const hex = toHex({ ...pixelAt(g.getImageData(at.x, at.y, 1, 1).data, 1, 0, 0), a: 1 });
    const i = keep.indexOf(hex);
    if (i >= 0) keep.splice(i, 1);
    keep.unshift(hex);
    keep.length = Math.min(keep.length, MAX_SAVED);
    renderSaved();
  }

  function renderSaved() {
    saved.replaceChildren(...keep.map((hex) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.style.background = hex; b.title = s.copy;
      const c = hex.slice(1).match(/../g)!.map((h) => parseInt(h, 16));
      b.style.color = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 > 150 ? '#000' : '#fff';
      b.innerHTML = '<b></b>'; b.querySelector('b')!.textContent = hex.toUpperCase();
      b.addEventListener('click', () => void copy(hex, b.querySelector<HTMLElement>('b')!, '✓'));
      return b;
    }));
    q('[data-psaved-wrap]').hidden = !keep.length;
  }

  const point = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    return { p: toImageXY(px, py, { w: r.width, h: r.height }, { w: canvas.width, h: canvas.height }), px, py };
  };
  canvas.addEventListener('pointerdown', (e) => { down = true; canvas.setPointerCapture(e.pointerId); const { p, px, py } = point(e); read(p, { px, py }); });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || down) { const { p, px, py } = point(e); read(p, { px, py }); } });
  canvas.addEventListener('pointerup', (e) => { if (!down) return; down = false; keepColour(); if (e.pointerType !== 'mouse') loupe.hidden = true; });
  canvas.addEventListener('pointercancel', () => { down = false; loupe.hidden = true; });
  canvas.addEventListener('pointerleave', () => { if (!down) loupe.hidden = true; });
  // Arrow keys nudge one pixel (ten with Shift), Enter keeps the colour: the picker works without a pointer too.
  canvas.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 1, d = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key];
    if (d) { e.preventDefault(); read({ x: Math.min(canvas.width - 1, Math.max(0, at.x + d[0])), y: Math.min(canvas.height - 1, Math.max(0, at.y + d[1])) }, false); }
    else if (e.key === 'Enter') { e.preventDefault(); keepColour(); }
  });

  onFiles(drop, input, (f) => void load(f));
  q('[data-pother]').addEventListener('click', () => input.click());
}
