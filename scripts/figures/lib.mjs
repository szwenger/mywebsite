// Blog figure templates. Pure functions: a spec (JSON) in, an HTML string out. Style rules: ~/.claude/skills/new-blog-post/references/figures.md
// Rendering to PNG/WebP is in render.mjs. No dependencies.

/** Same layout, two palettes. Light is the paper look; dark is the night look. Series colours were checked with the dataviz validate_palette.js against each surface (light #fcfcfb, dark #0f1219): lightness band, CVD separation and 3:1 contrast pass. Re-run it after changing any of them. */
export const THEMES = {
  light: {
    paper: '#fcfcfb', ink: '#14161c', muted: '#5b6070', grid: '#d9dae0', rule: '#dedfe4', connector: '#b9bccb', ring: '#ffffff', eyebrow: '#4a58c4',
    indigo: '#4a58c4', amber: '#c46a1d', en: '#3076cc', de: '#e86c38', ru: '#0e9a68',
    glow: 'radial-gradient(900px 520px at 8% 0%, #e4e7fa, transparent 70%), radial-gradient(800px 460px at 100% 100%, #dcefe8, transparent 70%), #fcfcfb',
    zone: '#c4c8d6', node: '#ffffff', nodeEdge: '#d4d7e2', link: '#5b6070', tun: '#4a58c4', badge: '#4a58c4',
  },
  dark: {
    paper: '#0f1219', ink: '#eceef5', muted: '#9097ab', grid: '#2a2f3f', rule: '#2a2f3f', connector: '#3a4054', ring: '#0f1219', eyebrow: '#8c97f0',
    indigo: '#6672d8', amber: '#d07a2c', en: '#4a86d6', de: '#d9703f', ru: '#1ca877',
    glow: 'radial-gradient(900px 520px at 8% 0%, #252a44, transparent 70%), radial-gradient(800px 460px at 100% 100%, #142426, transparent 70%), #0d0f14',
    zone: '#3a4054', node: '#1c2030', nodeEdge: '#2c3246', link: '#9097ab', tun: '#6b7be0', badge: '#4a58c4',
  },
};
export const themeNames = Object.keys(THEMES);
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Segoe UI', system-ui, sans-serif";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n) => Number(n.toFixed(1));
const textW = (s, px) => String(s).length * px * 0.55; // rough Segoe UI width, good enough for layout

// ---------- axes

export function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

/** Linear axis from 0 with roughly `target` ticks and 10% head room above the largest value. */
export function linearAxis(max, target = 4) {
  const step = niceStep((max * 1.1) / target);
  const hi = Math.ceil((max * 1.1) / step - 1e-9) * step;
  const ticks = [];
  for (let v = 0; v <= hi + step / 1e6; v += step) ticks.push(Number(v.toPrecision(12)));
  const decimals = step < 1 ? Math.ceil(-Math.log10(step) - 1e-9) : 0;
  return { lo: 0, hi, ticks, minor: [], log: false, decimals };
}

/** Log axis: labelled ticks at 1 and 3 times a power of ten, unlabelled minor ticks at 2 and 4 to 9. Room for value labels on both sides. */
export function logAxis(min, max) {
  const lo = min / 1.5, hi = max * 1.85, ticks = [], minor = [];
  for (let k = Math.floor(Math.log10(lo)); k <= Math.ceil(Math.log10(hi)); k++) {
    for (let m = 1; m <= 9; m++) {
      const v = m * 10 ** k;
      if (v < lo || v > hi) continue;
      (m === 1 || m === 3 ? ticks : minor).push(v);
    }
  }
  return { lo, hi, ticks, minor, log: true, decimals: 0 };
}

const tickText = (v, ax) => (ax.log ? v.toLocaleString('en-US') : v.toFixed(ax.decimals));
const valText = (v) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : String(Number(v.toPrecision(3))));

// ---------- benchmark chart (light paper, 1600 x 900)

/** Everything the chart needs to draw, computed once. Throws when a style rule is broken. */
export function chartLayout(spec) {
  for (const k of ['title', 'subtitle', 'axisTitle', 'source']) if (!spec[k]) throw new Error(`chart spec needs "${k}" (style rule: title, subtitle, axis title and source are always present)`);
  const W = 1600, ML = 80, MR = 80;
  const titleLines = spec.title.split('\n');
  if (titleLines.length > 2) throw new Error('headline is at most two lines');
  const dy = (2 - titleLines.length) * 50;
  const sers = spec.series, n = spec.rows.length;
  const all = spec.rows.flatMap((r) => sers.map((s) => r.values[s.id]).filter((v) => v != null));
  const ax = spec.scale === 'log' ? logAxis(Math.min(...all), Math.max(...all)) : linearAxis(Math.max(...all));
  const labelW = Math.max(...spec.rows.map((r) => textW(r.label, 19)));
  const x0 = Math.max(ML + labelW + 24, 330), x1 = spec.result ? 1360 : W - MR - 24;
  const span = Math.log10(ax.hi) - Math.log10(ax.lo);
  const pos = (v) => x0 + ((ax.log ? (Math.log10(v) - Math.log10(ax.lo)) / span : (v - ax.lo) / (ax.hi - ax.lo)) * (x1 - x0));
  const top = 296 - dy, axisY = 770, rowH = (axisY - top) / n;
  const rows = spec.rows.map((r, i) => {
    const cy = top + rowH * (i + 0.5);
    const marks = sers.map((s, k) => ({ id: s.id, s, v: r.values[s.id], x: r.values[s.id] == null ? null : pos(r.values[s.id]), k })).filter((m) => m.v != null);
    const off = spec.kind === 'dots' ? Math.min(12, rowH / 4) : 0;
    marks.forEach((m) => { m.y = cy + (m.k - (sers.length - 1) / 2) * off; });
    let ratio = null;
    if (spec.result) { const a = r.values[spec.result.from], b = r.values[spec.result.to]; ratio = b / a; }
    return { label: r.label, note: r.note, cy, marks, ratio };
  });
  return { W, ML, MR, dy, titleLines, ax, x0, x1, top, axisY, rows, pos, rowH };
}

export function chartHtml(spec, theme = 'light') {
  const T = THEMES[theme];
  const L = chartLayout(spec);
  const { W, ML, MR, dy, titleLines, ax, x0, x1, top, axisY, rows, pos } = L;
  const sers = spec.series, col = (s) => T[s.color] ?? s.color, mid = (x0 + x1) / 2;
  const o = [];
  o.push(`<text x="${ML}" y="50" font-size="16" font-weight="700" letter-spacing="1" fill="${T.eyebrow}">GALUIN · BENCHMARK DESK</text>`);
  o.push(`<rect x="${ML}" y="66" width="${W - ML - MR}" height="3" fill="${T.ink}"/>`);
  titleLines.forEach((t, i) => o.push(`<text x="${ML}" y="${120 + i * 50}" font-family="${SERIF}" font-size="48" font-weight="700" fill="${T.ink}">${esc(t)}</text>`));
  o.push(`<text x="${ML}" y="${230 - dy}" font-size="19" fill="${T.muted}">${esc(spec.subtitle)}</text>`);
  // legend, centred over the plot
  const widths = sers.map((s) => 16 + textW(s.name, 18));
  let lx = mid - (widths.reduce((a, b) => a + b, 0) + 60 * (sers.length - 1)) / 2;
  const ly = 266 - dy;
  sers.forEach((s, i) => {
    o.push(`<circle cx="${r1(lx + 6)}" cy="${ly - 5}" r="6" fill="${col(s)}"/><text x="${r1(lx + 22)}" y="${ly}" font-size="18" fill="${T.ink}">${esc(s.name)}</text>`);
    lx += widths[i] + 60;
  });
  if (spec.result) o.push(`<text x="1455" y="${ly}" font-size="17" text-anchor="middle" fill="${T.muted}">${esc(spec.result.title)}</text>`);
  // grid, axis, ticks
  for (const v of ax.ticks) o.push(`<line x1="${r1(pos(v))}" x2="${r1(pos(v))}" y1="${top - 6}" y2="${axisY}" stroke="${T.grid}" stroke-width="1.5"/><text x="${r1(pos(v))}" y="${axisY + 22}" font-size="17" text-anchor="middle" fill="${T.muted}">${tickText(v, ax)}</text>`);
  for (const v of ax.minor) o.push(`<line x1="${r1(pos(v))}" x2="${r1(pos(v))}" y1="${axisY}" y2="${axisY + 5}" stroke="${T.grid}" stroke-width="1.5"/>`);
  o.push(`<line x1="${x0 - 20}" x2="${x1 + 20}" y1="${axisY}" y2="${axisY}" stroke="${T.grid}" stroke-width="1.5"/>`);
  o.push(`<text x="${r1(mid)}" y="${axisY + 48}" font-size="15" text-anchor="middle" fill="${T.muted}">${esc(spec.axisTitle)}</text>`);
  // rows
  const rad = spec.kind === 'dots' ? 7 : 9;
  for (const r of rows) {
    o.push(`<text x="${r1(x0 - 24)}" y="${r1(r.cy + 6)}" font-size="19" text-anchor="end" fill="${T.ink}">${esc(r.label)}</text>`);
    const xs = r.marks.map((m) => m.x);
    if (xs.length > 1) o.push(`<line x1="${r1(Math.min(...xs))}" x2="${r1(Math.max(...xs))}" y1="${r1(r.cy)}" y2="${r1(r.cy)}" stroke="${T.connector}" stroke-width="5" stroke-linecap="round"/>`);
    const sorted = [...r.marks].sort((a, b) => a.v - b.v);
    for (const m of r.marks) {
      o.push(`<circle cx="${r1(m.x)}" cy="${r1(m.y)}" r="${rad}" fill="${col(m.s)}"${spec.kind === 'dots' ? ` stroke="${T.ring}" stroke-width="2"` : ''}/>`);
      if (spec.valueLabels) {
        const left = m === sorted[0] && sorted.length > 1;
        o.push(`<text x="${r1(m.x + (left ? -(rad + 14) : rad + 14))}" y="${r1(m.y + 5)}" font-size="16" font-weight="700" text-anchor="${left ? 'end' : 'start'}" fill="${col(m.s)}">${valText(m.v)}</text>`);
      }
    }
    if (r.note) o.push(`<text x="${r1(Math.max(...xs) + 24)}" y="${r1(r.cy + 5)}" font-size="16" fill="${T.muted}">${esc(r.note)}</text>`);
    if (r.ratio != null) o.push(`<text x="1455" y="${r1(r.cy + 9)}" font-family="${SERIF}" font-size="26" font-weight="700" text-anchor="middle" fill="${r.ratio < 1 ? T.amber : T.ink}">${r.ratio.toFixed(1)}×</text>`);
  }
  // footer
  if (textW(spec.source, 15) > 1280) console.warn('source line is too long for one line, shorten it');
  o.push(`<line x1="${ML}" x2="${W - MR}" y1="838" y2="838" stroke="${T.rule}" stroke-width="1.5"/>`);
  o.push(`<text x="${ML}" y="868" font-size="15" fill="${T.muted}">${esc(spec.source)}</text><text x="${W - MR}" y="868" font-size="15.5" font-weight="700" text-anchor="end" fill="${T.ink}">galuin.com</text>`);
  return page(1600, 900, T.paper, `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" font-family="${SANS}">${o.join('\n')}</svg>`);
}

// ---------- photo comparison grid (dark)

/** Columns = setups, rows = prompts. `margin` 30 for cover and title pictures, 10 for inline strips. `images[row][col]` are file paths or URLs. */
export function gridLayout(spec) {
  const W = 1600, m = spec.margin ?? 30, g = spec.gutter ?? 20, cols = spec.columns.length;
  const cell = (W - 2 * m - (cols - 1) * g) / cols;
  const rows = spec.images.length;
  const head = 75;
  const H = spec.height ?? Math.round(m + head + rows * cell + (rows - 1) * g + m);
  return { W, H, m, g, cell, head };
}

export function gridHtml(spec, theme = 'light') {
  const T = THEMES[theme];
  const { W, H, m, g, cell, head } = gridLayout(spec);
  const o = [];
  spec.columns.forEach((c, i) => {
    const x = m + i * (cell + g);
    o.push(`<text x="${x}" y="${m + 20}" font-size="20" font-weight="700" fill="${T.ink}">${esc(c.title)}</text><text x="${x}" y="${m + 47}" font-size="17" fill="${T.muted}">${esc(c.sub ?? '')}</text>`);
    spec.images.forEach((row, j) => o.push(`<image href="${esc(row[i])}" x="${x}" y="${m + head + j * (cell + g)}" width="${cell}" height="${cell}" preserveAspectRatio="xMidYMid slice"/>`));
  });
  return page(W, H, T.paper, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}">${o.join('\n')}</svg>`);
}

// ---------- schema (inline SVG for the post, dark card for the cover)

/** The inline SVG with the classes `blog/[slug].astro` already styles, so it follows light and dark mode. Paste it into the post. */
export function schemaSvg(spec) {
  const [w, h] = spec.viewBox ?? [760, 250], id = spec.markerId ?? 'ah1';
  const o = [`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(spec.label)}">`];
  o.push(`<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>`);
  for (const z of spec.zones) o.push(`<rect class="z" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14"/><text class="zt" x="${z.x + 14}" y="${z.y + 22}">${esc(z.label)}</text>`);
  for (const n of spec.nodes) o.push(`<g><rect class="n" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10"/><text class="t" x="${n.x + n.w / 2}" y="${n.y + n.h / 2 - 3}" text-anchor="middle">${esc(n.title)}</text><text class="s" x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + 14}" text-anchor="middle">${esc(n.sub ?? '')}</text></g>`);
  for (const l of spec.links) o.push(`<path class="l${l.special ? ' tun' : ''}" d="${l.d}"${l.both ? ` marker-start="url(#${id})"` : ''} marker-end="url(#${id})"/>`);
  o.push(spec.badges.map((b) => `<circle class="b" cx="${b.x}" cy="${b.y}" r="10"/><text class="bn" x="${b.x}" y="${b.y + 4}" text-anchor="middle">${b.n}</text>`).join(''));
  for (const t of spec.notes ?? []) o.push(`<text class="s" x="${t.x}" y="${t.y}">${esc(t.text)}</text>`);
  o.push('</svg>');
  return o.join('\n');
}

/** Cover: the same schema on the dark card. 1600 x 900, export to 1280 x 720 WebP with render.mjs. */
export function schemaCoverHtml(spec, fonts = {}, theme = 'light') {
  const T = THEMES[theme];
  const [w, h] = spec.viewBox ?? [760, 250], svgW = 1440, svgH = Math.round((h * svgW) / w);
  const face = (name, file) => (file ? `@font-face{font-family:'${name}';src:url('${file}');font-weight:100 900}` : '');
  const title = spec.title.split('\n').map((t, i) => `<text x="80" y="${150 + i * 88}" class="ttl">${esc(t)}</text>`).join('');
  const css = `${face('Unbounded', fonts.display)}${face('Onest', fonts.sans)}
.ttl{font:700 66px 'Unbounded',${SANS};fill:${T.ink}}.sub{font:400 34px 'Onest',${SANS};fill:${T.muted}}
svg text{font-family:'Onest',${SANS}}
.z{fill:none;stroke:${T.zone};stroke-dasharray:5 5}.zt{fill:${T.muted};font-size:12px;font-weight:600}
.n{fill:${T.node};stroke:${T.nodeEdge}}.t{fill:${T.ink};font-size:14px;font-weight:600}.s{fill:${T.muted};font-size:11.5px}
.l{fill:none;stroke:${T.link};stroke-width:1.5}.tun{stroke:${T.tun};stroke-width:2.5;stroke-dasharray:6 4}.ah{fill:${T.link}}
.b{fill:${T.badge}}.bn{fill:#fff;font-size:11px;font-weight:600}`;
  const lines = spec.title.split('\n').length;
  const subY = 150 + (lines - 1) * 88 + 62;
  const inner = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><style>${css}</style>${title}<text x="80" y="${subY}" class="sub">${esc(spec.subtitle)}</text><g transform="translate(80 ${subY + 50}) scale(${svgW / w})">${schemaSvg(spec).replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</g></svg>`;
  return page(1600, 900, T.paper, inner, T.glow);
}

function page(w, h, bg, body, bgCss) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}body{background:${bgCss ?? bg}}svg{display:block}</style></head><body>${body}</body></html>`;
}

export function build(spec, fonts, theme = 'light') {
  if (!THEMES[theme]) throw new Error(`unknown theme "${theme}" (light or dark)`);
  if (spec.type === 'chart') return chartHtml(spec, theme);
  if (spec.type === 'grid') return gridHtml(spec, theme);
  if (spec.type === 'schema') return schemaCoverHtml(spec, fonts, theme);
  throw new Error(`unknown figure type "${spec.type}"`);
}
