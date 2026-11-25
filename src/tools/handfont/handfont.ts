import { MAX_VARIANTS, UNITS_PER_MM, cellsOf, charsOf, pageCount, templateSvg, type SheetConfig } from './sheet.ts';
import { cellInk, glyphFromMask, inkMask, type CellInk, type GlyphOut } from './read.ts';
import { flattenSheet } from './flatten.ts';
import { buildTtf, type Char } from './ttf.ts';

const ASC = 840, DESC = -360, FINE = 8;
const fmt = (t: string, o: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k) => String(o[k]));

interface CellState { ci: CellInk; glyph: GlyphOut | null; off: boolean }

const root = document.querySelector<HTMLElement>('[data-hf]');
if (root) init(root);

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const field = (n: string) => q<HTMLInputElement>(`[name="${n}"]`);
  const save = (blob: Blob, name: string) => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // 1. template
  const tmplBtn = q<HTMLButtonElement>('[data-template]');
  const cfgNow = (): SheetConfig => ({
    sets: [...root.querySelectorAll<HTMLInputElement>('[data-set]')].reduce((n, b) => n | (b.checked ? 1 << Number(b.dataset.set) : 0), 0),
    variants: Math.min(MAX_VARIANTS, Math.max(1, Number(field('variants').value))),
  });
  const summary = () => {
    const c = cfgNow();
    q('[data-summary]').textContent = c.sets ? fmt(s.summary, { cells: cellsOf(c).length, pages: pageCount(c) }) : '';
    tmplBtn.disabled = !c.sets;
  };
  root.querySelectorAll('[data-set], [name=variants]').forEach((e) => e.addEventListener('change', summary));
  summary();

  async function raster(svg: string, w: number, h: number): Promise<ArrayBuffer> {
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await img.decode();
    URL.revokeObjectURL(img.src);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/png'));
    return blob.arrayBuffer();
  }
  tmplBtn.addEventListener('click', async () => {
    const cfg = cfgNow();
    const label = tmplBtn.textContent;
    tmplBtn.disabled = true;
    tmplBtn.textContent = s.tmplBusy;
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      for (let p = 0; p < pageCount(cfg); p++) {
        const png = await doc.embedPng(await raster(templateSvg(cfg, p, s.tmplTitle), 1654, 2339)); // 200 dpi
        doc.addPage([595.28, 841.89]).drawImage(png, { x: 0, y: 0, width: 595.28, height: 841.89 });
      }
      save(new Blob([await doc.save()], { type: 'application/pdf' }), 'handwriting-template.pdf');
    } finally {
      tmplBtn.textContent = label;
      summary();
    }
  });

  // 2. pages
  let active: SheetConfig | null = null;
  const cells = new Map<string, CellState>();
  const log = q<HTMLUListElement>('[data-log]');
  const note = (text: string, bad = false) => {
    const li = Object.assign(document.createElement('li'), { textContent: text });
    if (bad) li.className = 'bad';
    log.append(li);
    return li;
  };
  const key = (ch: string, v: number) => `${ch}#${v}`;

  field('pages').addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    for (const f of files) {
      const li = note(fmt(s.busy, { name: f.name }));
      await new Promise((r) => setTimeout(r, 30));
      try {
        const sh = await flattenSheet(f);
        if (!sh) { li.textContent = fmt(s.pageFail, { name: f.name }); li.className = 'bad'; continue; }
        if (active && (active.sets !== sh.cfg.sets || active.variants !== sh.cfg.variants)) { li.textContent = fmt(s.pageOther, { name: f.name }); li.className = 'bad'; continue; }
        active = sh.cfg;
        const ink = inkMask(sh.flat.gray, sh.flat.w, sh.flat.h, 4 * sh.flat.ppmm);
        let n = 0;
        for (const c of cellsOf(sh.cfg).filter((c) => c.page === sh.page)) {
          const ci = cellInk(ink, sh.flat, c.col, c.row);
          cells.set(key(c.ch, c.variant), { ci, glyph: null, off: false });
          if (ci.ink >= 12) n++;
        }
        li.textContent = fmt(s.pageOk, { p: sh.page + 1, n: pageCount(sh.cfg), k: n });
      } catch {
        li.textContent = fmt(s.pageFail, { name: f.name });
        li.className = 'bad';
      }
    }
    rebuild();
  });

  // 3 + 4. letters, font, preview
  const grid = q('[data-grid]');
  const stats = q('[data-stats]');
  const outs = root.querySelectorAll<HTMLElement>('[data-out]');
  const sample = q<HTMLTextAreaElement>('[data-sample]');
  let bytes: Uint8Array | null = null;
  let counter = 0;
  let timer = 0;

  const drawGlyph = (cv: HTMLCanvasElement, g: GlyphOut | null) => {
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const k = cv.width / (23 * UNITS_PER_MM), base = (ASC / 1000) * 0.8 * cv.height;
    ctx.strokeStyle = 'rgba(128,128,128,.35)';
    ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(cv.width, base); ctx.stroke();
    if (!g) return;
    ctx.fillStyle = getComputedStyle(cv).color;
    ctx.beginPath();
    for (const c of g.contours) c.forEach((p, i) => (i ? ctx.lineTo(p.x * k, base - p.y * k) : ctx.moveTo(p.x * k, base - p.y * k)));
    ctx.fill();
  };

  function rebuild() {
    window.clearTimeout(timer);
    timer = window.setTimeout(doBuild, 150);
  }

  async function doBuild() {
    const cfg = active;
    outs.forEach((o) => (o.hidden = !cfg));
    q('[data-none]').hidden = !!cfg;
    if (!cfg) return;
    const bearing = Number(field('bearing').value), smooth = Number(field('smooth').value);
    const chars: Char[] = [];
    const missing: string[] = [];
    const all = charsOf(cfg.sets);
    grid.replaceChildren();
    for (const ch of all) {
      const vs: { advance: number; contours: GlyphOut['contours'] }[] = [];
      for (let v = 0; v < cfg.variants; v++) {
        const st = cells.get(key(ch, v));
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        const cv = document.createElement('canvas');
        cv.width = 72; cv.height = 90;
        cell.append(Object.assign(document.createElement('span'), { textContent: ch }), cv);
        grid.append(cell);
        if (!st) { cell.disabled = true; continue; }
        st.glyph = glyphFromMask(st.ci, FINE, bearing, smooth);
        drawGlyph(cv, st.glyph);
        if (!st.glyph) cell.title = s.empty;
        if (st.ci.cut) { cell.classList.add('cut'); cell.title = s.cut; }
        cell.classList.toggle('off', st.off);
        cell.addEventListener('click', () => { st.off = !st.off; rebuild(); });
        if (st.glyph && !st.off) vs.push(st.glyph);
      }
      if (vs.length) chars.push({ ch, variants: Array.from({ length: cfg.variants }, (_, i) => vs[i % vs.length]) });
      else missing.push(ch);
    }
    stats.textContent = fmt(s.found, { n: chars.length, total: all.length }) + (missing.length ? ` · ${fmt(s.missing, { list: missing.slice(0, 40).join(' ') })}` : '');
    if (!chars.length) { bytes = null; q<HTMLButtonElement>('[data-dl]').disabled = true; return; }
    const adv = chars.map((c) => c.variants[0].advance).sort((a, b) => a - b);
    const family = field('name').value.trim() || s.nameDefault;
    bytes = buildTtf({ family, unitsPerEm: 1000, ascender: ASC, descender: DESC, spaceAdvance: Math.round(adv[adv.length >> 1] * 0.6), chars });
    q<HTMLButtonElement>('[data-dl]').disabled = false;
    const fam = `hf-preview-${++counter}`;
    const face = new FontFace(fam, bytes.slice().buffer);
    await face.load();
    document.fonts.add(face);
    sample.style.fontFamily = `"${fam}", cursive`;
  }

  root.querySelectorAll('[name=bearing], [name=smooth], [name=name]').forEach((e) => e.addEventListener('input', rebuild));
  q('[data-dl]').addEventListener('click', () => {
    if (bytes) save(new Blob([bytes.slice().buffer], { type: 'font/ttf' }), `${(field('name').value.trim() || s.nameDefault).replace(/[^\w\-]+/g, '-')}.ttf`);
  });
}
