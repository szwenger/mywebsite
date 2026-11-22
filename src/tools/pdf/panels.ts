import type { Ctx } from './pdf';
import { extract } from './ops';
import { parseRanges } from './ranges';
import { PAGE_SIZES, booklet, cropPages, everyOther, insertBlanks, layoutSheets, nUp, reverseOrder, splitGroups } from './layout';
import { hexToRgb, numberPages, watermark, applyItems, type Item } from './stamp';
import { alternate, fillForm, flattenForm, getInfo, listFields, optimize, overlay, recompressImages, setInfo, stripAnnotations, stripInfo, type FieldInfo } from './more';
import { protect } from './crypt';
import { autoMargins, exportImages, extractImages, extractText, findBlankPages, jpegReencoder, rasterizePages } from './rasterize';
import { buildDocx } from './textout';
import { diffLines } from '../diff/logic';
import { zip } from '../zip';
import { preview } from './preview';
import { PDFDocument } from 'pdf-lib';

const MM = 72 / 25.4;
type Bytes = Uint8Array;

export function initPanels(c: Ctx) {
  const { s } = c;
  const panel = (id: string) => c.root.querySelector<HTMLElement>(`[data-panel="${id}"]`);
  const range = (n: number) => [...Array(n).keys()];

  /** Reads a control by name inside a panel. */
  const field = (p: HTMLElement) => ({
    str: (n: string) => p.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value ?? '',
    num: (n: string, d = 0) => { const v = Number(p.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value); return Number.isFinite(v) && p.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value !== '' ? v : d; },
    on: (n: string) => !!p.querySelector<HTMLInputElement>(`[name="${n}"]`)?.checked,
    pick: (n: string) => p.querySelector<HTMLInputElement>(`[name="${n}"]:checked`)?.value ?? '',
    file: (n: string) => p.querySelector<HTMLInputElement>(`[name="${n}"]`)?.files?.[0] ?? null,
    out: (sel: string, msg: string) => { const o = p.querySelector<HTMLElement>(sel); if (o) { o.textContent = msg; o.hidden = !msg; } },
  });

  /** "1-3, 5" → page indexes; empty means the selection, or every page. Shows the error and returns null when the text is wrong. */
  const pagesOf = (text: string): number[] | null => {
    if (!text.trim()) return c.target();
    const r = parseRanges(text, c.pageCount());
    if ('error' in r) { c.error(s[r.error]); return null; }
    return r.pages;
  };
  /** Same, but "no text and nothing selected" means all pages (null). */
  const maybePages = (text: string): number[] | null | 'bad' => {
    if (!text.trim() && !c.selected().length) return null;
    const p = pagesOf(text);
    return p ?? 'bad';
  };
  const identity = () => range(c.pageCount());
  const size = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(2)} MB`);

  const wire = (id: string, actions: Record<string, (p: HTMLElement, f: ReturnType<typeof field>) => Promise<void> | void>) => {
    const p = panel(id);
    if (!p) return;
    const f = field(p);
    p.querySelectorAll<HTMLElement>('[data-do]').forEach((b) => b.addEventListener('click', () => {
      const act = actions[b.dataset.do!];
      if (act) void c.run(async () => { c.error(''); await act(p, f); });
    }));
    return { p, f };
  };

  // ---- split ----
  wire('split', {
    split: async (p, f) => {
      const n = c.pageCount();
      const mode = f.pick('mode');
      let groups: number[][];
      if (mode === 'ranges') {
        groups = [];
        for (const part of f.str('ranges').split(';').join(',').split(/\s*,\s*(?=\d)/)) {
          const r = parseRanges(part, n);
          if ('error' in r) { c.error(s[r.error]); return; }
          groups.push(r.pages);
        }
      } else groups = splitGroups(n, { every: mode === 'each' ? 1 : f.num('every', 1) });
      if (!groups.length) return;
      const files: { name: string; data: Bytes }[] = [];
      const pad = String(groups.length).length;
      for (const [k, g] of groups.entries()) { c.progress(k + 1, groups.length); files.push({ name: `${c.baseName()}-${String(k + 1).padStart(pad, '0')}.pdf`, data: await extract(c.doc(), g) }); }
      f.out('[data-out]', s.splitDone.replace('{n}', String(files.length)));
      c.save(groups.length === 1 ? files[0].data : zip(files), groups.length === 1 ? files[0].name : `${c.baseName()}-split.zip`, groups.length === 1 ? 'application/pdf' : 'application/zip');
    },
  });

  // ---- arrange ----
  wire('arrange', {
    reverse: async () => { const o = reverseOrder(c.pageCount()); await c.apply(await extract(c.doc(), o), o); },
    odd: async () => { const o = everyOther(c.pageCount(), true); await c.apply(await extract(c.doc(), o), o); },
    even: async () => { const o = everyOther(c.pageCount(), false); if (!o.length) { c.error(s.lastPage); return; } await c.apply(await extract(c.doc(), o), o); },
    'blank-insert': async (p, f) => {
      const pages = pagesOf(f.str('after'));
      if (!pages) return;
      const out = await insertBlanks(c.doc(), pages);
      const map: (number | null)[] = [];
      for (const i of identity()) { map.push(i); if (pages.includes(i)) map.push(null); }
      await c.apply(out, map);
    },
    'blank-remove': async (p, f) => {
      const blanks = await findBlankPages(c.doc(), Number(f.pick('sens') || 0.001), c.progress);
      if (!blanks.length) { f.out('[data-out]', s.noBlank); return; }
      const keep = identity().filter((i) => !blanks.includes(i));
      if (!keep.length) { f.out('[data-out]', s.allBlank); return; }
      f.out('[data-out]', s.blankGone.replace('{n}', String(blanks.length)).replace('{p}', blanks.map((b) => b + 1).join(', ')));
      await c.apply(await extract(c.doc(), keep), keep);
    },
  });

  // ---- compress ----
  const LEVELS: Record<string, { scale: number; side: number; q: number } | 'raster' | 'light'> = {
    light: 'light', balanced: { scale: 0.8, side: 1800, q: 0.78 }, strong: { scale: 0.55, side: 1300, q: 0.62 }, max: 'raster',
  };
  wire('compress', {
    compress: async (p, f) => {
      const before = c.doc().length;
      const level = LEVELS[f.pick('level') || 'balanced'];
      let out: Bytes;
      let note = '';
      if (level === 'light') out = await optimize(c.doc());
      else if (level === 'raster') out = await rasterizePages(c.doc(), { pages: null, dpi: 110, quality: 0.6 }, c.progress);
      else {
        const r = await recompressImages(c.doc(), jpegReencoder(level.scale, level.side, level.q));
        out = await optimize(r.bytes);
        note = ` ${s.imagesDone.replace('{a}', String(r.replaced)).replace('{b}', String(r.seen))}`;
      }
      if (out.length >= before) { f.out('[data-out]', s.noGain + note); return; }
      f.out('[data-out]', `${size(before)} → ${size(out.length)} (−${Math.round((1 - out.length / before) * 100)} %)${note}`);
      await c.apply(out, identity());
    },
  });

  // ---- convert ----
  wire('convert', {
    images: async (p, f) => {
      const zipBytes = await exportImages(c.doc(), { fmt: f.str('fmt') as 'png', dpi: f.num('dpi', 150), quality: 0.9, name: c.baseName() }, c.progress);
      c.save(zipBytes, `${c.baseName()}-images.zip`, 'application/zip');
    },
    text: async () => {
      const pages = await extractText(c.doc());
      const joined = pages.map((t, i) => (pages.length > 1 ? `--- ${s.page} ${i + 1} ---\n` : '') + t).join('\n\n');
      c.save(new TextEncoder().encode(joined), `${c.baseName()}.txt`, 'text/plain;charset=utf-8');
    },
    docx: async () => c.save(buildDocx(await extractText(c.doc())), `${c.baseName()}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    extimg: async (p, f) => {
      const z = await extractImages(c.doc(), c.baseName());
      if (!z) { f.out('[data-out]', s.noImages); return; }
      c.save(z, `${c.baseName()}-embedded-images.zip`, 'application/zip');
    },
    gray: async () => c.apply(await rasterizePages(c.doc(), { pages: null, dpi: 130, quality: 0.8, gray: true }, c.progress), identity()),
    invert: async () => c.apply(await rasterizePages(c.doc(), { pages: null, dpi: 130, quality: 0.85, invert: true }, c.progress), identity()),
    flat: async () => c.apply(await rasterizePages(c.doc(), { pages: null, dpi: 170, quality: 0.85 }, c.progress), identity()),
  });

  // ---- page numbers, header and footer ----
  wire('number', {
    number: async (p, f) => {
      const out = await numberPages(c.doc(), {
        pos: (f.pick('pos') || 'bc') as 'bc', template: f.str('template') || '{n}', start: f.num('start', 1), first: Math.max(1, f.num('first', 1)),
        size: f.num('size', 11), margin: f.num('margin', 28), color: hexToRgb(f.str('color') || '#000000'),
      }, c.render);
      await c.apply(out, identity());
    },
  });
  panel('number')?.querySelectorAll<HTMLElement>('[data-tpl]').forEach((b) => b.addEventListener('click', () => { const i = panel('number')!.querySelector<HTMLInputElement>('[name="template"]')!; i.value = b.dataset.tpl!; i.dispatchEvent(new Event('input', { bubbles: true })); }));

  // ---- watermark ----
  wire('watermark', {
    watermark: async (p, f) => {
      const pages = maybePages(f.str('pages'));
      if (pages === 'bad') return;
      if (f.pick('wmkind') === 'image') {
        const file = f.file('wmimg');
        if (!file) { c.error(s.pickImage); return; }
        const raw = new Uint8Array(await file.arrayBuffer());
        const bmp = await createImageBitmap(file);
        const type = raw[0] === 0xff ? 'image/jpeg' as const : 'image/png' as const;
        let bytes = raw;
        if (raw[0] !== 0xff && !(raw[0] === 0x89 && raw[1] === 0x50)) { const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; cv.getContext('2d')!.drawImage(bmp, 0, 0); bytes = new Uint8Array(await (await new Promise<Blob>((d) => cv.toBlob((b) => d(b!), 'image/png'))).arrayBuffer()); }
        const w = f.num('imgsize', 50) / 100;
        const doc = await PDFDocument.load(c.doc());
        const items: Item[] = doc.getPages().flatMap((pg, i): Item[] => {
          if (pages && !pages.includes(i)) return [];
          const sz = pg.getSize();
          const h = (w * sz.width * bmp.height) / bmp.width / sz.height;
          return [{ kind: 'image', page: i, bytes, type: bytes === raw ? type : 'image/png', x: (1 - w) / 2, y: (1 - h) / 2, w, opacity: f.num('imgopacity', 30) / 100 }];
        });
        await c.apply(await applyItems(c.doc(), items), identity());
        return;
      }
      if (!f.str('text').trim()) { c.error(s.needText); return; }
      await c.apply(await watermark(c.doc(), { text: f.str('text'), size: f.num('size', 64), angle: f.num('angle', 45), opacity: f.num('opacity', 20) / 100, color: hexToRgb(f.str('color') || '#808080'), pages }, c.render), identity());
    },
  });

  // ---- crop and page size ----
  wire('crop', {
    crop: async (p, f) => {
      const pages = maybePages(f.str('pages'));
      if (pages === 'bad') return;
      try {
        await c.apply(await cropPages(c.doc(), { top: f.num('top') * MM, right: f.num('right') * MM, bottom: f.num('bottom') * MM, left: f.num('left') * MM }, pages), identity());
      } catch (e) { if ((e as Error).message === 'too-much') c.error(s.tooMuch); else throw e; }
    },
    autocrop: async (p, f) => {
      const m = await autoMargins(c.doc(), f.num('pad', 8));
      // Pages are cut one by one, each to its own content.
      let bytes = c.doc();
      for (const [i, mm] of m.entries()) { if (mm) { try { bytes = await cropPages(bytes, mm, [i]); } catch { /* an empty page stays as it is */ } } }
      await c.apply(bytes, identity());
    },
    resize: async (p, f) => {
      const key = f.str('psize');
      if (!key) return;
      const [w, h] = PAGE_SIZES[key];
      const pages = identity().map((i) => [i]);
      const landscape = f.str('orient') === 'landscape';
      await c.apply(await layoutSheets(c.doc(), pages, { size: f.str('orient') === 'auto' ? [w, h] : [w, h], landscape: f.str('orient') === 'auto' ? false : landscape, cols: 1, rows: 1, margin: f.num('pmargin', 0) * MM, gap: 0, border: false }), identity());
    },
  });

  // ---- pages per sheet and booklet ----
  const GRID: Record<string, [number, number]> = { 2: [2, 1], 4: [2, 2], 6: [3, 2], 8: [4, 2], 9: [3, 3] };
  wire('nup', {
    nup: async (p, f) => {
      const per = f.str('per') || '2';
      const [cols, rows] = GRID[per];
      const sizeKey = f.str('sheet');
      const out = await nUp(c.doc(), cols * rows, {
        size: sizeKey === 'first' ? 'first' : PAGE_SIZES[sizeKey], landscape: cols > rows || f.str('orient') === 'landscape', cols, rows,
        margin: f.num('margin', 8) * MM, gap: f.num('gap', 4) * MM, border: f.on('border'),
      });
      await c.apply(out, range(Math.ceil(c.pageCount() / (cols * rows))).map(() => null));
    },
    booklet: async (p, f) => {
      const k = f.str('sheet');
      const out = await booklet(c.doc(), k === 'first' ? 'first' : PAGE_SIZES[k]);
      await c.apply(out, range(Math.ceil(c.pageCount() / 4) * 2).map(() => null));
    },
  });

  // ---- forms ----
  let fields: FieldInfo[] = [];
  const formsP = wire('forms', {
    fill: async (p, f) => {
      const values: Record<string, string | boolean> = {};
      p.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]').forEach((el) => {
        const info = fields[Number(el.dataset.field)];
        if (el.type === 'checkbox') { if ((el as HTMLInputElement).checked !== info.value) values[info.name] = (el as HTMLInputElement).checked; }
        else if (el.value !== info.value) values[info.name] = el.value;
      });
      const r = await fillForm(c.doc(), values, f.on('flatten'));
      if (r.skipped.length) f.out('[data-out]', s.fieldSkipped.replace('{f}', r.skipped.join(', ')));
      await c.apply(r.bytes, identity());
    },
    flatten: async () => c.apply(await flattenForm(c.doc()), identity()),
  });
  async function loadFields() {
    if (!formsP || formsP.p.hidden) return;
    const host = formsP.p.querySelector<HTMLElement>('[data-fields]')!;
    try { fields = await listFields(c.doc()); } catch { fields = []; }
    formsP.p.querySelector<HTMLElement>('[data-nofields]')!.hidden = fields.length > 0;
    formsP.p.querySelector<HTMLElement>('[data-hasfields]')!.hidden = fields.length === 0;
    host.replaceChildren(...fields.map((fl, i) => {
      const label = document.createElement('label');
      label.append(Object.assign(document.createElement('span'), { textContent: fl.name }));
      let input: HTMLElement;
      if (fl.type === 'check') input = Object.assign(document.createElement('input'), { type: 'checkbox', checked: fl.value as boolean });
      else if (fl.type === 'text') input = Object.assign(document.createElement('input'), { type: 'text', value: String(fl.value) });
      else if (fl.options.length) { input = document.createElement('select'); (input as HTMLSelectElement).append(...[''].concat(fl.options).map((o) => new Option(o, o))); (input as HTMLSelectElement).value = String(fl.value); }
      else return document.createDocumentFragment();
      input.dataset.field = String(i);
      if (fl.readOnly) (input as HTMLInputElement).disabled = true;
      if (fl.type === 'check') label.className = 'check';
      label.append(input);
      return label;
    }));
  }

  // ---- protect ----
  wire('protect', {
    protect: async (p, f) => {
      if (!f.str('upw') && !f.str('opw')) { c.error(s.needPw); return; }
      const out = await protect(c.doc(), { user: f.str('upw'), owner: f.str('opw') || undefined, allow: { print: f.on('aprint'), copy: f.on('acopy'), modify: f.on('amodify'), annotate: f.on('aannot') } });
      c.save(out, `${c.baseName()}-protected.pdf`, 'application/pdf');
      f.out('[data-out]', s.protectedDone);
    },
  });

  // ---- document information ----
  const infoP = wire('info', {
    save: async (p, f) => c.apply(await setInfo(c.doc(), { title: f.str('title'), author: f.str('author'), subject: f.str('subject'), keywords: f.str('keywords'), creator: f.str('creator'), producer: f.str('producer') }), identity()),
    strip: async () => { await c.apply(await stripInfo(c.doc()), identity()); await loadInfo(); },
    annots: async (p, f) => { const pages = maybePages(f.str('apages')); if (pages === 'bad') return; await c.apply(await stripAnnotations(c.doc(), pages), identity()); },
  });
  async function loadInfo() {
    if (!infoP || infoP.p.hidden) return;
    const i = await getInfo(c.doc());
    for (const [k, v] of Object.entries(i)) { const el = infoP.p.querySelector<HTMLInputElement>(`[name="${k}"]`); if (el) el.value = v; }
  }

  // ---- two documents ----
  const second = async (name: string): Promise<Bytes | null> => {
    const file = panel('mix')?.querySelector<HTMLInputElement>(`[data-mixfile="${name}"]`)?.files?.[0];
    if (!file) { c.error(s.pickPdf); return null; }
    return new Uint8Array(await file.arrayBuffer());
  };
  wire('mix', {
    overlay: async (p, f) => {
      const top = await second('overlay');
      if (!top) return;
      await c.apply(await overlay(c.doc(), top, { under: f.pick('where') === 'under', cycle: f.on('cycle'), opacity: f.num('oopacity', 100) / 100 }), identity());
    },
    alternate: async (p, f) => {
      const b = await second('alternate');
      if (!b) return;
      const n = c.pageCount();
      const m = (await PDFDocument.load(b)).getPageCount();
      const map: (number | null)[] = [];
      for (let i = 0; i < Math.max(n, m); i++) { if (i < n) map.push(i); if (i < m) map.push(null); }
      await c.apply(await alternate(c.doc(), b, f.on('revb')), map);
    },
    compare: async (p, f) => {
      const b = await second('compare');
      if (!b) return;
      const [ta, tb] = await Promise.all([extractText(c.doc()), extractText(b)]);
      const { ops, stats } = diffLines(ta.join('\n'), tb.join('\n'), { ignoreWs: true });
      const host = p.querySelector<HTMLElement>('[data-diff]')!;
      host.hidden = false;
      const rows = ops.slice(0, 3000).filter((o, i, a) => o.t !== 'eq' || a[i - 1]?.t !== 'eq' || a[i + 1]?.t !== 'eq').map((o) => {
        const d = document.createElement('div');
        d.className = o.t === 'add' ? 'add' : o.t === 'del' ? 'del' : '';
        d.textContent = (o.t === 'add' ? '+ ' : o.t === 'del' ? '− ' : '  ') + o.text;
        return d;
      });
      host.replaceChildren(Object.assign(document.createElement('p'), { className: 'meta', textContent: stats.added + stats.removed === 0 ? s.same : s.diffStats.replace('{a}', String(stats.added)).replace('{r}', String(stats.removed)) }), ...rows);
    },
  });

  // ---- live previews: the same code as the buttons, run on one sample page ----
  const gridOf = (per: string) => GRID[per] ?? GRID['2'];
  const sheetOf = (k: string): [number, number] | 'first' => (k === 'first' ? 'first' : PAGE_SIZES[k]);
  const pv = (id: string, spec: Parameters<typeof preview>[2]) => { const p = panel(id); if (p) preview(c, p, spec); };
  const F = (id: string) => field(panel(id)!);

  pv('number', {
    slot: 'number', watch: ['pos', 'template', 'start', 'first', 'size', 'margin', 'color'],
    build: async (sample, at) => {
      const f = F('number');
      const first = Math.max(1, f.num('first', 1));
      if (at < first - 1) return sample; // this page would not be numbered
      const template = (f.str('template') || '{n}').replace(/\{total\}/g, String(c.pageCount()));
      return numberPages(sample, { pos: (f.pick('pos') || 'bc') as 'bc', template, start: f.num('start', 1) + at - (first - 1), first: 1, size: f.num('size', 11), margin: f.num('margin', 28), color: hexToRgb(f.str('color') || '#000000') }, c.render);
    },
  });
  pv('watermark', {
    slot: 'watermark', watch: ['wmkind', 'text', 'size', 'angle', 'opacity', 'color'],
    build: async (sample) => {
      const f = F('watermark');
      if (f.pick('wmkind') === 'image' || !f.str('text').trim()) return null;
      return watermark(sample, { text: f.str('text'), size: f.num('size', 64), angle: f.num('angle', 45), opacity: f.num('opacity', 20) / 100, color: hexToRgb(f.str('color') || '#808080'), pages: null }, c.render);
    },
  });
  pv('crop', {
    slot: 'crop', watch: ['top', 'right', 'bottom', 'left'],
    build: async (sample) => {
      const f = F('crop');
      try { return await cropPages(sample, { top: f.num('top') * MM, right: f.num('right') * MM, bottom: f.num('bottom') * MM, left: f.num('left') * MM }, null); } catch { return null; }
    },
  });
  pv('crop', {
    slot: 'autocrop', watch: ['pad'],
    build: async (sample) => {
      const m = (await autoMargins(sample, F('crop').num('pad', 8)))[0];
      return m ? cropPages(sample, m, null) : null;
    },
  });
  pv('crop', {
    slot: 'resize', watch: ['psize', 'orient', 'pmargin'],
    build: async (sample) => {
      const f = F('crop');
      const key = f.str('psize');
      if (!key) return null;
      return layoutSheets(sample, [[0]], { size: PAGE_SIZES[key], landscape: f.str('orient') === 'landscape', cols: 1, rows: 1, margin: f.num('pmargin', 0) * MM, gap: 0, border: false });
    },
  });
  pv('nup', {
    slot: 'nup', watch: ['per', 'sheet', 'orient', 'margin', 'gap', 'border'],
    take: () => { const [cols, rows] = gridOf(panel('nup')!.querySelector<HTMLSelectElement>('[name="per"]')!.value); return cols * rows; },
    build: async (sample) => {
      const f = F('nup');
      const [cols, rows] = gridOf(f.str('per') || '2');
      return nUp(sample, cols * rows, { size: sheetOf(f.str('sheet')), landscape: cols > rows || f.str('orient') === 'landscape', cols, rows, margin: f.num('margin', 8) * MM, gap: f.num('gap', 4) * MM, border: f.on('border') });
    },
  });
  pv('nup', {
    slot: 'booklet', watch: ['sheet'], show: 2, take: () => 4,
    build: async (sample) => {
      const sheet = panel('nup')!.querySelectorAll<HTMLSelectElement>('[name="sheet"]')[1];
      return booklet(sample, sheetOf(sheet?.value ?? 'first'));
    },
  });
  const mixFile = async (name: string) => {
    const file = panel('mix')?.querySelector<HTMLInputElement>(`[data-mixfile="${name}"]`)?.files?.[0];
    return file ? new Uint8Array(await file.arrayBuffer()) : null;
  };
  pv('mix', {
    slot: 'overlay', watch: ['oopacity', 'where', 'cycle'],
    build: async (sample) => {
      const top = await mixFile('overlay');
      const f = F('mix');
      return top ? overlay(sample, top, { under: f.pick('where') === 'under', cycle: f.on('cycle'), opacity: f.num('oopacity', 100) / 100 }) : null;
    },
  });
  pv('mix', {
    slot: 'alternate', watch: ['revb'], show: 2,
    build: async (sample) => {
      const b = await mixFile('alternate');
      return b ? alternate(sample, b, F('mix').on('revb')) : null;
    },
  });

  c.onTab((id) => { if (id === 'forms') void loadFields(); if (id === 'info') void loadInfo(); });
  c.onChange(() => { void loadFields(); void loadInfo(); });
}
