// Typing trainer UI: tabs, the typing stage, level map, statistics. Rules and maths are in logic.ts, drawing in charts.ts.
import {
  Engine, LEVELS, KINDS, emptyStore, isUnlocked, keyRows, levelText, makeText, record, rng, sanitize, exportJson, parseImport, merge, slowKeys, starsFor, summarize, totals, weakKeys, calendar,
  type Kind, type Level, type Run, type Store,
} from './logic';
import { download } from '../dom';
import { calChart, histChart, keyboard, runChart, trendChart, type Labels } from './charts';
import { ROWS, type L } from './words';

const root = document.querySelector<HTMLElement>('[data-typing]');
if (root) init(root);

function init(root: HTMLElement) {
  const s = JSON.parse(root.dataset.s!) as Labels;
  const pageLang = root.dataset.lang as L;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const $$ = <T extends HTMLElement>(sel: string) => [...root.querySelectorAll<T>(sel)];
  const fill = (tpl: string, v: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

  // ---- storage (localStorage only; every access may throw) ----
  const SKEY = 'galuin-typing', PKEY = 'galuin-typing-prefs';
  let storable = true;
  const read = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { storable = false; return null; } };
  const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { storable = false; $('[data-nostore]').hidden = false; } };
  const store: Store = sanitize(read(SKEY));
  const saved = (read(PKEY) ?? {}) as Partial<{ lang: L; limit: string; kind: Kind; keys: boolean }>;
  const prefs = {
    lang: (['en', 'de', 'ru'].includes(saved.lang as string) ? saved.lang : pageLang) as L,
    limit: saved.limit ?? '30s',
    kind: (KINDS.includes(saved.kind as Kind) ? saved.kind : 'words') as Kind,
    keys: saved.keys !== false,
  };
  if (!storable) $('[data-nostore]').hidden = false;
  const savePrefs = () => write(PKEY, prefs);

  // ---- tabs ----
  type View = 'quick' | 'levels' | 'stats' | 'play';
  let view: View = 'quick', origin: View = 'quick';
  function show(v: View) {
    if (v !== 'play') { stop(); origin = v; }
    view = v;
    for (const el of $$('[data-view]')) el.hidden = el.dataset.view !== v;
    for (const b of $$<HTMLButtonElement>('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === v || (v === 'play' && b.dataset.tab === origin)));
    if (v === 'levels') renderLevels();
    if (v === 'stats') renderStats();
  }
  for (const b of $$<HTMLButtonElement>('[data-tab]')) b.addEventListener('click', () => show(b.dataset.tab as View));

  // ---- language and quick-start options ----
  const langSel = $<HTMLSelectElement>('[name="lang"]');
  const kindSel = $<HTMLSelectElement>('[name="kind"]');
  const limitSel = $<HTMLSelectElement>('[name="limit"]');
  langSel.value = prefs.lang; kindSel.value = prefs.kind; limitSel.value = prefs.limit;
  if (limitSel.value !== prefs.limit) limitSel.value = '30s';
  langSel.addEventListener('change', () => { prefs.lang = langSel.value as L; savePrefs(); if (view === 'stats') renderStats(); });
  kindSel.addEventListener('change', () => { prefs.kind = kindSel.value as Kind; savePrefs(); });
  limitSel.addEventListener('change', () => { prefs.limit = limitSel.value; savePrefs(); });
  $('[data-start]').addEventListener('click', () => startQuick());

  const limitOf = (v: string) => (v.endsWith('s') ? { secs: parseInt(v), words: parseInt(v) * 4 } : { secs: 0, words: parseInt(v) });
  const kindName = (k: Kind) => s[`kind_${k}`];

  // ---- levels ----
  const LOCK = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  function renderLevels() {
    $<HTMLInputElement>('[name="all"]').checked = store.all;
    const total = Object.values(store.levels).reduce((a, b) => a + b.stars, 0);
    $('[data-star-total]').textContent = `★ ${total} / 150`;
    for (const tier of [1, 2, 3, 4, 5]) {
      const grid = $(`[data-tier="${tier}"]`);
      grid.replaceChildren(...LEVELS.filter((l) => l.tier === tier).map((lv) => {
        const best = store.levels[lv.n];
        const open = isUnlocked(lv.n, store.levels, store.all);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `lv${best?.stars ? ' got' : ''}`;
        b.disabled = !open;
        b.dataset.tip = open ? `${fill(s.levelN, { n: lv.n })} · ${s[`tag_${lv.tag}`]}\n${goal(lv)}${best ? `\n${fill(s.bestOf, { wpm: best.wpm, acc: best.acc })}` : ''}` : fill(s.locked, { n: lv.n - 1 });
        b.innerHTML = `<b>${lv.n}</b><span class="st" aria-label="${best?.stars ?? 0} / 3">${stars(best?.stars ?? 0)}</span><small>${open ? (best ? `${best.wpm} ${s.wpm}` : `${lv.wpm} ${s.wpm}`) : LOCK}</small>`;
        b.addEventListener('click', () => startLevel(lv));
        return b;
      }));
    }
  }
  const goal = (lv: Level) => fill(s.goal, { wpm: lv.wpm, acc: lv.acc });
  $<HTMLInputElement>('[name="all"]').addEventListener('change', (e) => { store.all = (e.target as HTMLInputElement).checked; write(SKEY, store); renderLevels(); });

  // ---- stage ----
  const box = $('[data-text]');
  const inner = $('[data-text-inner]');
  const input = $<HTMLInputElement>('.tt-in');
  const hint = $('[data-hint]');
  const kbEl = $('[data-kb]');
  const result = $('[data-result]');
  const live = { time: $('[data-live="time"]'), wpm: $('[data-live="wpm"]'), acc: $('[data-live="acc"]') };
  let engine: Engine | null = null;
  let spans: HTMLElement[] = [];
  let cfg: { mode: 'quick' | 'level'; lv?: Level; kind: Kind; lang: L; words: number; secs: number } | null = null;
  let t0 = 0, timer = 0, ended = false;

  function stop() { clearInterval(timer); timer = 0; t0 = 0; }

  function startQuick() {
    const { secs, words } = limitOf(prefs.limit);
    begin({ mode: 'quick', kind: prefs.kind, lang: prefs.lang, words, secs });
  }
  function startLevel(lv: Level) { begin({ mode: 'level', lv, kind: lv.kind, lang: prefs.lang, words: lv.words, secs: lv.secs }); }

  function begin(c: NonNullable<typeof cfg>) {
    stop();
    cfg = c;
    ended = false;
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    const text = c.lv ? levelText(c.lv, c.lang, seed) : makeText(c.kind, c.lang, c.words, rng(seed), 0);
    engine = new Engine(text);
    inner.replaceChildren(...[...text].map((ch) => Object.assign(document.createElement('span'), { className: 'c', textContent: ch })));
    spans = [...inner.children] as HTMLElement[];
    inner.style.transform = '';
    result.hidden = true;
    box.hidden = false;
    $('[data-live-row]').hidden = false;
    $('[data-title]').textContent = c.lv ? `${fill(s.levelN, { n: c.lv.n })} · ${s[`tag_${c.lv.tag}`]}` : `${s.tabQuick} · ${c.secs ? fill(s.secondsN, { n: c.secs }) : fill(s.wordsN, { n: c.words })} · ${kindName(c.kind)}`;
    $('[data-goal]').textContent = c.lv ? goal(c.lv) : '';
    live.time.textContent = c.secs ? String(c.secs) : '0';
    live.wpm.textContent = '0'; live.acc.textContent = '100%';
    buildKeyboard(c.lang);
    $<HTMLInputElement>('[name="keys"]').checked = prefs.keys;
    kbEl.hidden = !prefs.keys;
    $('[data-keys-label]').hidden = false;
    mark();
    show('play');
    focusInput();
    hint.hidden = document.activeElement === input;
  }

  const focusInput = () => input.focus({ preventScroll: true });
  box.addEventListener('pointerdown', () => setTimeout(focusInput));
  input.addEventListener('focus', () => { hint.hidden = true; });
  input.addEventListener('blur', () => { if (view === 'play' && !ended) hint.hidden = false; });
  hint.addEventListener('click', focusInput);

  function mark() {
    if (!engine) return;
    const i = engine.typed.length;
    spans.forEach((sp, k) => { sp.classList.toggle('cur', k === i); });
    const cur = spans[Math.min(i, spans.length - 1)];
    const lh = parseFloat(getComputedStyle(inner).lineHeight) || 40;
    inner.style.transform = `translateY(${-Math.max(0, cur.offsetTop - lh)}px)`;
    const next = engine.text[i];
    for (const k of kbEl.querySelectorAll('.on')) k.classList.remove('on');
    if (next) kbEl.querySelector(`[data-k="${CSS.escape(next === ' ' ? 'space' : next.toLowerCase())}"]`)?.classList.add('on');
  }

  function press(ch: string) {
    if (!engine || ended) return;
    if (!t0) { t0 = performance.now(); timer = window.setInterval(tick, 100); }
    const i = engine.typed.length;
    if (i >= spans.length) return;
    engine.type(ch, performance.now() - t0);
    spans[i].classList.add(engine.ev[engine.ev.length - 1].ok ? 'ok' : 'bad');
    mark();
    if (engine.done) finish(performance.now() - t0);
  }
  function back() {
    if (!engine || ended || !engine.typed.length) return;
    engine.back();
    spans[engine.typed.length].classList.remove('ok', 'bad');
    mark();
  }

  input.addEventListener('beforeinput', (e) => {
    e.preventDefault();
    if (e.inputType === 'insertText' && e.data) for (const ch of e.data) press(ch);
    else if (e.inputType === 'deleteContentBackward') back();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); if (cfg) begin(cfg); }
    else if (e.key === 'Enter' && ended) { e.preventDefault(); $<HTMLButtonElement>('[data-next]:not([hidden])')?.click() ?? $('[data-retry]').click(); }
  });

  function tick() {
    if (!engine || !t0) return;
    const ms = performance.now() - t0;
    if (cfg!.secs && ms >= cfg!.secs * 1000) return finish(cfg!.secs * 1000);
    live.time.textContent = cfg!.secs ? String(Math.max(0, Math.ceil(cfg!.secs - ms / 1000))) : String(Math.floor(ms / 1000));
    const sum = summarize(engine, ms);
    live.wpm.textContent = String(Math.round(sum.wpm));
    live.acc.textContent = `${Math.round(sum.acc)}%`;
  }

  function finish(ms: number) {
    if (!engine || !cfg || ended) return;
    ended = true;
    stop();
    const c = cfg;
    const sum = summarize(engine, Math.max(ms, 1));
    const before = store.runs.reduce((m, r) => Math.max(m, r.wpm), 0);
    const real = sum.chars >= 10;
    if (real) {
      const run: Run = {
        t: Date.now(), lang: c.lang, mode: c.mode, level: c.lv?.n, kind: c.kind, secs: c.secs, wpm: sum.wpm, raw: sum.raw, acc: sum.acc,
        chars: sum.chars, errors: sum.errors, ms: Math.round(sum.ms), net: sum.net, rawSeries: sum.rawSeries, errSeries: sum.errSeries,
      };
      record(store, run, sum.keys, c.lv);
      write(SKEY, store);
    }
    box.hidden = true; hint.hidden = true; kbEl.hidden = true;
    $('[data-keys-label]').hidden = true;
    $('[data-live-row]').hidden = true;
    result.hidden = false;
    $('[data-r="wpm"]').textContent = String(Math.round(sum.wpm));
    $('[data-r="raw"]').textContent = String(Math.round(sum.raw));
    $('[data-r="acc"]').textContent = `${sum.acc}%`;
    $('[data-r="err"]').textContent = String(sum.errors);
    $('[data-r="time"]').textContent = `${Math.round(sum.ms / 100) / 10} s`;
    const verdict = $('[data-verdict]');
    const nextBtn = $<HTMLButtonElement>('[data-next]');
    nextBtn.hidden = true;
    if (c.lv) {
      const got = starsFor(c.lv, sum.wpm, sum.acc);
      verdict.className = `note ${got ? 'good' : 'bad'}`;
      verdict.textContent = got ? `${stars(got)} ${s.passed}` : fill(s.failed, { wpm: c.lv.wpm, acc: c.lv.acc });
      verdict.hidden = false;
      nextBtn.hidden = !(got && c.lv.n < 50);
    } else if (!real) { verdict.className = 'note'; verdict.textContent = s.tooShort; verdict.hidden = false; }
    else if (sum.wpm > before && before > 0) { verdict.className = 'note good'; verdict.textContent = s.newBest; verdict.hidden = false; }
    else verdict.hidden = true;
    $('[data-run-chart]').innerHTML = runChart(sum.net, sum.rawSeries, sum.errSeries, s);
    (nextBtn.hidden ? $('[data-retry]') : nextBtn).focus({ preventScroll: true });
    root.scrollIntoView({ block: 'nearest' });
  }
  $('[data-retry]').addEventListener('click', () => cfg && begin(cfg));
  $('[data-next]').addEventListener('click', () => { const n = cfg?.lv?.n; if (n && n < 50) startLevel(LEVELS[n]); });
  $('[data-back]').addEventListener('click', () => show(origin));
  $('[data-restart]').addEventListener('click', () => cfg && begin(cfg));
  $<HTMLInputElement>('[name="keys"]').addEventListener('change', (e) => { prefs.keys = (e.target as HTMLInputElement).checked; savePrefs(); kbEl.hidden = !prefs.keys || ended; });

  function buildKeyboard(lang: L) {
    const rows = ROWS[lang].map((r, i) => `<div class="kr" style="--off:${i * 0.5}">${[...r].map((c) => `<span class="key" data-k="${c}">${c.toUpperCase()}</span>`).join('')}</div>`).join('');
    kbEl.innerHTML = `${rows}<div class="kr"><span class="key space" data-k="space"></span></div>`;
  }

  // ---- statistics ----
  let metric: 'speed' | 'errors' = 'speed';
  function renderStats() {
    const runs = store.runs;
    $('[data-empty]').hidden = runs.length > 0;
    $('[data-stats]').hidden = runs.length === 0;
    $('[data-stat-lang]').textContent = ({ en: 'English', de: 'Deutsch', ru: 'Русский' })[prefs.lang];
    if (!runs.length) return;
    const t = totals(runs);
    $('[data-tiles]').innerHTML = [
      [s.runsT, t.runs], [s.bestT, `${t.best} ${s.wpm}`], [s.avgT, `${t.avg10} ${s.wpm}`], [s.accT, `${t.acc10}%`], [s.timeT, `${t.minutes} ${s.unitMin}`],
    ].map(([k, v]) => `<div class="tile"><small>${k}</small><b>${v}</b></div>`).join('');
    $('[data-trend]').innerHTML = trendChart(runs.slice(-100), s);
    $('[data-hist]').innerHTML = histChart(runs, s);
    $('[data-cal]').innerHTML = calChart(calendar(runs, 12, Date.now()), s);
    $('[data-kbmap]').innerHTML = keyboard(prefs.lang, store.keys[prefs.lang], metric, s);
    for (const b of $$<HTMLButtonElement>('[data-metric]')) b.setAttribute('aria-pressed', String(b.dataset.metric === metric));
    const rows = keyRows(store.keys[prefs.lang]);
    const list = (el: string, items: { ch: string; label: string; p: number }[]) => {
      $(el).innerHTML = items.length ? items.map((i) => `<li><kbd>${i.ch === ' ' ? '␣' : i.ch.toUpperCase()}</kbd><span class="bar"><i style="width:${Math.max(4, Math.round(i.p * 100))}%"></i></span><em>${i.label}</em></li>`).join('') : `<li class="none">${s.needMore}</li>`;
    };
    const weak = weakKeys(rows).slice(0, 8), slow = slowKeys(rows).slice(0, 8);
    $('[data-weak]').classList.add('err');
    list('[data-weak]', weak.map((r) => ({ ch: r.ch, label: `${Math.round(r.errRate * 1000) / 10}%`, p: r.errRate / (weak[0]?.errRate || 1) })));
    list('[data-slow]', slow.map((r) => ({ ch: r.ch, label: `${Math.round(12000 / r.ms)} ${s.wpm}`, p: r.ms / (slow[0]?.ms || 1) })));
    const done = Object.values(store.levels);
    $('[data-lvsum]').textContent = fill(s.lvSum, { done: done.filter((l) => l.stars > 0).length, stars: done.reduce((a, b) => a + b.stars, 0) });
  }
  for (const b of $$<HTMLButtonElement>('[data-metric]')) b.addEventListener('click', () => { metric = b.dataset.metric as typeof metric; renderStats(); });
  const wipe = $<HTMLButtonElement>('[data-wipe]');
  let armed = 0;
  wipe.addEventListener('click', () => {
    if (!armed) { wipe.textContent = s.clearSure; armed = window.setTimeout(() => { armed = 0; wipe.textContent = s.clear; }, 4000); return; }
    clearTimeout(armed); armed = 0; wipe.textContent = s.clear;
    Object.assign(store, emptyStore());
    try { localStorage.removeItem(SKEY); } catch { /* nothing stored */ }
    renderStats(); renderLevels();
  });

  // ---- backup ----
  const msg = $('[data-backup-msg]');
  const say = (text: string, good: boolean) => { msg.textContent = text; msg.className = `note ${good ? 'good' : 'bad'}`; msg.hidden = false; };
  $('[data-export]').addEventListener('click', () => {
    if (!store.runs.length && !Object.keys(store.levels).length) return say(s.exportEmpty, false);
    download(exportJson(store), `galuin-typing-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  });
  const file = $<HTMLInputElement>('[data-import-file]');
  $('[data-import]').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    const parsed = f.size < 20e6 ? parseImport(await f.text()) : null;
    if (!parsed) return say(s.importBad, false);
    const added = merge(store, parsed);
    write(SKEY, store);
    say(fill(s.imported, { n: added }), true);
    renderStats(); renderLevels();
  });

  // ---- one tooltip for every [data-tip] ----
  const tip = $('[data-tip-box]');
  root.addEventListener('pointerover', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip!;
    tip.hidden = false;
    place(e);
  });
  root.addEventListener('pointermove', (e) => { if (!tip.hidden) place(e); });
  root.addEventListener('pointerleave', () => { tip.hidden = true; });
  function place(e: PointerEvent) {
    const r = root.getBoundingClientRect();
    const x = Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 4);
    tip.style.left = `${Math.max(4, x)}px`;
    tip.style.top = `${e.clientY - r.top - tip.offsetHeight - 14 < 0 ? e.clientY - r.top + 18 : e.clientY - r.top - tip.offsetHeight - 14}px`;
  }

  show('quick');
}
