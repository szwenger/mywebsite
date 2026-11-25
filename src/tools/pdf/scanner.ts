import { rotatedSize } from '../crop/logic';
import { canvasBlob, decodeImage } from '../imageio';
import { applyFilter, fitSide, pageQuad, pageSkew, paperBox, insetQuad, isConvex, quadSize, warpQuad, type Filter, type Quad } from './scan';


type Msg = Record<string, string>;
const LONG = 2000;

/** A canvas holding `src` turned by `deg` degrees, big enough for the whole turned picture; the corners take `fill`. */
function turned(src: CanvasImageSource & { width: number; height: number }, deg: number, fill: string): HTMLCanvasElement {
  const d = rotatedSize(src.width, src.height, deg);
  const c = document.createElement('canvas');
  c.width = d.w; c.height = d.h;
  const g = c.getContext('2d')!;
  g.fillStyle = fill; g.fillRect(0, 0, d.w, d.h);
  g.translate(d.w / 2, d.h / 2);
  g.rotate((deg * Math.PI) / 180);
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

/** A copy of `src` no bigger than `max` on its long side, with its pixels. */
function small(src: HTMLCanvasElement, max: number) {
  const { w, h } = fitSide(src.width, src.height, max);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(src, 0, 0, w, h);
  return { k: src.width / w, w, h, px: g.getImageData(0, 0, w, h) };
}

/** The four corners of the page in `photo` (full-size pixels, clockwise from top left), or null when no page outline is found. */
function detect(photo: HTMLCanvasElement): Quad | null {
  const sm = small(photo, 500);
  const q = pageQuad(sm.px.data, sm.w, sm.h);
  return q ? (q.map((p) => ({ x: (p.x + 0.5) * sm.k, y: (p.y + 0.5) * sm.k })) as Quad) : null;
}

/** The part of `photo` inside the corners `q`, flattened to a rectangle (perspective correction). */
function flatten(photo: HTMLCanvasElement, q: Quad): HTMLCanvasElement {
  const size = fitSide(quadSize(q).w, quadSize(q).h, LONG);
  const k = size.w / quadSize(q).w;
  const src = photo.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, photo.width, photo.height);
  const out = document.createElement('canvas');
  out.width = size.w; out.height = Math.max(1, Math.round(quadSize(q).h * k));
  out.getContext('2d')!.putImageData(new ImageData(warpQuad(src, q, out.width, out.height), out.width, out.height), 0, 0);
  return out;
}

/** No page outline found: straightens by the text lines and crops to the paper. */
function straightenByText(photo: HTMLCanvasElement): HTMLCanvasElement {
  const sm = small(photo, 500);
  const skew = pageSkew(sm.px.data, sm.w, sm.h);
  let c = photo;
  if (Math.abs(skew) >= 0.3) c = turned(photo, -skew, '#000');
  const t = small(c, 500);
  let box = paperBox(t.px.data, t.w, t.h);
  if (!box && c !== photo) { c = turned(photo, -skew, '#fff'); box = null; }
  if (!box) return c;
  const inset = 2;
  const x = Math.round((box.x + inset) * t.k), y = Math.round((box.y + inset) * t.k);
  const w = Math.round((box.w - 2 * inset) * t.k), h = Math.round((box.h - 2 * inset) * t.k);
  const out = document.createElement('canvas');
  out.width = Math.max(1, w); out.height = Math.max(1, h);
  out.getContext('2d')!.drawImage(c, x, y, w, h, 0, 0, out.width, out.height);
  return out;
}

/** A rectangle 8% in from the edges: where the corner handles start when no page outline was found. */
function plainQuad(c: HTMLCanvasElement): Quad {
  const x = c.width * 0.08, y = c.height * 0.08, r = c.width - x, b = c.height - y;
  return [{ x, y }, { x: r, y }, { x: r, y: b }, { x, y: b }];
}

/**
 * The review dialog for a photographed page: straightened and cropped, with a filter, a turn button, retake, add and add-and-scan-next.
 * Returns the function that opens it for a photo; `onAdd` receives the finished page as an image file.
 */
export function initScanner(root: HTMLElement, s: Msg, onAdd: (file: File, next: boolean) => void, retake: () => void, fallback: (file: File) => void): (photo: File) => void {
  const dlg = root.querySelector<HTMLDialogElement>('[data-scan]')!;
  const out = dlg.querySelector<HTMLCanvasElement>('[data-scanout]')!;
  const wait = dlg.querySelector<HTMLElement>('[data-scanwait]')!;
  const auto = dlg.querySelector<HTMLInputElement>('[data-scanauto]')!;
  const pane = dlg.querySelector<HTMLElement>('[data-scanpane]')!;
  const zoom = dlg.querySelector<HTMLButtonElement>('[data-scanzoom]')!;
  const buttons = [...dlg.querySelectorAll<HTMLButtonElement>('[data-scanadd], [data-scannext]')];
  let bitmap: ImageBitmap | null = null;
  let turn = 0;
  const adjBtn = dlg.querySelector<HTMLButtonElement>('[data-scanadjust]')!;
  const adj = dlg.querySelector<HTMLElement>('[data-adj]')!;
  const adjCanvas = adj.querySelector<HTMLCanvasElement>('canvas')!;
  const svg = adj.querySelector<SVGSVGElement>('svg')!;
  const poly = svg.querySelector<SVGPolygonElement>('polygon')!;
  const done = dlg.querySelector<HTMLButtonElement>('[data-adjdone]')!;
  const handles = [...svg.querySelectorAll<SVGGElement>('[data-h]')];
  const thumbs = [...dlg.querySelectorAll<HTMLCanvasElement>('[data-thumb]')];
  let base: HTMLCanvasElement | null = null;
  let flat: HTMLCanvasElement | null = null; // the photo at working size, turned
  let autoQuad: Quad | null = null; // the page outline found by detection
  let userQuad: Quad | null = null; // corners the visitor dragged into place
  let corners: Quad | null = null; // the handles while adjusting
  let token = 0;

  const filter = (): Filter => (dlg.querySelector<HTMLInputElement>('[name="scanfilter"]:checked')?.value ?? 'scan') as Filter;

  function paint() {
    if (!base) return;
    out.width = base.width; out.height = base.height;
    const g = out.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(base, 0, 0);
    const px = g.getImageData(0, 0, out.width, out.height);
    applyFilter(px.data, out.width, out.height, filter());
    g.putImageData(px, 0, 0);
  }

  /** The photo at working size, turned by the chosen quarter turns, straightened when asked to. */
  async function prepare() {
    if (!bitmap) return;
    const mine = ++token;
    wait.hidden = false; out.hidden = true; buttons.forEach((b) => { b.disabled = true; }); adjBtn.disabled = true;
    await new Promise((r) => setTimeout(r, 20)); // let the dialog draw before the heavy part
    const { w, h } = fitSide(bitmap.width, bitmap.height, LONG);
    const photo = document.createElement('canvas');
    photo.width = w; photo.height = h;
    photo.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    const f = turn ? turned(photo, turn, '#fff') : photo;
    if (mine !== token) return;
    flat = f;
    autoQuad = detect(f);
    if (userQuad) base = flatten(f, userQuad);
    else if (!auto.checked) base = f;
    else base = autoQuad ? flatten(f, insetQuad(autoQuad, 0.015)) : straightenByText(f);
    paint();
    paintThumbs();
    wait.hidden = true; out.hidden = false; buttons.forEach((b) => { b.disabled = false; }); adjBtn.disabled = false;
  }

  /** The small previews on the filter buttons: this page, in each look. */
  function paintThumbs() {
    if (!base) return;
    const { w, h } = fitSide(base.width, base.height, 240);
    for (const c of thumbs) {
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.imageSmoothingQuality = 'high';
      g.drawImage(base, 0, 0, w, h);
      const px = g.getImageData(0, 0, w, h);
      applyFilter(px.data, w, h, c.dataset.thumb as Filter);
      g.putImageData(px, 0, 0);
    }
  }

  /** Corner adjusting: the whole photo with four handles; Done flattens the page between them. */
  function adjusting(on: boolean) {
    for (const el of dlg.querySelectorAll<HTMLElement>('[data-scanpane], [data-scanzoom], [data-scanadjust], .scan-ctl, .scan-act:not([data-adjact])')) el.hidden = on;
    adj.hidden = !on;
    dlg.querySelector<HTMLElement>('[data-adjact]')!.hidden = !on;
  }

  function drawCorners() {
    if (!corners || !flat) return;
    const u = 1 / (svg.getScreenCTM()?.a || 1); // one screen pixel in photo pixels
    const ok = isConvex(corners);
    adj.classList.toggle('bad', !ok);
    done.disabled = !ok;
    poly.setAttribute('points', corners.map((p) => `${p.x},${p.y}`).join(' '));
    handles.forEach((g, i) => {
      const [hit, dot] = g.querySelectorAll('circle');
      for (const c of [hit, dot]) { c.setAttribute('cx', String(corners![i].x)); c.setAttribute('cy', String(corners![i].y)); }
      hit.setAttribute('r', String(30 * u)); dot.setAttribute('r', String(11 * u));
    });
  }

  function startAdjust() {
    if (!flat) return;
    corners = (userQuad ?? (autoQuad ? insetQuad(autoQuad, 0.015) : plainQuad(flat))).map((p) => ({ ...p })) as Quad;
    adjCanvas.width = flat.width; adjCanvas.height = flat.height;
    adjCanvas.getContext('2d')!.drawImage(flat, 0, 0);
    svg.setAttribute('viewBox', `0 0 ${flat.width} ${flat.height}`);
    adjusting(true);
    drawCorners();
  }

  let drag = -1, grab = { x: 0, y: 0 };
  const toPhoto = (e: PointerEvent) => {
    const m = svg.getScreenCTM()!.inverse();
    return { x: m.a * e.clientX + m.c * e.clientY + m.e, y: m.b * e.clientX + m.d * e.clientY + m.f };
  };
  svg.addEventListener('pointerdown', (e) => {
    const g = (e.target as Element).closest('[data-h]');
    if (!g || !corners) return;
    drag = handles.indexOf(g as SVGGElement);
    const p = toPhoto(e);
    grab = { x: corners[drag].x - p.x, y: corners[drag].y - p.y }; // keep the offset so the handle does not jump under the finger
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (drag < 0 || !corners || !flat) return;
    const p = toPhoto(e);
    corners[drag] = { x: Math.min(flat.width, Math.max(0, p.x + grab.x)), y: Math.min(flat.height, Math.max(0, p.y + grab.y)) };
    drawCorners();
  });
  const drop = () => { drag = -1; };
  svg.addEventListener('pointerup', drop);
  svg.addEventListener('pointercancel', drop);

  async function finish(next: boolean) {
    if (next) retake(); // open the camera inside the tap, before the slow part: browsers only allow it right after a gesture
    const bw = filter() === 'bw';
    const blob = await canvasBlob(out, bw ? 'image/png' : 'image/jpeg', 0.88);
    if (!blob) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
    dlg.close();
    onAdd(new File([blob], `scan-${stamp}.${bw ? 'png' : 'jpg'}`, { type: blob.type }), next);
  }

  /** Fit width (scroll down the page) or the whole page on screen; the button shows what a tap does next. */
  function fit(whole: boolean) {
    pane.classList.toggle('whole', whole);
    pane.scrollTop = 0;
    zoom.querySelector<HTMLElement>('[data-zoomout]')!.hidden = whole;
    zoom.querySelector<HTMLElement>('[data-zoomin]')!.hidden = !whole;
    zoom.title = zoom.ariaLabel = whole ? s.scanWidth : s.scanFit;
  }

  dlg.addEventListener('change', () => { if (base) paint(); });
  zoom.addEventListener('click', () => fit(!pane.classList.contains('whole')));
  auto.addEventListener('change', () => { userQuad = null; void prepare(); });
  dlg.querySelector('[data-scanturn]')!.addEventListener('click', () => { turn = (turn + 90) % 360; userQuad = null; void prepare(); });
  adjBtn.addEventListener('click', startAdjust);
  dlg.querySelector('[data-adjauto]')!.addEventListener('click', () => {
    if (!flat) return;
    corners = (autoQuad ? insetQuad(autoQuad, 0.015) : plainQuad(flat)).map((p) => ({ ...p })) as Quad;
    drawCorners();
  });
  done.addEventListener('click', () => { userQuad = corners; adjusting(false); void prepare(); });
  dlg.querySelector('[data-scanretake]')!.addEventListener('click', retake);
  dlg.querySelector('[data-scanadd]')!.addEventListener('click', () => void finish(false));
  dlg.querySelector('[data-scannext]')!.addEventListener('click', () => void finish(true));
  dlg.querySelector('[data-scanclose]')!.addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { token++; bitmap?.close(); bitmap = null; base = null; flat = null; userQuad = null; adjusting(false); });

  return async (photo) => {
    try { bitmap = await decodeImage(photo); } catch { fallback(photo); return; }
    turn = 0; userQuad = null;
    fit(false);
    if (!dlg.open) dlg.showModal();
    await prepare();
  };
}
