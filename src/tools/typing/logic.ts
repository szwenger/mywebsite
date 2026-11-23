// Typing trainer: everything that is not DOM. Text generation, the 50 levels, the typing engine, scoring and the stored statistics.
import { ORDER, WORDS, SENTENCES, CODE, type L } from './words.ts';

export type Kind = 'letters' | 'words' | 'long' | 'caps' | 'punct' | 'numbers' | 'sentences' | 'code';
export const KINDS: Kind[] = ['letters', 'words', 'long', 'caps', 'punct', 'numbers', 'sentences', 'code'];

/** Small seeded generator (mulberry32), so a text can be reproduced in tests. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function pseudo(r: () => number, set: string) {
  const len = 2 + Math.floor(r() * 4);
  let w = '';
  for (let i = 0; i < len; i++) {
    let c = pick(r, [...set]);
    if (w.length >= 2 && w.endsWith(c + c)) c = pick(r, [...set]);
    w += c;
  }
  return w;
}

function number(r: () => number) {
  const d = (n: number) => Array.from({ length: n }, () => Math.floor(r() * 10)).join('');
  const two = (max: number) => String(Math.floor(r() * max)).padStart(2, '0');
  switch (Math.floor(r() * 6)) {
    case 0: return d(2 + Math.floor(r() * 5));
    case 1: return `${Math.floor(r() * 900) + 10}.${two(100)}`;
    case 2: return `20${two(40)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;
    case 3: return `${two(24)}:${two(60)}`;
    case 4: return `${d(1)}${d(2)}/${d(3)}`;
    default: return `${Math.floor(r() * 90) + 10}%`;
  }
}

const MARKS = [',', '.', ';', ':', '!', '?', '-'];
function marked(r: () => number, w: string) {
  const x = r();
  if (x < .18) return `"${w}"`;
  if (x < .28) return `(${w})`;
  if (x < .6) return cap(w) + pick(r, MARKS);
  if (x < .75) return cap(w);
  return w + pick(r, [',', '.']);
}

/** Text of about `words` words. `letters` limits kind 'letters' to the first n letters of the teaching order. */
export function makeText(kind: Kind, lang: L, words: number, r: () => number, letters = 0): string {
  const pool = WORDS[lang];
  const out: string[] = [];
  const need = (n: number) => out.length < n;
  if (kind === 'letters') {
    const set = ORDER[lang].slice(0, letters || ORDER[lang].length);
    const real = pool.filter((w) => w.length >= 2 && [...w].every((c) => set.includes(c)));
    while (need(words)) out.push(real.length > 8 && r() < .5 ? pick(r, real) : pseudo(r, set));
  } else if (kind === 'sentences') {
    let n = 0;
    while (n < words) { const s = pick(r, SENTENCES[lang]); out.push(s); n += s.split(' ').length; }
  } else if (kind === 'code') {
    let n = 0;
    while (n < words) { const s = pick(r, CODE); out.push(s); n += s.split(' ').length; }
  } else {
    const long = pool.filter((w) => w.length >= 7);
    while (need(words)) {
      if (kind === 'numbers') out.push(r() < .3 ? pick(r, pool) : number(r));
      else if (kind === 'long') out.push(pick(r, long.length > 20 ? long : pool.filter((w) => w.length >= 6)));
      else if (kind === 'caps') out.push(r() < .4 ? cap(pick(r, pool)) : pick(r, pool));
      else if (kind === 'punct') out.push(marked(r, pick(r, pool)));
      else out.push(pick(r, pool));
    }
  }
  return out.join(' ');
}

// ---- levels ----

export interface Level {
  n: number;
  tier: 1 | 2 | 3 | 4 | 5;
  kind: Kind;
  /** how many letters of the teaching order are in play (kind 'letters'), 0 = all */
  letters: number;
  words: number;
  /** 0 = type the whole text, otherwise a countdown in seconds */
  secs: number;
  wpm: number;
  acc: number;
  /** what makes the level different, for the label */
  tag: 'learn' | 'words' | 'symbols' | 'text' | 'precision' | 'sprint' | 'endurance';
}

const LETTER_STEPS = [6, 8, 10, 12, 14, 16, 18, 20, 23, 0];

export function buildLevels(): Level[] {
  const out: Level[] = [];
  for (let n = 1; n <= 50; n++) {
    const tier = (Math.ceil(n / 10)) as Level['tier'];
    const i = (n - 1) % 10;
    const wpm = Math.round(5 + 80 * Math.pow((n - 1) / 49, 1.5));
    let acc = Math.round(88 + 10 * ((n - 1) / 49));
    let lv: Omit<Level, 'n' | 'tier' | 'wpm' | 'acc'>;
    if (tier === 1) lv = { kind: 'letters', letters: LETTER_STEPS[i], words: 14 + i * 2, secs: 0, tag: 'learn' };
    else if (tier === 2) lv = i < 5 ? { kind: 'words', letters: 0, words: 20 + i * 5, secs: 0, tag: 'words' } : { kind: 'long', letters: 0, words: 20 + (i - 5) * 5, secs: 0, tag: 'words' };
    else if (tier === 3) lv = i < 5 ? { kind: i < 2 ? 'caps' : 'punct', letters: 0, words: 25 + i * 5, secs: 0, tag: 'symbols' } : { kind: 'numbers', letters: 0, words: 25 + (i - 5) * 5, secs: 0, tag: 'symbols' };
    else if (tier === 4) lv = i < 5 ? { kind: 'sentences', letters: 0, words: 40 + i * 10, secs: 0, tag: 'text' } : { kind: 'code', letters: 0, words: 30 + (i - 5) * 10, secs: 0, tag: 'text' };
    else if (i < 3) { lv = { kind: 'punct', letters: 0, words: 40 + i * 10, secs: 0, tag: 'precision' }; acc = Math.min(100, acc + 2); }
    else if (i < 6) lv = { kind: 'words', letters: 0, words: 150, secs: 15 + (i - 3) * 5, tag: 'sprint' };
    else lv = { kind: i % 2 ? 'sentences' : 'words', letters: 0, words: (60 + (i - 6) * 30) * 4, secs: 60 + (i - 6) * 30, tag: 'endurance' };
    out.push({ n, tier, wpm, acc, ...lv });
  }
  return out;
}
export const LEVELS = buildLevels();

/** 0 to 3 stars: 1 reaches the goal (speed and accuracy), 2 and 3 need 20% and 40% more speed at the same accuracy. */
export function starsFor(lv: Level, wpm: number, acc: number): 0 | 1 | 2 | 3 {
  if (acc < lv.acc || wpm < lv.wpm) return 0;
  return wpm >= lv.wpm * 1.4 ? 3 : wpm >= lv.wpm * 1.2 ? 2 : 1;
}

export interface LevelBest { stars: number; wpm: number; acc: number; tries: number }
export const isUnlocked = (n: number, levels: Record<number, LevelBest>, all: boolean) => all || n === 1 || (levels[n - 1]?.stars ?? 0) >= 1;

/** The text of a level, long enough for its countdown. */
export function levelText(lv: Level, lang: L, seed: number) {
  return makeText(lv.kind, lang, lv.words, rng(seed), lv.letters);
}

// ---- engine ----

export interface Ev { t: number; exp: string; ok: boolean }

/** Typed text against a target. Wrong characters advance the cursor too, backspace goes back. */
export class Engine {
  text: string;
  typed = '';
  ev: Ev[] = [];
  constructor(text: string) { this.text = text; }
  get done() { return this.typed.length >= this.text.length; }
  type(c: string, t: number) {
    if (this.done) return;
    const exp = this.text[this.typed.length];
    this.ev.push({ t, exp, ok: c === exp });
    this.typed += c;
  }
  back() { this.typed = this.typed.slice(0, -1); }
}

export interface Key { n: number; e: number; ms: number; mt: number }
export interface Summary {
  wpm: number; raw: number; acc: number; chars: number; correct: number; errors: number; ms: number;
  /** per second, trailing 3 s average (words per minute) */
  net: number[]; rawSeries: number[]; errSeries: number[];
  keys: Record<string, Key>;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

export function summarize(e: Engine, ms: number): Summary {
  const mins = Math.max(ms, 1) / 60000;
  const total = e.ev.length;
  const okKs = e.ev.filter((x) => x.ok).length;
  let correct = 0;
  for (let i = 0; i < e.typed.length; i++) if (e.typed[i] === e.text[i]) correct++;
  const secs = Math.max(1, Math.ceil(ms / 1000));
  const okS = new Array(secs).fill(0), allS = new Array(secs).fill(0), errS = new Array(secs).fill(0);
  const keys: Record<string, Key> = {};
  let prev = -1;
  for (const x of e.ev) {
    const s = Math.min(secs - 1, Math.floor(x.t / 1000));
    allS[s]++;
    if (x.ok) okS[s]++; else errS[s]++;
    const k = (keys[x.exp.toLowerCase()] ??= { n: 0, e: 0, ms: 0, mt: 0 });
    k.n++;
    if (!x.ok) k.e++;
    if (prev >= 0 && x.t - prev < 2000) { k.ms += x.t - prev; k.mt++; }
    prev = x.t;
  }
  const trail = (a: number[]) => a.map((_, i) => { const w = a.slice(Math.max(0, i - 2), i + 1); return r1((w.reduce((p, c) => p + c, 0) / w.length) * 12); });
  return {
    wpm: r1(correct / 5 / mins), raw: r1(total / 5 / mins), acc: total ? r1((okKs / total) * 100) : 100,
    chars: total, correct, errors: total - okKs, ms,
    net: trail(okS), rawSeries: trail(allS), errSeries: errS, keys,
  };
}

// ---- stored statistics ----

export interface Run {
  t: number; lang: L; mode: 'quick' | 'level'; level?: number; kind: Kind;
  secs: number; wpm: number; raw: number; acc: number; chars: number; errors: number; ms: number;
  net?: number[]; rawSeries?: number[]; errSeries?: number[];
}
export interface Store { v: 1; runs: Run[]; levels: Record<number, LevelBest>; keys: Record<L, Record<string, Key>>; all: boolean }

export const emptyStore = (): Store => ({ v: 1, runs: [], levels: {}, keys: { en: {}, de: {}, ru: {} }, all: false });
const MAX_RUNS = 500, KEEP_SERIES = 30;

export function sanitize(x: unknown): Store {
  const s = emptyStore();
  if (!x || typeof x !== 'object') return s;
  const o = x as Partial<Store>;
  if (Array.isArray(o.runs)) s.runs = o.runs.filter((r) => r && typeof r.t === 'number' && typeof r.wpm === 'number');
  if (o.levels && typeof o.levels === 'object') s.levels = o.levels;
  if (o.keys && typeof o.keys === 'object') for (const l of ['en', 'de', 'ru'] as L[]) if (o.keys[l]) s.keys[l] = o.keys[l];
  s.all = o.all === true;
  return s;
}

function trim(st: Store) {
  if (st.runs.length > MAX_RUNS) st.runs.splice(0, st.runs.length - MAX_RUNS);
  for (let i = 0; i < st.runs.length - KEEP_SERIES; i++) { const r = st.runs[i]; delete r.net; delete r.rawSeries; delete r.errSeries; }
}

/** Adds a finished run to the store: history (capped), key statistics and, for a level, its best. Returns the stars earned. */
export function record(st: Store, run: Run, keys: Record<string, Key>, lv?: Level): number {
  st.runs.push(run);
  trim(st);
  const into = st.keys[run.lang];
  for (const [c, k] of Object.entries(keys)) {
    const a = (into[c] ??= { n: 0, e: 0, ms: 0, mt: 0 });
    a.n += k.n; a.e += k.e; a.ms += k.ms; a.mt += k.mt;
  }
  if (!lv) return 0;
  const stars = starsFor(lv, run.wpm, run.acc);
  const b = (st.levels[lv.n] ??= { stars: 0, wpm: 0, acc: 0, tries: 0 });
  b.tries++;
  b.stars = Math.max(b.stars, stars);
  b.wpm = Math.max(b.wpm, run.wpm);
  b.acc = Math.max(b.acc, run.acc);
  return stars;
}

// ---- derived statistics for the charts ----

export function histogram(values: number[], size = 10) {
  if (!values.length) return [];
  const hi = Math.floor(Math.max(...values) / size);
  const bins = Array.from({ length: hi + 1 }, (_, i) => ({ lo: i * size, hi: (i + 1) * size, n: 0 }));
  for (const v of values) bins[Math.floor(v / size)].n++;
  return bins;
}

export function movingAvg(a: number[], k: number) {
  return a.map((_, i) => { const w = a.slice(Math.max(0, i - k + 1), i + 1); return r1(w.reduce((p, c) => p + c, 0) / w.length); });
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The last `weeks` weeks as a grid (Monday first) ending with the week of `now`; `min` is the minutes typed that day. */
export function calendar(runs: Run[], weeks: number, now: number) {
  const per: Record<string, number> = {};
  for (const r of runs) { const k = ymd(new Date(r.t)); per[k] = (per[k] ?? 0) + r.ms / 60000; }
  const today = new Date(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - (weeks - 1) * 7);
  const cells: { day: string; week: number; dow: number; min: number; future: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ day: ymd(d), week: Math.floor(i / 7), dow: i % 7, min: per[ymd(d)] ?? 0, future: d.getTime() > now });
  }
  return cells;
}

export interface KeyRow { ch: string; n: number; errRate: number; ms: number }
export function keyRows(keys: Record<string, Key>): KeyRow[] {
  return Object.entries(keys).map(([ch, k]) => ({ ch, n: k.n, errRate: k.n ? k.e / k.n : 0, ms: k.mt ? k.ms / k.mt : 0 }));
}
/** Keys that cost you the most: highest error rate, with enough samples to mean something. */
export const weakKeys = (rows: KeyRow[], min = 8) => rows.filter((r) => r.n >= min && r.errRate > 0).sort((a, b) => b.errRate - a.errRate);
export const slowKeys = (rows: KeyRow[], min = 8) => rows.filter((r) => r.n >= min && r.ms > 0).sort((a, b) => b.ms - a.ms);

export function totals(runs: Run[]) {
  const last = runs.slice(-10);
  return {
    runs: runs.length,
    best: runs.reduce((m, r) => Math.max(m, r.wpm), 0),
    avg10: last.length ? r1(last.reduce((p, r) => p + r.wpm, 0) / last.length) : 0,
    acc10: last.length ? r1(last.reduce((p, r) => p + r.acc, 0) / last.length) : 0,
    minutes: Math.round(runs.reduce((p, r) => p + r.ms, 0) / 60000),
  };
}

// ---- backup file ----

export function exportJson(st: Store, now = Date.now()): string {
  return JSON.stringify({ app: 'galuin-typing', exported: new Date(now).toISOString(), ...st });
}

/** The store inside an export file, or null when the text is not one. */
export function parseImport(text: string): Store | null {
  try {
    const o = JSON.parse(text);
    return o && o.app === 'galuin-typing' && o.v === 1 ? sanitize(o) : null;
  } catch { return null; }
}

const num = (...v: unknown[]) => v.every((x) => typeof x === 'number' && Number.isFinite(x));

/** Folds an imported store into `a`. Importing the same file twice changes nothing: runs are matched by time, levels keep the best, keys keep the larger sample. */
export function merge(a: Store, b: Store): number {
  const seen = new Set(a.runs.map((r) => `${r.t}:${r.wpm}`));
  let added = 0;
  for (const r of b.runs) {
    if (!num(r.t, r.wpm, r.raw, r.acc, r.chars, r.errors, r.ms) || !['en', 'de', 'ru'].includes(r.lang) || !KINDS.includes(r.kind)) continue;
    if (seen.has(`${r.t}:${r.wpm}`)) continue;
    seen.add(`${r.t}:${r.wpm}`);
    a.runs.push(r);
    added++;
  }
  a.runs.sort((x, y) => x.t - y.t);
  trim(a);
  for (const [n, l] of Object.entries(b.levels)) {
    if (!(+n >= 1 && +n <= 50) || !l || !num(l.stars, l.wpm, l.acc, l.tries)) continue;
    const m = (a.levels[+n] ??= { stars: 0, wpm: 0, acc: 0, tries: 0 });
    m.stars = Math.min(3, Math.max(m.stars, l.stars)); m.wpm = Math.max(m.wpm, l.wpm); m.acc = Math.max(m.acc, l.acc); m.tries = Math.max(m.tries, l.tries);
  }
  for (const lang of ['en', 'de', 'ru'] as L[]) {
    for (const [c, k] of Object.entries(b.keys[lang])) {
      if (!k || !num(k.n, k.e, k.ms, k.mt)) continue;
      if (!a.keys[lang][c] || a.keys[lang][c].n < k.n) a.keys[lang][c] = { n: k.n, e: k.e, ms: k.ms, mt: k.mt };
    }
  }
  a.all = a.all || b.all;
  return added;
}
