import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rng, makeText, LEVELS, KINDS, starsFor, isUnlocked, Engine, summarize, emptyStore, sanitize, record,
  histogram, movingAvg, calendar, keyRows, weakKeys, slowKeys, totals, levelText, exportJson, parseImport, merge,
} from '../src/tools/typing/logic.ts';
import { ORDER, ROWS, WORDS, SENTENCES } from '../src/tools/typing/words.ts';

test('the seeded generator repeats and stays in [0, 1)', () => {
  const a = rng(7), b = rng(7);
  for (let i = 0; i < 50; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
  assert.notEqual(rng(1)(), rng(2)());
});

test('every kind makes text in every language, with about the asked number of words', () => {
  for (const lang of ['en', 'de', 'ru']) for (const kind of KINDS) {
    const t = makeText(kind, lang, 30, rng(3), 10);
    assert.ok(t.length > 20, `${lang} ${kind}`);
    assert.ok(t.split(' ').length >= 30, `${lang} ${kind} words`);
    assert.ok(!/\s{2}|^\s|\s$/.test(t), `${lang} ${kind} spacing`);
  }
});

test('letter levels only use the letters taught so far', () => {
  for (const lang of ['en', 'de', 'ru']) {
    const set = ORDER[lang].slice(0, 8);
    const t = makeText('letters', lang, 80, rng(5), 8);
    for (const c of t.replace(/ /g, '')) assert.ok(set.includes(c), `${lang}: ${c}`);
  }
});

test('word lists have no duplicates of the keyboard rows or odd characters', () => {
  for (const lang of ['en', 'de', 'ru']) {
    assert.equal(new Set(ROWS[lang].join('')).size, ROWS[lang].join('').length, `${lang} rows`);
    assert.ok(WORDS[lang].length >= 100 && SENTENCES[lang].length >= 10);
    assert.ok(WORDS[lang].every((w) => !/\s/.test(w)));
  }
});

test('50 levels: thresholds grow, accuracy stays in 88..100, five tiers of ten', () => {
  assert.equal(LEVELS.length, 50);
  assert.equal(LEVELS[0].wpm, 5);
  assert.equal(LEVELS[49].wpm, 85);
  assert.equal(LEVELS[0].acc, 88);
  for (let i = 1; i < 50; i++) {
    assert.equal(LEVELS[i].n, i + 1);
    assert.ok(LEVELS[i].wpm >= LEVELS[i - 1].wpm, `wpm ${i}`);
    assert.ok(LEVELS[i].acc >= 88 && LEVELS[i].acc <= 100);
  }
  for (const t of [1, 2, 3, 4, 5]) assert.equal(LEVELS.filter((l) => l.tier === t).length, 10);
  assert.ok(LEVELS.some((l) => l.tag === 'precision') && LEVELS.some((l) => l.tag === 'sprint') && LEVELS.some((l) => l.tag === 'endurance'));
  for (const lv of LEVELS) assert.ok(levelText(lv, 'en', lv.n).length > 30, `level ${lv.n}`);
});

test('timed levels have text for the whole countdown', () => {
  for (const lv of LEVELS.filter((l) => l.secs)) {
    const words = levelText(lv, 'en', 1).split(' ').length;
    assert.ok(words >= lv.secs * 3, `level ${lv.n}: ${words} words for ${lv.secs} s`);
  }
});

test('stars: need speed and accuracy, then 20% and 40% more speed', () => {
  const lv = LEVELS[19];
  assert.equal(starsFor(lv, lv.wpm, lv.acc), 1);
  assert.equal(starsFor(lv, lv.wpm - 1, 100), 0);
  assert.equal(starsFor(lv, lv.wpm * 3, lv.acc - 1), 0);
  assert.equal(starsFor(lv, lv.wpm * 1.2, lv.acc), 2);
  assert.equal(starsFor(lv, lv.wpm * 1.4, 100), 3);
});

test('a level unlocks after the one before has a star, or with unlock-all', () => {
  assert.ok(isUnlocked(1, {}, false));
  assert.ok(!isUnlocked(2, {}, false));
  assert.ok(!isUnlocked(2, { 1: { stars: 0, wpm: 3, acc: 90, tries: 1 } }, false));
  assert.ok(isUnlocked(2, { 1: { stars: 1, wpm: 9, acc: 95, tries: 1 } }, false));
  assert.ok(isUnlocked(50, {}, true));
});

test('engine: wrong characters advance, backspace goes back, finishing stops input', () => {
  const e = new Engine('cat');
  e.type('c', 0); e.type('x', 100); assert.equal(e.typed, 'cx');
  e.back(); e.type('a', 200); e.type('t', 300);
  assert.equal(e.typed, 'cat');
  assert.ok(e.done);
  e.type('s', 400);
  assert.equal(e.typed, 'cat');
  assert.deepEqual(e.ev.map((x) => x.ok), [true, false, true, true]);
});

test('summary: 50 characters in 12 s is 50 wpm net; mistakes lower accuracy but fixed ones do not lower net speed', () => {
  const text = 'a'.repeat(50);
  const e = new Engine(text);
  for (let i = 0; i < 50; i++) e.type('a', i * 240);
  const s = summarize(e, 12000);
  assert.equal(s.wpm, 50);
  assert.equal(s.raw, 50);
  assert.equal(s.acc, 100);
  assert.equal(s.net.length, 12);

  const f = new Engine('abcd');
  f.type('a', 0); f.type('x', 500); f.back(); f.type('b', 1500); f.type('c', 1800); f.type('d', 2000);
  const t = summarize(f, 3000);
  assert.equal(t.errors, 1);
  assert.equal(t.chars, 5);
  assert.equal(t.acc, 80);
  assert.equal(t.correct, 4);
  assert.equal(t.wpm, 16);
  assert.equal(t.raw, 20);
  assert.equal(t.errSeries.reduce((a, b) => a + b, 0), 1);
});

test('summary: per-key speed ignores pauses over two seconds and counts errors on the expected key', () => {
  const e = new Engine('ab ab');
  e.type('a', 0); e.type('z', 300); e.type(' ', 5000); e.type('a', 5200); e.type('b', 5500);
  const { keys } = summarize(e, 6000);
  assert.equal(keys.b.n, 2);
  assert.equal(keys.b.e, 1);
  assert.equal(keys.b.mt, 2);
  assert.equal(keys.b.ms, 600);
  assert.equal(keys[' '].mt, 0);
});

test('store: records runs, merges key stats, keeps the best per level, caps the history', () => {
  const st = emptyStore();
  const lv = LEVELS[0];
  const run = (wpm, acc) => ({ t: Date.now(), lang: 'en', mode: 'level', level: 1, kind: 'letters', secs: 0, wpm, raw: wpm, acc, chars: 50, errors: 1, ms: 20000, net: [wpm] });
  assert.equal(record(st, run(4, 99), { a: { n: 5, e: 1, ms: 500, mt: 4 } }, lv), 0);
  assert.equal(record(st, run(5, 95), { a: { n: 5, e: 0, ms: 400, mt: 4 } }, lv), 1);
  assert.equal(record(st, run(4, 90), {}, lv), 0);
  assert.equal(st.levels[1].stars, 1);
  assert.equal(st.levels[1].wpm, 5);
  assert.equal(st.levels[1].tries, 3);
  assert.deepEqual(st.keys.en.a, { n: 10, e: 1, ms: 900, mt: 8 });
  for (let i = 0; i < 600; i++) record(st, run(10, 99), {}, undefined);
  assert.equal(st.runs.length, 500);
  assert.ok(st.runs[0].net === undefined && st.runs.at(-1).net);
});

test('sanitize survives rubbish from storage', () => {
  for (const x of [null, 5, 'x', [], { runs: 3 }, { runs: [null, { t: 1 }], levels: 4, keys: { en: 1 } }]) {
    const s = sanitize(x);
    assert.ok(Array.isArray(s.runs) && typeof s.levels === 'object' && s.keys.de);
  }
  assert.equal(sanitize(JSON.parse(JSON.stringify(emptyStore()))).all, false);
});

test('histogram, moving average, totals', () => {
  assert.deepEqual(histogram([], 10), []);
  const h = histogram([5, 12, 19, 41], 10);
  assert.deepEqual(h.map((b) => b.n), [1, 2, 0, 0, 1]);
  assert.deepEqual(movingAvg([10, 20, 30], 2), [10, 15, 25]);
  const t = totals([{ wpm: 30, acc: 90, ms: 60000 }, { wpm: 50, acc: 100, ms: 120000 }]);
  assert.deepEqual(t, { runs: 2, best: 50, avg10: 40, acc10: 95, minutes: 3 });
});

test('calendar: twelve Monday-first weeks ending with this one, minutes per day', () => {
  const now = new Date(2026, 10, 25, 12).getTime(); // Wednesday
  const cells = calendar([{ t: new Date(2026, 10, 24, 9).getTime(), ms: 90000 }, { t: new Date(2026, 10, 24, 18).getTime(), ms: 30000 }], 12, now);
  assert.equal(cells.length, 84);
  assert.equal(cells[0].dow, 0);
  const tue = cells.find((c) => c.day === '2026-11-24');
  assert.equal(tue.min, 2);
  assert.equal(tue.dow, 1);
  assert.equal(tue.week, 11);
  assert.ok(cells.find((c) => c.day === '2026-11-26').future);
  assert.ok(!cells.find((c) => c.day === '2026-11-25').future);
});

test('weak and slow key lists need enough samples', () => {
  const rows = keyRows({ a: { n: 100, e: 10, ms: 20000, mt: 100 }, b: { n: 3, e: 3, ms: 3000, mt: 3 }, c: { n: 50, e: 0, ms: 5000, mt: 50 }, d: { n: 40, e: 8, ms: 4000, mt: 40 } });
  assert.deepEqual(weakKeys(rows).map((r) => r.ch), ['d', 'a']);
  assert.deepEqual(slowKeys(rows).map((r) => r.ch), ['a', 'c', 'd']);
});

test('backup: export then import into an empty store restores everything', () => {
  const a = emptyStore();
  const run = (t, wpm) => ({ t, lang: 'en', mode: 'level', level: 1, kind: 'letters', secs: 0, wpm, raw: wpm, acc: 95, chars: 50, errors: 2, ms: 20000 });
  record(a, run(1000, 6), { a: { n: 9, e: 1, ms: 900, mt: 8 } }, LEVELS[0]);
  record(a, run(2000, 9), { a: { n: 4, e: 0, ms: 100, mt: 3 } }, LEVELS[0]);
  a.all = true;
  const back = parseImport(exportJson(a));
  assert.ok(back);
  const b = emptyStore();
  assert.equal(merge(b, back), 2);
  assert.deepEqual(b.runs, a.runs);
  assert.deepEqual(b.levels, a.levels);
  assert.deepEqual(b.keys, a.keys);
  assert.equal(b.all, true);
});

test('backup: importing the same file twice changes nothing, importing older data keeps the better values', () => {
  const run = (t, wpm) => ({ t, lang: 'en', mode: 'quick', kind: 'words', secs: 30, wpm, raw: wpm, acc: 95, chars: 50, errors: 2, ms: 30000 });
  const a = emptyStore(), other = emptyStore();
  record(a, run(1, 40), { e: { n: 50, e: 5, ms: 5000, mt: 50 } });
  record(other, run(1, 40), { e: { n: 20, e: 9, ms: 9000, mt: 20 } });
  record(other, run(2, 55), {});
  other.levels[3] = { stars: 3, wpm: 30, acc: 99, tries: 4 };
  a.levels[3] = { stars: 1, wpm: 35, acc: 90, tries: 2 };
  const file = exportJson(other);
  assert.equal(merge(a, parseImport(file)), 1);
  assert.equal(merge(a, parseImport(file)), 0);
  assert.deepEqual(a.runs.map((r) => r.t), [1, 2]);
  assert.deepEqual(a.levels[3], { stars: 3, wpm: 35, acc: 99, tries: 4 });
  assert.equal(a.keys.en.e.n, 50);
});

test('backup: files that are not exports, or carry junk, are refused or skipped', () => {
  assert.equal(parseImport('not json'), null);
  assert.equal(parseImport('{"app":"other","v":1}'), null);
  assert.equal(parseImport('{"app":"galuin-typing","v":2}'), null);
  const bad = parseImport(JSON.stringify({ app: 'galuin-typing', v: 1, runs: [{ t: 1, wpm: 'x' }, { t: 2, wpm: 30, raw: 30, acc: 90, chars: 9, errors: 0, ms: 5, lang: 'xx', kind: 'words' }], levels: { 99: { stars: 3, wpm: 1, acc: 1, tries: 1 }, 2: { stars: 'a' } }, keys: { en: { q: { n: 'z' } } } }));
  const a = emptyStore();
  assert.equal(merge(a, bad), 0);
  assert.deepEqual(a.levels, {});
  assert.deepEqual(a.keys.en, {});
});
