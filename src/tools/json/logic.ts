/** A small JSON parser that keeps number and string text exactly as written, so reformatting never rounds a 20-digit id. */
export type Node = { t: 'lit'; raw: string } | { t: 'arr'; items: Node[] } | { t: 'obj'; items: { key: string; raw: string; node: Node }[] };
export interface JsonError { code: 'char' | 'eof' | 'string'; ch: string; line: number; col: number }
export type Parsed = { ok: true; node: Node } | { ok: false; err: JsonError };

class Fail extends Error { err: JsonError; constructor(err: JsonError) { super(err.code); this.err = err; } }
const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

export function parseJson(src: string, lenient: boolean): Parsed {
  let i = 0;
  const fail = (code: JsonError['code'], at = i): never => {
    const before = src.slice(0, at).split('\n');
    throw new Fail({ code, ch: code === 'eof' ? '' : src[at] ?? '', line: before.length, col: before[before.length - 1].length + 1 });
  };
  const ws = () => {
    for (;;) {
      while (i < src.length && /[ \t\r\n]/.test(src[i])) i++;
      if (!lenient || src[i] !== '/') return;
      if (src[i + 1] === '/') while (i < src.length && src[i] !== '\n') i++;
      else if (src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) fail('eof', src.length); i = e + 2; }
      else return;
    }
  };
  const str = (): string => {
    const s = i++;
    for (; i < src.length; i++) {
      if (src[i] === '\\') { i++; if (!/["\\/bfnrtu]/.test(src[i] ?? '')) fail(i >= src.length ? 'eof' : 'char'); }
      else if (src[i] === '"') return src.slice(s, ++i);
      else if (src[i] < ' ') fail('string');
    }
    return fail('eof', src.length);
  };
  const value = (): Node => {
    ws();
    if (i >= src.length) fail('eof', src.length);
    const c = src[i];
    if (c === '{') {
      i++; const items: { key: string; raw: string; node: Node }[] = [];
      ws();
      if (src[i] === '}') { i++; return { t: 'obj', items }; }
      for (;;) {
        ws();
        if (src[i] !== '"') fail(i >= src.length ? 'eof' : 'char', Math.min(i, src.length));
        const raw = str();
        ws();
        if (src[i] !== ':') fail(i >= src.length ? 'eof' : 'char', Math.min(i, src.length));
        i++;
        items.push({ key: JSON.parse(raw), raw, node: value() });
        ws();
        if (src[i] === ',') { i++; ws(); if (lenient && src[i] === '}') { i++; return { t: 'obj', items }; } continue; }
        if (src[i] === '}') { i++; return { t: 'obj', items }; }
        fail(i >= src.length ? 'eof' : 'char', Math.min(i, src.length));
      }
    }
    if (c === '[') {
      i++; const items: Node[] = [];
      ws();
      if (src[i] === ']') { i++; return { t: 'arr', items }; }
      for (;;) {
        items.push(value());
        ws();
        if (src[i] === ',') { i++; ws(); if (lenient && src[i] === ']') { i++; return { t: 'arr', items }; } continue; }
        if (src[i] === ']') { i++; return { t: 'arr', items }; }
        fail(i >= src.length ? 'eof' : 'char', Math.min(i, src.length));
      }
    }
    if (c === '"') return { t: 'lit', raw: str() };
    for (const w of ['true', 'false', 'null']) if (src.startsWith(w, i)) { i += w.length; return { t: 'lit', raw: w }; }
    NUM.lastIndex = i;
    const m = NUM.exec(src);
    if (!m) return fail('char');
    i += m[0].length;
    if (/[\d.]/.test(src[i] ?? '')) fail('char'); // 01, 1.2.3
    return { t: 'lit', raw: m[0] };
  };
  try {
    const node = value();
    ws();
    if (i < src.length) fail('char');
    return { ok: true, node };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, err: e.err };
    throw e;
  }
}

export function printJson(n: Node, o: { indent: number | 'tab'; sort: boolean }): string {
  const unit = o.indent === 'tab' ? '\t' : ' '.repeat(o.indent);
  const nl = (d: number) => (unit ? '\n' + unit.repeat(d) : '');
  const sep = unit ? ': ' : ':';
  const go = (x: Node, d: number): string => {
    if (x.t === 'lit') return x.raw;
    if (x.t === 'arr') return x.items.length ? `[${nl(d + 1)}${x.items.map((v) => go(v, d + 1)).join(`,${nl(d + 1)}`)}${nl(d)}]` : '[]';
    const items = o.sort ? [...x.items].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)) : x.items;
    return items.length ? `{${nl(d + 1)}${items.map((e) => `${e.raw}${sep}${go(e.node, d + 1)}`).join(`,${nl(d + 1)}`)}${nl(d)}}` : '{}';
  };
  return go(n, 0);
}
