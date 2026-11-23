// SVG / HTML strings for the typing statistics. Colours come from CSS variables (--tt-*) so light and dark follow the theme.
// Every mark that can be hovered carries data-tip; typing.ts shows one tooltip for all of them.
import { ROWS, type L } from './words.ts';
import { histogram, movingAvg, type Key, type Run } from './logic.ts';

export type Labels = Record<string, string>;
const esc = (x: string | number) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const f = (n: number) => Math.round(n * 10) / 10;
const fill = (tpl: string, v: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

/** Axis steps that give at most five labelled lines, ending at or above `max`. */
export function niceTicks(max: number): number[] {
  const step = [5, 10, 20, 25, 50, 100, 200, 500].find((s) => Math.ceil(max / s) <= 4) ?? 1000;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}

const W = 640, H = 230, M = { l: 40, r: 12, t: 12, b: 28 };
const pw = W - M.l - M.r, ph = H - M.t - M.b;
const svg = (body: string, label: string) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" class="tt-svg">${body}</svg>`;

function frame(top: number, xs: { x: number; label: string }[], yLabel: string) {
  const t = niceTicks(top);
  const max = t[t.length - 1];
  const y = (v: number) => M.t + ph - (v / max) * ph;
  const grid = t.map((v) => `<line class="gl" x1="${M.l}" x2="${W - M.r}" y1="${f(y(v))}" y2="${f(y(v))}"/><text class="ax" x="${M.l - 6}" y="${f(y(v)) + 4}" text-anchor="end">${v}</text>`).join('');
  const x = xs.map((p) => `<text class="ax" x="${f(p.x)}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>`).join('');
  return { y, max, html: `${grid}${x}<text class="ax" x="${M.l}" y="${M.t - 2}" text-anchor="start" dy="-1">${esc(yLabel)}</text>` };
}

const legend = (items: [string, string, string][]) => `<ul class="tt-lg">${items.map(([cls, shape, name]) => `<li><i class="${cls} ${shape}"></i>${esc(name)}</li>`).join('')}</ul>`;

/** One run: net and raw words per minute for every second, red crosses where mistakes were made. */
export function runChart(net: number[], raw: number[], err: number[], s: Labels) {
  const n = Math.max(net.length, 1);
  const x = (i: number) => M.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const top = Math.max(10, ...net, ...raw);
  const every = Math.max(1, Math.ceil(n / 8));
  const fr = frame(top, net.map((_, i) => ({ x: x(i), label: String(i + 1) })).filter((_, i) => i % every === 0), s.wpm);
  const path = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${f(x(i))} ${f(fr.y(v))}`).join('');
  const crosses = err.map((e, i) => (e ? `<path class="xe" d="M${f(x(i)) - 4} ${H - M.b - 10}l8 8m0-8l-8 8"/>` : '')).join('');
  const hits = net.map((v, i) => {
    const w = pw / Math.max(n - 1, 1);
    const tip = `${fill(s.second, { n: i + 1 })}: ${s.net} ${v}, ${s.raw} ${raw[i]}${err[i] ? `, ${fill(s.mistakes, { n: err[i] })}` : ''}`;
    return `<g class="pt"><rect class="hit" x="${f(x(i) - w / 2)}" y="${M.t}" width="${f(w)}" height="${ph}" data-tip="${esc(tip)}"/><line class="cross" x1="${f(x(i))}" x2="${f(x(i))}" y1="${M.t}" y2="${M.t + ph}"/><circle class="dot s1" cx="${f(x(i))}" cy="${f(fr.y(v))}" r="4"/></g>`;
  }).join('');
  return `<figure class="tt-fig">${legend([['s1', 'ln', s.net], ['s2', 'ln', s.raw], ['se', 'x', s.mistakesLegend]])}${svg(`${fr.html}<path class="ln2" d="${path(raw)}"/><path class="ln1" d="${path(net)}"/>${crosses}${hits}`, s.runChart)}</figure>`;
}

/** Speed of every run in order, with the average of the last ten as a line. */
export function trendChart(runs: Run[], s: Labels) {
  const v = runs.map((r) => r.wpm);
  const n = v.length;
  const x = (i: number) => M.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const fr = frame(Math.max(10, ...v), [0, Math.floor((n - 1) / 2), n - 1].filter((i, k, a) => a.indexOf(i) === k).map((i) => ({ x: x(i), label: `#${runs.length - n + i + 1}` })), s.wpm);
  const avg = movingAvg(v, 10);
  const dots = v.map((w, i) => {
    const d = new Date(runs[i].t).toLocaleDateString();
    const tip = `${d}: ${w} ${s.wpm}, ${runs[i].acc}% ${s.acc}`;
    return `<g class="pt"><circle class="dot s2" cx="${f(x(i))}" cy="${f(fr.y(w))}" r="3"/><circle class="hit" cx="${f(x(i))}" cy="${f(fr.y(w))}" r="9" data-tip="${esc(tip)}"/></g>`;
  }).join('');
  const line = n > 1 ? `<path class="ln1" d="${avg.map((a, i) => `${i ? 'L' : 'M'}${f(x(i))} ${f(fr.y(a))}`).join('')}"/>` : '';
  return `<figure class="tt-fig">${legend([['s2', 'dot', s.eachRun], ['s1', 'ln', s.avg10]])}${svg(`${fr.html}${line}${dots}`, s.trend)}</figure>`;
}

/** How many runs landed in each 10 wpm band. */
export function histChart(runs: Run[], s: Labels) {
  const bins = histogram(runs.map((r) => r.wpm), 10);
  const top = Math.max(2, ...bins.map((b) => b.n));
  const n = bins.length;
  const slot = pw / n, bw = Math.max(4, Math.min(48, slot - 4));
  const fr = frame(top, bins.map((b, i) => ({ x: M.l + slot * (i + .5), label: String(b.lo) })), s.runs);
  const bars = bins.map((b, i) => {
    const h = (b.n / fr.max) * ph, x = M.l + slot * (i + .5) - bw / 2;
    const tip = `${b.lo}–${b.hi} ${s.wpm}: ${fill(s.runsN, { n: b.n })}`;
    const r = Math.min(4, h / 2, bw / 2);
    const d = h > 0 ? `<path class="bar" d="M${f(x)} ${f(M.t + ph)}V${f(M.t + ph - h + r)}a${r} ${r} 0 0 1 ${r} ${-r}h${f(bw - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}V${f(M.t + ph)}Z"/>` : '';
    return `<g class="pt">${d}<rect class="hit" x="${f(x - 2)}" y="${M.t}" width="${f(bw + 4)}" height="${ph}" data-tip="${esc(tip)}"/></g>`;
  }).join('');
  return `<figure class="tt-fig">${svg(`${fr.html}${bars}`, s.hist)}</figure>`;
}

/** Twelve weeks of days, Monday on top, darker = more minutes typed. */
export function calChart(cells: { day: string; week: number; dow: number; min: number; future: boolean }[], s: Labels) {
  const size = 18, gap = 4, left = 30, top = 18;
  const weeks = Math.max(...cells.map((c) => c.week)) + 1;
  const level = (m: number) => (m <= 0 ? 0 : m < 2 ? 1 : m < 5 ? 2 : m < 10 ? 3 : 4);
  const rects = cells.filter((c) => !c.future).map((c) => {
    const tip = `${c.day}: ${c.min ? fill(s.minutes, { n: f(c.min) }) : s.noTyping}`;
    return `<rect class="cell l${level(c.min)}" x="${left + c.week * (size + gap)}" y="${top + c.dow * (size + gap)}" width="${size}" height="${size}" rx="4" data-tip="${esc(tip)}"/>`;
  }).join('');
  const days = s.days.split(',').map((d, i) => (i % 2 === 0 ? `<text class="ax" x="${left - 6}" y="${top + i * (size + gap) + 13}" text-anchor="end">${esc(d)}</text>` : '')).join('');
  const months = cells.filter((c) => c.dow === 0 && (c.week === 0 || c.day.slice(8) <= '07')).map((c) => `<text class="ax" x="${left + c.week * (size + gap)}" y="11">${esc(new Date(`${c.day}T12:00`).toLocaleDateString(s.locale, { month: 'short' }))}</text>`).join('');
  const w = left + weeks * (size + gap), h = top + 7 * (size + gap);
  return `<figure class="tt-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(s.calendar)}" class="tt-svg cal">${months}${days}${rects}</svg><div class="tt-lg"><span>${esc(s.less)}</span>${[0, 1, 2, 3, 4].map((l) => `<i class="cell l${l}"></i>`).join('')}<span>${esc(s.more)}</span></div></figure>`;
}

/** Keyboard heat map for one language: speed (dark = fast) or mistakes (dark = many). */
export function keyboard(lang: L, keys: Record<string, Key>, metric: 'speed' | 'errors', s: Labels) {
  const rows = ROWS[lang];
  const stat = (c: string) => keys[c];
  const speeds = rows.join('').split('').map((c) => (stat(c)?.mt ? stat(c).ms / stat(c).mt : 0)).filter((x) => x > 0);
  const fast = Math.min(...speeds, 1e9), slow = Math.max(...speeds, 0);
  const errs = rows.join('').split('').map((c) => (stat(c)?.n ? stat(c).e / stat(c).n : 0));
  const maxErr = Math.max(0.05, ...errs);
  const html = rows.map((row, ri) => `<div class="kr" style="--off:${ri * 0.5}">${[...row].map((c) => {
    const k = stat(c);
    let p = 0, tip = `${c.toUpperCase()}: ${s.noData}`;
    if (k && k.n) {
      const avg = k.mt ? k.ms / k.mt : 0;
      const wpm = avg ? Math.round(12000 / avg) : 0;
      const rate = k.e / k.n;
      tip = `${c.toUpperCase()}: ${wpm ? `${wpm} ${s.wpm}, ` : ''}${f(rate * 100)}% ${s.mistakesWord}, ${fill(s.pressed, { n: k.n })}`;
      p = metric === 'speed' ? (avg && slow > fast ? 1 - (avg - fast) / (slow - fast) : avg ? 1 : 0) : rate / maxErr;
      p = k.n < 3 ? 0 : Math.max(.08, Math.min(1, p));
    }
    return `<span class="key ${metric}${p > .55 ? ' hi' : ''}" style="--p:${f(p)}" data-tip="${esc(tip)}">${esc(c.toUpperCase())}</span>`;
  }).join('')}</div>`).join('');
  const lg = metric === 'speed' ? [s.slowKey, s.fastKey] : [s.fewMistakes, s.manyMistakes];
  return `<div class="tt-kb">${html}<div class="tt-lg"><span>${esc(lg[0])}</span><i class="ramp ${metric}"></i><span>${esc(lg[1])}</span></div></div>`;
}
