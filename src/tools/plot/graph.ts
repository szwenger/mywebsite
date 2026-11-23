import { parseAll, type Env, type Parsed } from './expr';
import { cells, contour, crossings, trace, traceParam } from './geom';
import { COLORS, fmt, logTicks, niceTicks, tableCsv, valueTable } from './logic';
import { copy, download, flagInvalid, iconButton, shake } from '../dom';

type Line = { text: string; hidden?: boolean; min: number; max: number; play?: boolean; auto?: boolean };
type View = { cx: number; cy: number; sx: number; sy: number };
type Row = { row: HTMLElement; inp: HTMLInputElement; meta: HTMLElement; sw: HTMLButtonElement };

const root = document.querySelector<HTMLElement>('[data-graph]');
if (root) {
  const s = JSON.parse(root.closest<HTMLElement>('[data-s]')!.dataset.s!) as Record<string, any>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const list = q('[data-rows]'), stage = q('[data-stage]'), canvas = q<HTMLCanvasElement>('[data-canvas]'), read = q('[data-read]'), crossEl = q('[data-cross]');
  const ctx = canvas.getContext('2d')!;
  const wins = Object.fromEntries([...root.querySelectorAll<HTMLInputElement>('[data-win]')].map((i) => [i.dataset.win!, i]));
  const KEY = 'graph-state';
  const color = (i: number) => COLORS[i % COLORS.length];

  // log axes and intersections; the view (cx, sx, ...) is kept in axis space, so for a log axis it counts decades
  const opt = { lx: false, ly: false, cross: false };
  const toA = (u: number, lg: boolean) => (lg ? (u > 0 ? Math.log10(u) : NaN) : u);
  const fromA = (a: number, lg: boolean) => (lg ? 10 ** a : a);
  const short = (v: number) => String(Number(v.toPrecision(5)));
  let lines: Line[] = [];
  let parsed: Parsed[] = [];
  const rows = new Map<Line, Row>();
  let view: View = { cx: 0, cy: 0, sx: 0, sy: 0 };
  let W = 0, H = 0;
  let pending: { w: number; ratio: number; cx: number; cy: number } | null = null;

  const newLine = (text: string, auto = false): Line => ({ text, min: -10, max: 10, auto });

  // ---- parsing and sliders
  function reparse() {
    parsed = parseAll(lines.map((l) => l.text));
    for (let pass = 0; pass < 2; pass++) {
      const have = new Set<string>(), need = new Set<string>();
      parsed.forEach((p) => { if ('item' in p) { if (p.item.kind === 'slider') have.add(p.item.name); p.item.vars.forEach((v) => need.add(v)); } });
      // sliders made for a letter that is no longer used go away again
      const stale = lines.filter((l, i) => l.auto && (parsed[i] as { item?: { kind: string; name: string } }).item?.kind === 'slider' && !need.has((parsed[i] as { item: { name: string } }).item.name));
      const add = [...need].filter((v) => !have.has(v));
      if (!stale.length && !add.length) break;
      lines = lines.filter((l) => !stale.includes(l));
      for (const v of add) lines.push(newLine(`${v} = 1`, true));
      parsed = parseAll(lines.map((l) => l.text));
    }
  }
  function env(): Env {
    const e: Env = { x: 0, y: 0, t: 0 };
    parsed.forEach((p) => { if ('item' in p && p.item.kind === 'slider') e[p.item.name] = p.item.value; });
    return e;
  }

  // ---- drawing
  /** Draws everything and returns the intersections found (empty unless switched on). */
  function paint(c: CanvasRenderingContext2D, w: number, h: number): [number, number][] {
    const { cx, cy, sx, sy } = view;
    const { lx, ly } = opt;
    const X = (u: number) => w / 2 + (toA(u, lx) - cx) * sx, Y = (v: number) => h / 2 - (toA(v, ly) - cy) * sy;
    const ux = (p: number) => fromA(cx + (p - w / 2) / sx, lx), vy = (p: number) => fromA(cy - (p - h / 2) / sy, ly);
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.lineWidth = 1; c.font = '11px system-ui, sans-serif';
    const ticks = (lg: boolean, lo: number, hi: number, n: number) => (lg ? logTicks(lo, hi, n) : { major: niceTicks(lo, hi, n), minor: [] as number[] });
    const xt = ticks(lx, ux(0), ux(w), w / 90), yt = ticks(ly, vy(h), vy(0), h / 70);
    const grid = (xs: number[], ys: number[], col: string) => {
      c.strokeStyle = col; c.beginPath();
      for (const v of xs) { const p = Math.round(X(v)) + .5; c.moveTo(p, 0); c.lineTo(p, h); }
      for (const v of ys) { const p = Math.round(Y(v)) + .5; c.moveTo(0, p); c.lineTo(w, p); }
      c.stroke();
    };
    grid(xt.minor, yt.minor, '#f1f1f5');
    grid(xt.major, yt.major, '#e6e6ec');
    c.strokeStyle = '#555'; c.beginPath();
    if (!lx && X(0) >= 0 && X(0) <= w) { c.moveTo(Math.round(X(0)) + .5, 0); c.lineTo(Math.round(X(0)) + .5, h); }
    if (!ly && Y(0) >= 0 && Y(0) <= h) { c.moveTo(0, Math.round(Y(0)) + .5); c.lineTo(w, Math.round(Y(0)) + .5); }
    c.stroke();
    const label = (t: string, x: number, y: number, align: CanvasTextAlign) => {
      c.textAlign = align; c.lineWidth = 3; c.strokeStyle = '#fff'; c.strokeText(t, x, y); c.fillStyle = '#555'; c.fillText(t, x, y);
    };
    const axisY = ly ? h - 5 : Math.min(Math.max(Y(0) + 14, 14), h - 5), axisX = lx ? 38 : Math.min(Math.max(X(0) - 6, 34), w - 4);
    for (const v of xt.major) if (v !== 0) label(fmt(v), X(v), axisY, 'center');
    for (const v of yt.major) if (v !== 0) label(fmt(v), axisX, Y(v) + 4, 'right');
    if (!lx && !ly && X(0) >= 0 && X(0) <= w && Y(0) >= 0 && Y(0) <= h) label('0', X(0) - 6, Y(0) + 14, 'right');

    const e = env();
    c.lineJoin = 'round'; c.lineCap = 'round';
    const stroke = (polys: number[][], col: string, dash = false) => {
      c.strokeStyle = col; c.lineWidth = 2.5; c.setLineDash(dash ? [7, 6] : []);
      c.beginPath();
      for (const l of polys) { c.moveTo(l[0], l[1]); for (let i = 2; i < l.length; i += 2) c.lineTo(l[i], l[i + 1]); }
      c.stroke(); c.setLineDash([]);
    };
    const edges = (f: (px: number, py: number) => number, col: string, dash = false) => {
      c.strokeStyle = col; c.lineWidth = 2.5; c.setLineDash(dash ? [7, 6] : []); c.beginPath();
      for (const [a, b, d, g] of contour(f, w, h, 4)) { c.moveTo(a, b); c.lineTo(d, g); }
      c.stroke(); c.setLineDash([]);
    };
    lines.forEach((line, i) => {
      const p = parsed[i];
      if (line.hidden || !p || !('item' in p)) return;
      const it = p.item, col = color(i);
      const ok = () => !it.cond || it.cond(e) === 1;
      try {
        if (it.kind === 'fn') {
          stroke(trace((px) => { e.x = ux(px); const v = it.y(e); e.y = v; return Number.isFinite(v) && ok() ? Y(v) : NaN; }, w, h), col);
        } else if (it.kind === 'implicit') {
          edges((px, py) => { e.x = ux(px); e.y = vy(py); return ok() ? it.f(e) : NaN; }, col);
        } else if (it.kind === 'ineq') {
          c.fillStyle = col; c.globalAlpha = 0.16;
          for (const [rx, ry, rw, rh] of cells((px, py) => { e.x = ux(px); e.y = vy(py); return it.test(e) === 1 && ok(); }, w, h, 3)) c.fillRect(rx, ry, rw, rh);
          c.globalAlpha = 1;
          edges((px, py) => { e.x = ux(px); e.y = vy(py); return ok() ? it.f(e) : NaN; }, col, it.strict);
        } else if (it.kind === 'point') {
          const px = it.px(e), py = it.py(e);
          if (Number.isFinite(px) && Number.isFinite(py)) { c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(X(px), Y(py), 5, 0, 7); c.fill(); c.stroke(); }
        } else if (it.kind === 'param' || it.kind === 'polar') {
          const lo = it.range ? it.range.lo(e) : it.kind === 'polar' ? 0 : -10, hi = it.range ? it.range.hi(e) : it.kind === 'polar' ? 12 * Math.PI : 10;
          stroke(traceParam((t) => {
            e.t = t;
            if (!ok()) return [NaN, NaN];
            if (it.kind === 'param') return [X(it.px(e)), Y(it.py(e))];
            const r = it.r(e);
            return [X(r * Math.cos(t)), Y(r * Math.sin(t))];
          }, lo, hi, 4000), col);
        }
      } catch { /* a bad line never stops the others */ }
    });

    if (!opt.cross) return [];
    // every pair of visible functions and equations, as F(x, y) = 0
    const curves: ((x: number, y: number) => number)[] = [];
    lines.forEach((line, i) => {
      const p = parsed[i];
      if (line.hidden || !p || !('item' in p) || curves.length >= 8) return;
      const it = p.item;
      const ok = () => !it.cond || it.cond(e) === 1;
      if (it.kind === 'fn') curves.push((x, y) => { e.x = x; e.y = y; const v = it.y(e); return ok() ? v - y : NaN; });
      else if (it.kind === 'implicit') curves.push((x, y) => { e.x = x; e.y = y; return ok() ? it.f(e) : NaN; });
    });
    const pts: [number, number][] = [];
    for (let i = 0; i < curves.length; i++) for (let j = i + 1; j < curves.length && pts.length < 60; j++) {
      try { pts.push(...crossings(curves[i], curves[j], w, h, (px, py) => [ux(px), vy(py)], (x, y) => [X(x), Y(y)])); } catch { /* skip this pair */ }
    }
    c.fillStyle = '#1c1c1e'; c.strokeStyle = '#fff'; c.lineWidth = 2;
    for (const [x, y] of pts) { c.beginPath(); c.arc(X(x), Y(y), 4.5, 0, 7); c.fill(); c.stroke(); }
    return pts;
  }

  let raf = 0;
  const redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  function frame() {
    if (!W || !H) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fixLog();
    showCross(paint(ctx, W, H));
    const x0 = fromA(view.cx - W / 2 / view.sx, opt.lx), x1 = fromA(view.cx + W / 2 / view.sx, opt.lx), y0 = fromA(view.cy - H / 2 / view.sy, opt.ly), y1 = fromA(view.cy + H / 2 / view.sy, opt.ly);
    for (const [k, v] of Object.entries({ xmin: x0, xmax: x1, ymin: y0, ymax: y1 })) if (document.activeElement !== wins[k]) wins[k].value = String(Number(v.toPrecision(6)));
  }

  /** A log axis stays within 300 decades so 10^x never overflows. */
  function fixLog() {
    if (opt.lx) { view.sx = Math.max(view.sx, W / 300); view.cx = Math.max(-150, Math.min(150, view.cx)); }
    if (opt.ly) { view.sy = Math.max(view.sy, H / 300); view.cy = Math.max(-150, Math.min(150, view.cy)); }
  }
  let crossText = '';
  function showCross(pts: [number, number][]) {
    const text = !opt.cross ? '' : pts.length ? pts.map(([x, y]) => `(${short(x)}, ${short(y)})`).join('  ') : s.crossNone;
    if (text === crossText) return;
    crossText = text; crossEl.textContent = text; crossEl.hidden = !text;
  }
  function resetView() {
    const sc = Math.min(W, H) / 20;
    view = { cx: opt.lx ? 1 : 0, cy: opt.ly ? 1 : 0, sx: opt.lx ? W / 4 : sc, sy: opt.ly ? H / 4 : sc };
    redraw();
  }
  /** Switches one axis between linear and log, keeping what is on screen where that is possible. */
  function setLog(axis: 'x' | 'y', on: boolean) {
    const isX = axis === 'x', was = isX ? opt.lx : opt.ly, n = isX ? W : H, c = isX ? view.cx : view.cy, sc = isX ? view.sx : view.sy;
    let lo = fromA(c - n / 2 / sc, was), hi = fromA(c + n / 2 / sc, was);
    if (isX) opt.lx = on; else opt.ly = on;
    if (on) { if (!(hi > 0)) { lo = 0.1; hi = 1000; } else if (!(lo > 0)) lo = hi / 1000; }
    const a = toA(lo, on), b = toA(hi, on), nc = (a + b) / 2, ns = clampScale(n / (b - a));
    if (isX) { view.cx = nc; view.sx = ns; } else { view.cy = nc; view.sy = ns; }
    redraw(); save();
  }
  function applyPending() {
    if (!pending || !W) return;
    const sx = W / pending.w;
    view = { cx: pending.cx, cy: pending.cy, sx, sy: sx * pending.ratio };
    pending = null;
  }
  new ResizeObserver(() => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const first = !W;
    W = r.width; H = r.height;
    if (first) { if (pending) applyPending(); else resetView(); }
    redraw();
  }).observe(stage);

  // ---- move and zoom
  const clampScale = (v: number) => Math.min(1e7, Math.max(1e-6, v));
  function zoom(f: number, px: number, py: number) {
    const u = view.cx + (px - W / 2) / view.sx, v = view.cy - (py - H / 2) / view.sy;
    view.sx = clampScale(view.sx * f); view.sy = clampScale(view.sy * f);
    view.cx = u - (px - W / 2) / view.sx; view.cy = v + (py - H / 2) / view.sy;
    redraw(); save();
  }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const ptr = new Map<number, { x: number; y: number }>();
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
  const up = (e: PointerEvent) => { ptr.delete(e.pointerId); save(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const at = (v: number, scale: number, lg: boolean) => (lg ? short(v) : v.toFixed(Math.min(10, Math.max(0, Math.ceil(Math.log10(scale)) + 1))));
    read.textContent = `(${at(fromA(view.cx + (px - W / 2) / view.sx, opt.lx), view.sx, opt.lx)}, ${at(fromA(view.cy - (py - H / 2) / view.sy, opt.ly), view.sy, opt.ly)})`;
    const prev = ptr.get(e.pointerId);
    if (!prev) return;
    if (ptr.size === 1) { view.cx -= (e.clientX - prev.x) / view.sx; view.cy += (e.clientY - prev.y) / view.sy; }
    else if (ptr.size === 2) {
      const other = [...ptr.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y), after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before > 0 && after > 0) zoom(after / before, (e.clientX + other.x) / 2 - r.left, (e.clientY + other.y) / 2 - r.top);
    }
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    redraw();
  });
  canvas.addEventListener('pointerleave', () => { read.textContent = ''; });
  q('[data-zoom-in]').addEventListener('click', () => zoom(1.4, W / 2, H / 2));
  q('[data-zoom-out]').addEventListener('click', () => zoom(1 / 1.4, W / 2, H / 2));
  q('[data-reset]').addEventListener('click', () => { resetView(); save(); });
  q('[data-square]').addEventListener('click', () => { view.sy = view.sx; redraw(); save(); });
  for (const inp of Object.values(wins)) {
    inp.addEventListener('change', () => {
      const n = (key: string) => Number(wins[key].value);
      const [a, b, c, d] = [n('xmin'), n('xmax'), n('ymin'), n('ymax')];
      const bad = ![a, b, c, d].every(Number.isFinite) || !(b > a) || !(d > c) || (opt.lx && !(a > 0)) || (opt.ly && !(c > 0));
      if (bad) { flagInvalid(inp, true); redraw(); return; }
      for (const w of Object.values(wins)) flagInvalid(w, false);
      const [la, lb, lc, ld] = [toA(a, opt.lx), toA(b, opt.lx), toA(c, opt.ly), toA(d, opt.ly)];
      view = { cx: (la + lb) / 2, cy: (lc + ld) / 2, sx: clampScale(W / (lb - la)), sy: clampScale(H / (ld - lc)) };
      redraw(); save();
    });
  }

  // ---- the expression list
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const num = (v: number) => String(Number(v.toFixed(4)));

  function makeRow(line: Line): Row {
    const row = el('div', 'g-row');
    const sw = el('button', 'g-sw'); sw.type = 'button'; sw.title = s.toggle; sw.setAttribute('aria-label', s.toggle);
    const inp = el('input', 'g-in'); inp.value = line.text; inp.placeholder = s.ph; inp.spellcheck = false; inp.autocomplete = 'off'; inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('aria-label', s.ph);
    const del = iconButton('close', s.del, true); del.classList.add('g-del');
    const meta = el('div', 'g-meta');
    row.append(sw, inp, del, meta);
    sw.addEventListener('click', () => { line.hidden = !line.hidden; update(); });
    del.addEventListener('click', () => { lines = lines.filter((l) => l !== line); if (!lines.length) lines.push(newLine('')); update(); });
    inp.addEventListener('input', () => { line.text = inp.value; line.auto = false; update(); });
    inp.addEventListener('change', () => { if (inp.getAttribute('aria-invalid') === 'true') shake(inp); }); // on leave or Enter, not per keystroke
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const at = lines.indexOf(line), n = newLine('');
      lines.splice(at + 1, 0, n);
      update();
      rows.get(n)?.inp.focus();
    });
    return { row, inp, meta, sw };
  }

  function setValue(line: Line, name: string, v: number) {
    line.text = `${name} = ${num(v)}`;
    if (v < line.min) line.min = v;
    if (v > line.max) line.max = v;
    update();
  }

  function sliderMeta(r: Row, line: Line, name: string, value: number) {
    if (r.meta.dataset.k !== `slider:${name}`) {
      r.meta.dataset.k = `slider:${name}`;
      r.meta.replaceChildren();
      const range = el('input'); range.type = 'range'; range.step = 'any'; range.setAttribute('aria-label', name);
      const lim = el('div', 'g-lim');
      const mn = el('input'); mn.type = 'number'; mn.step = 'any'; mn.setAttribute('aria-label', s.min);
      const mx = el('input'); mx.type = 'number'; mx.step = 'any'; mx.setAttribute('aria-label', s.max);
      const play = el('button', 'g-play', '▶'); play.type = 'button'; play.title = s.play; play.setAttribute('aria-label', s.play);
      lim.append(mn, el('span', '', '–'), mx, play);
      r.meta.append(range, lim);
      range.addEventListener('input', () => setValue(line, name, Number(range.value)));
      mn.addEventListener('change', () => { const v = Number(mn.value); if (Number.isFinite(v) && v < line.max) { line.min = v; update(); } });
      mx.addEventListener('change', () => { const v = Number(mx.value); if (Number.isFinite(v) && v > line.min) { line.max = v; update(); } });
      play.addEventListener('click', () => { line.play = !line.play; update(); if (line.play) requestAnimationFrame(tick); });
    }
    const [range, lim] = [r.meta.querySelector<HTMLInputElement>('input[type=range]')!, r.meta.querySelector<HTMLElement>('.g-lim')!];
    if (value < line.min) line.min = value;
    if (value > line.max) line.max = value;
    range.min = String(line.min); range.max = String(line.max); range.value = String(value);
    const [mn, mx] = lim.querySelectorAll('input');
    if (document.activeElement !== mn) mn.value = String(line.min);
    if (document.activeElement !== mx) mx.value = String(line.max);
    lim.querySelector('button')!.textContent = line.play ? '❚❚' : '▶';
  }

  function syncRows() {
    for (const [l, r] of rows) if (!lines.includes(l)) { r.row.remove(); rows.delete(l); }
    for (const l of lines) if (!rows.has(l)) rows.set(l, makeRow(l));
    const want = lines.map((l) => rows.get(l)!.row);
    if (want.length !== list.children.length || want.some((n, i) => list.children[i] !== n)) list.replaceChildren(...want);
    lines.forEach((l, i) => {
      const r = rows.get(l)!, p = parsed[i];
      r.sw.style.setProperty('--sw', color(i));
      r.sw.setAttribute('aria-pressed', String(!l.hidden));
      if (document.activeElement !== r.inp && r.inp.value !== l.text) r.inp.value = l.text;
      const bad = 'error' in p && l.text.trim() !== '';
      r.inp.setAttribute('aria-invalid', String(bad));
      if (bad) {
        const e = (p as { error: { code: string; detail: string } }).error;
        r.meta.dataset.k = 'err';
        r.meta.replaceChildren(el('span', 'g-err', `${s[`e_${e.code}`] ?? s.e_syntax}${e.detail ? ` "${e.detail}"` : ''}`));
      } else if ('item' in p && p.item.kind === 'slider') sliderMeta(r, l, p.item.name, p.item.value);
      else if (r.meta.dataset.k) { delete r.meta.dataset.k; r.meta.replaceChildren(); }
    });
  }

  function update() { reparse(); syncRows(); redraw(); renderTable(); save(); }

  // slider animation
  let last = 0;
  function tick(now: number) {
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    const playing = lines.filter((l) => l.play);
    if (!playing.length) { last = 0; return; }
    for (const l of playing) {
      const m = /^\s*([a-z])\s*=/i.exec(l.text);
      if (!m) { l.play = false; continue; }
      const cur = Number(l.text.split('=')[1]);
      const span = l.max - l.min;
      const dir = (l as { dir?: number }).dir ?? 1;
      let v = cur + (dir * span * dt) / 6000;
      if (v > l.max) { v = l.max; (l as { dir?: number }).dir = -1; } else if (v < l.min) { v = l.min; (l as { dir?: number }).dir = 1; }
      l.text = `${m[1].toLowerCase()} = ${num(v)}`;
    }
    reparse(); syncRows(); redraw(); renderTable();
    requestAnimationFrame(tick);
  }

  q('[data-add]').addEventListener('click', () => { const n = newLine(''); lines.push(n); update(); rows.get(n)?.inp.focus(); });
  const example = q<HTMLSelectElement>('[data-example]');
  example.addEventListener('change', () => {
    const ex = s.ex[Number(example.value)];
    example.value = '';
    if (!ex) return;
    lines = ex.l.map((t: string) => newLine(t));
    for (const l of rows.keys()) rows.get(l)!.row.remove();
    rows.clear();
    resetView(); update();
  });

  // ---- keeping and sharing
  const snapshot = () => ({ l: lines.map((l) => [l.text, l.hidden ? 1 : 0, l.min, l.max]), v: [view.cx, view.cy, W / view.sx, view.sy / view.sx], g: [+opt.lx, +opt.ly, +opt.cross] });
  function restore(o: any): boolean {
    try {
      if (!Array.isArray(o.l) || !o.l.length || o.l.length > 40) return false;
      const ls: Line[] = o.l.map((r: any[]) => ({ text: String(r[0]).slice(0, 300), hidden: !!r[1], min: Number(r[2]) || -10, max: Number(r[3]) || 10 }));
      const [cx, cy, w, ratio] = (o.v as number[]).map(Number);
      if (![cx, cy, w, ratio].every(Number.isFinite) || !(w > 0) || !(ratio > 0)) return false;
      lines = ls;
      const g = Array.isArray(o.g) ? o.g : [];
      opt.lx = g[0] === 1; opt.ly = g[1] === 1; opt.cross = g[2] === 1;
      pending = { cx, cy, w, ratio };
      return true;
    } catch { return false; }
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch { /* private mode */ } };
  const b64 = (str: string) => { const b = new TextEncoder().encode(str); let t = ''; b.forEach((c) => { t += String.fromCharCode(c); }); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64 = (str: string) => { const t = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(t, (c) => c.charCodeAt(0))); };

  q('[data-link]').addEventListener('click', (e) => copy(`${location.origin}${location.pathname}#g=${b64(JSON.stringify(snapshot()))}`, e.currentTarget as HTMLElement, s.linked));
  q('[data-gpng]').addEventListener('click', () => {
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const x = c.getContext('2d')!;
    x.scale(2, 2);
    paint(x, W, H);
    c.toBlob((b) => { if (b) download(b, 'graph.png'); }, 'image/png');
  });

  // ---- options: log axes, intersections
  const cbx = q<HTMLInputElement>('[data-log-x]'), cby = q<HTMLInputElement>('[data-log-y]'), cbc = q<HTMLInputElement>('[data-cross-on]');
  cbx.addEventListener('change', () => setLog('x', cbx.checked));
  cby.addEventListener('change', () => setLog('y', cby.checked));
  cbc.addEventListener('change', () => { opt.cross = cbc.checked; redraw(); save(); });

  // ---- table of values
  const tbl = q<HTMLDetailsElement>('[data-tbl]'), thead = q('[data-thead]'), tbody = q('[data-tbody]'), tbox = q('[data-tbox]'), tEmpty = q('[data-tempty]');
  const tin = (k: string) => q<HTMLInputElement>(`[data-t="${k}"]`);
  let tcsv = '';
  function renderTable() {
    if (!tbl.open) return;
    const e = env();
    const cols: { text: string; fn: (x: number) => number; at: number }[] = [];
    lines.forEach((line, i) => {
      const p = parsed[i];
      if (line.hidden || !p || !('item' in p) || p.item.kind !== 'fn') return;
      const it = p.item;
      cols.push({ text: line.text.trim(), at: i, fn: (x) => { e.x = x; const v = it.y(e); e.y = v; return !it.cond || it.cond(e) === 1 ? v : NaN; } });
    });
    const [start, step, n] = [tin('start'), tin('step'), tin('rows')].map((i) => Number(i.value));
    const ok = [Number.isFinite(start), Number.isFinite(step) && step !== 0, n >= 1];
    ['start', 'step', 'rows'].forEach((k, i) => flagInvalid(tin(k), !ok[i]));
    tEmpty.hidden = cols.length > 0; tbox.hidden = !cols.length;
    if (!cols.length || !ok.every(Boolean)) return;
    const rows = valueTable(cols.map((c) => c.fn), start, step, n);
    tcsv = tableCsv(['x', ...cols.map((c) => c.text)], rows);
    const cell = (tag: 'th' | 'td', text: string) => el(tag, '', text);
    const head = [cell('th', 'x'), ...cols.map((c) => { const h = cell('th', c.text); h.style.setProperty('--sw', color(c.at)); return h; })];
    thead.replaceChildren(...head);
    tbody.replaceChildren(...rows.map((r) => { const tr = el('tr'); tr.append(...r.map((v) => cell('td', Number.isNaN(v) ? '–' : String(v)))); return tr; }));
  }
  tbl.addEventListener('toggle', renderTable);
  for (const k of ['start', 'step', 'rows']) tin(k).addEventListener('input', renderTable);
  q('[data-tcopy]').addEventListener('click', (e) => copy(tcsv, e.currentTarget as HTMLElement, s.linked));
  q('[data-tdl]').addEventListener('click', () => download(tcsv, 'table.csv', 'text/csv'));

  let loaded = false;
  try {
    if (location.hash.startsWith('#g=')) loaded = restore(JSON.parse(unb64(location.hash.slice(3))));
    if (!loaded) { const raw = localStorage.getItem(KEY); if (raw) loaded = restore(JSON.parse(raw)); }
  } catch { /* fall back to the first example */ }
  if (!loaded) lines = s.ex[0].l.map((t: string) => newLine(t));
  if (pending && W) applyPending();
  cbx.checked = opt.lx; cby.checked = opt.ly; cbc.checked = opt.cross;
  update();
}
