import { detectDelim, parseCsv } from '../csv/logic.ts';

export type Kind = 'line' | 'bar' | 'scatter';
export interface Series { name: string; values: (number | null)[] }
export interface Data { header: boolean; xName: string; /** numeric x values, or null when the first column is text */ xNum: number[] | null; xLabels: string[]; series: Series[]; /** columns beyond the 8 that fit */ dropped: number }
export interface Options { kind: Kind; title: string; xLabel: string; yLabel: string; width: number; height: number; grid: boolean; legend: boolean; zeroBase: boolean }

/** Colour-blind-safe, readable on white. Used in this order and never cycled, so a series keeps its colour. */
export const COLORS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#7A5195', '#555555'];

/** A number from "3", "-2.5", "1e3" or a decimal comma "1,5"; null for anything else, including empty cells. */
export function parseNum(text: string): number | null {
  const t = text.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  return Number(t);
}

/** Pasted CSV or tab text to columns. The first row is the header when any of its y cells is not a number. Throws Error('empty') or Error('cols'). */
export function toData(text: string): Data {
  const rows = parseCsv(text, detectDelim(text)).filter((r) => r.some((c) => c.trim() !== ''));
  if (!rows.length) throw new Error('empty');
  const width = Math.max(...rows.map((r) => r.length));
  if (width < 2) throw new Error('cols');
  const header = rows[0].slice(1).some((c) => c.trim() !== '' && parseNum(c) === null);
  const body = header ? rows.slice(1) : rows;
  if (!body.length) throw new Error('empty');
  const name = (c: number) => (header ? (rows[0][c] ?? '').trim() : '') || `y${c}`;
  const cols = Array.from({ length: Math.min(width, 9) - 1 }, (_, i) => i + 1);
  const xCells = body.map((r) => (r[0] ?? '').trim());
  const nums = xCells.map(parseNum);
  const xNum = nums.every((n) => n !== null) ? (nums as number[]) : null;
  return {
    header,
    xName: header ? (rows[0][0] ?? '').trim() : '',
    xNum,
    xLabels: xCells,
    series: cols.map((c) => ({ name: name(c), values: body.map((r) => parseNum(r[c] ?? '')) })),
    dropped: Math.max(0, width - 9),
  };
}

/** Round axis ticks that cover [lo, hi]: steps of 1, 2, 2.5 or 5 times a power of ten. */
export function niceTicks(lo: number, hi: number, target = 6): number[] {
  if (!(hi > lo)) { const d = Math.abs(lo) || 1; lo -= d / 2; hi += d / 2; }
  const raw = (hi - lo) / Math.max(1, target);
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * p >= raw) ?? 10) * p;
  const out: number[] = [];
  const first = Math.floor(lo / step + 1e-9) * step;
  for (let v = first, i = 0; v <= hi + step * 1e-9 && i < 200; v = first + ++i * step) out.push(Number(v.toPrecision(12)));
  if (out[out.length - 1] < hi) out.push(Number((out[out.length - 1] + step).toPrecision(12)));
  return out;
}

/** Short tick text: no float noise, thousands as k only when the step allows it. */
export function fmt(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-3) return Number(v.toPrecision(3)).toExponential().replace('e+', 'e');
  return String(Number(v.toPrecision(10)));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n: number) => Number(n.toFixed(2));
const textW = (s: string, px: number) => s.length * px * 0.58;

/** The chart as a standalone SVG string with a white background. Series with no numbers are skipped. */
export function renderChart(d: Data, o: Options): string {
  const W = o.width, H = o.height;
  const series = d.series.filter((s) => s.values.some((v) => v !== null));
  const n = d.xLabels.length;
  const bar = o.kind === 'bar';
  const numericX = !bar && d.xNum !== null; // proportional x axis
  const xs = numericX ? (d.xNum as number[]) : d.xLabels.map((_, i) => i);

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  let lo = all.length ? Math.min(...all) : 0, hi = all.length ? Math.max(...all) : 1;
  if (bar || o.zeroBase) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  const yt = niceTicks(lo, hi, 6);
  const y0 = yt[0], y1 = yt[yt.length - 1];

  const f = 12;
  const title = o.title ? 28 : 0;
  const legendOn = o.legend && series.length >= 2;
  const legend = legendOn ? 26 : 0;
  const top = 14 + title + legend;
  const left = 16 + Math.max(...yt.map((t) => textW(fmt(t), f))) + (o.yLabel ? 22 : 0) + 8;
  const right = 18;
  const bottom = 30 + (o.xLabel ? 22 : 0);
  const pw = Math.max(10, W - left - right), ph = Math.max(10, H - top - bottom);

  let xMin = Math.min(...xs), xMax = Math.max(...xs);
  let xt: number[] = [];
  if (numericX) { xt = niceTicks(xMin, xMax, Math.max(2, Math.floor(pw / 90))); xMin = xt[0]; xMax = xt[xt.length - 1]; }
  const X = (i: number) => left + (numericX ? (xs[i] - xMin) / (xMax - xMin || 1) : (i + 0.5) / Math.max(1, n)) * pw;
  const Xv = (v: number) => left + ((v - xMin) / (xMax - xMin || 1)) * pw;
  const Y = (v: number) => top + (1 - (v - y0) / (y1 - y0 || 1)) * ph;

  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${f}">`);
  out.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  if (o.title) out.push(`<text x="${W / 2}" y="${14 + 18}" text-anchor="middle" font-size="16" font-weight="600" fill="#1c1c1e">${esc(o.title)}</text>`);

  if (legendOn) {
    let x = left;
    const y = 14 + title + 8;
    series.forEach((s, i) => {
      const color = COLORS[d.series.indexOf(s)];
      out.push(`<rect x="${r1(x)}" y="${y - 5}" width="10" height="10" rx="2" fill="${color}"/>`);
      out.push(`<text x="${r1(x + 15)}" y="${y + 4}" fill="#3a3a3c">${esc(s.name)}</text>`);
      x += 15 + textW(s.name, f) + 18;
      void i;
    });
  }

  // grid and y axis
  for (const t of yt) {
    const y = r1(Y(t));
    if (o.grid) out.push(`<line x1="${left}" x2="${left + pw}" y1="${y}" y2="${y}" stroke="#e3e3e8" stroke-width="1"/>`);
    out.push(`<text x="${left - 8}" y="${r1(y + 4)}" text-anchor="end" fill="#6b6b70">${fmt(t)}</text>`);
  }
  if (y0 < 0 && y1 > 0) out.push(`<line x1="${left}" x2="${left + pw}" y1="${r1(Y(0))}" y2="${r1(Y(0))}" stroke="#8e8e93" stroke-width="1"/>`);
  out.push(`<line x1="${left}" x2="${left + pw}" y1="${top + ph}" y2="${top + ph}" stroke="#8e8e93" stroke-width="1"/>`);

  // x labels
  const by = top + ph + 18;
  if (numericX) {
    for (const t of xt) out.push(`<text x="${r1(Xv(t))}" y="${by}" text-anchor="middle" fill="#6b6b70">${fmt(t)}</text>`);
  } else {
    const every = Math.max(1, Math.ceil((Math.max(...d.xLabels.map((l) => textW(l, f)), 1) + 10) / (pw / Math.max(1, n))));
    d.xLabels.forEach((l, i) => { if (i % every === 0) out.push(`<text x="${r1(X(i))}" y="${by}" text-anchor="middle" fill="#6b6b70">${esc(l)}</text>`); });
  }
  if (o.xLabel) out.push(`<text x="${left + pw / 2}" y="${H - 8}" text-anchor="middle" fill="#3a3a3c">${esc(o.xLabel)}</text>`);
  if (o.yLabel) out.push(`<text transform="translate(16 ${top + ph / 2}) rotate(-90)" text-anchor="middle" fill="#3a3a3c">${esc(o.yLabel)}</text>`);

  // marks
  const dots = n <= 40;
  series.forEach((s, k) => {
    const color = COLORS[d.series.indexOf(s)];
    if (bar) {
      const group = pw / Math.max(1, n), inner = group * 0.8, bw = inner / series.length;
      s.values.forEach((v, i) => {
        if (v === null) return;
        const x = left + i * group + (group - inner) / 2 + k * bw;
        const yv = Y(v), yz = Y(Math.max(y0, Math.min(y1, 0)));
        const h = Math.abs(yz - yv);
        out.push(`<rect x="${r1(x + 1)}" y="${r1(Math.min(yv, yz))}" width="${r1(Math.max(1, bw - 2))}" height="${r1(Math.max(h, v === 0 ? 0 : 1))}" rx="2" fill="${color}"><title>${esc(s.name)}, ${esc(d.xLabels[i])}: ${fmt(v)}</title></rect>`);
      });
    } else if (o.kind === 'line') {
      let path = '', pen = false;
      s.values.forEach((v, i) => { if (v === null) { pen = false; return; } path += `${pen ? 'L' : 'M'}${r1(X(i))} ${r1(Y(v))}`; pen = true; });
      out.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`);
      if (dots) s.values.forEach((v, i) => { if (v !== null) out.push(`<circle cx="${r1(X(i))}" cy="${r1(Y(v))}" r="3" fill="${color}" stroke="#ffffff" stroke-width="1.5"><title>${esc(s.name)}, ${esc(d.xLabels[i])}: ${fmt(v)}</title></circle>`); });
    } else {
      s.values.forEach((v, i) => { if (v !== null) out.push(`<circle cx="${r1(X(i))}" cy="${r1(Y(v))}" r="4" fill="${color}" fill-opacity=".85" stroke="#ffffff" stroke-width="1.5"><title>${esc(s.name)}, ${esc(d.xLabels[i])}: ${fmt(v)}</title></circle>`); });
    }
  });
  out.push('</svg>');
  return out.join('\n');
}
