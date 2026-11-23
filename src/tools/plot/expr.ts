/** Parser and evaluator for the function grapher. Pure, no DOM. Turns lines such as `y = a sin(b x)`, `x^2 + y^2 = 9`, `y > x^2 {x > 0}`,
 *  `(cos(t), sin(t))`, `r = 1 + cos(theta)`, `a = 2` or `f(x) = x^2` into plain functions of an environment (x, y, t and the slider values). */

export type Env = Record<string, number>;
export type Fn = (env: Env) => number;
export type Node =
  | { k: 'num'; v: number }
  | { k: 'var'; n: string }
  | { k: 'neg'; a: Node }
  | { k: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { k: 'call'; f: string; args: Node[] };
export type Defs = Record<string, { params: string[]; body: Node }>;

type Tok = { t: 'num'; v: number } | { t: 'id'; s: string } | { t: 'op'; s: string };
type Err = Error & { code: string; detail: string };

const fail = (code: string, detail = ''): never => { throw Object.assign(new Error(detail ? `${code}: ${detail}` : code), { code, detail }); };

/** Real odd roots: (-8)^(1/3) is -2, like a calculator would show. */
function pow(b: number, e: number): number {
  if (b >= 0 || Number.isInteger(e)) return b ** e;
  for (let q = 3; q <= 15; q += 2) {
    const p = e * q;
    if (Math.abs(p - Math.round(p)) < 1e-9) return (Math.round(p) % 2 === 0 ? 1 : -1) * Math.abs(b) ** e;
  }
  return NaN;
}

const FN: Record<string, { f: (...a: number[]) => number; min: number; max: number }> = {
  sin: { f: Math.sin, min: 1, max: 1 }, cos: { f: Math.cos, min: 1, max: 1 }, tan: { f: Math.tan, min: 1, max: 1 },
  cot: { f: (x) => 1 / Math.tan(x), min: 1, max: 1 }, sec: { f: (x) => 1 / Math.cos(x), min: 1, max: 1 }, csc: { f: (x) => 1 / Math.sin(x), min: 1, max: 1 },
  asin: { f: Math.asin, min: 1, max: 1 }, acos: { f: Math.acos, min: 1, max: 1 }, atan: { f: Math.atan, min: 1, max: 1 },
  arcsin: { f: Math.asin, min: 1, max: 1 }, arccos: { f: Math.acos, min: 1, max: 1 }, arctan: { f: Math.atan, min: 1, max: 1 },
  sinh: { f: Math.sinh, min: 1, max: 1 }, cosh: { f: Math.cosh, min: 1, max: 1 }, tanh: { f: Math.tanh, min: 1, max: 1 },
  sqrt: { f: Math.sqrt, min: 1, max: 1 }, cbrt: { f: Math.cbrt, min: 1, max: 1 }, abs: { f: Math.abs, min: 1, max: 1 },
  ln: { f: Math.log, min: 1, max: 1 }, log: { f: Math.log10, min: 1, max: 1 }, exp: { f: Math.exp, min: 1, max: 1 },
  floor: { f: Math.floor, min: 1, max: 1 }, ceil: { f: Math.ceil, min: 1, max: 1 }, round: { f: Math.round, min: 1, max: 1 }, sign: { f: Math.sign, min: 1, max: 1 },
  min: { f: Math.min, min: 2, max: 8 }, max: { f: Math.max, min: 2, max: 8 },
  mod: { f: (a, b) => ((a % b) + b) % b, min: 2, max: 2 }, atan2: { f: Math.atan2, min: 2, max: 2 },
};
const CONST: Record<string, number> = { pi: Math.PI, tau: 2 * Math.PI, e: Math.E };
export const RESERVED = new Set(['x', 'y', 't']);

export function normalize(s: string): string {
  return s.replace(/²/g, '^2').replace(/³/g, '^3').replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/')
    .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/π/g, ' pi ').replace(/θ/g, ' theta ').replace(/√/g, ' sqrt ').replace(/\s+/g, ' ').trim();
}

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    if (src[i] === ' ') { i++; continue; }
    const num = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(rest);
    if (num) { out.push({ t: 'num', v: Number(num[0]) }); i += num[0].length; continue; }
    const id = /^[a-zA-Z]+/.exec(rest);
    if (id) { out.push({ t: 'id', s: id[0].toLowerCase() }); i += id[0].length; continue; }
    const two = rest.slice(0, 2);
    if (two === '<=' || two === '>=' || two === '==') { out.push({ t: 'op', s: two === '==' ? '=' : two }); i += 2; continue; }
    if ('<>=+-*/^(),'.includes(src[i])) { out.push({ t: 'op', s: src[i] }); i++; continue; }
    return fail('char', src[i]);
  }
  return out;
}

const show = (t: Tok): string => (t.t === 'num' ? String(t.v) : t.s);

type Part = { kind: 'var' | 'const' | 'fn' | 'user'; name: string };

/** Splits a run of letters such as `xy`, `pix` or `xsin` into variables, constants and a function name. `sinx` (a function without brackets) is an error. */
function splitWord(word: string, parenNext: boolean, defs: Defs): Part[] {
  const fnNames = [...Object.keys(FN), ...Object.keys(defs)].sort((a, b) => b.length - a.length);
  const parts: Part[] = [];
  let i = 0;
  while (i < word.length) {
    const rest = word.slice(i);
    const f = fnNames.find((n) => rest.startsWith(n) && (n.length > 1 || n in defs));
    if (f) {
      if (!(rest === f && parenNext)) return fail('func', f);
      parts.push({ kind: f in defs ? 'user' : 'fn', name: f });
      i += f.length;
      continue;
    }
    const c = ['theta', 'tau', 'pi'].find((n) => rest.startsWith(n));
    if (c) { parts.push({ kind: c === 'theta' ? 'var' : 'const', name: c === 'theta' ? 't' : c }); i += c.length; continue; }
    parts.push(rest[0] === 'e' ? { kind: 'const', name: 'e' } : { kind: 'var', name: rest[0] });
    i++;
  }
  return parts;
}

function subst(n: Node, map: Record<string, Node>): Node {
  switch (n.k) {
    case 'num': return n;
    case 'var': return map[n.n] ?? n;
    case 'neg': return { k: 'neg', a: subst(n.a, map) };
    case 'bin': return { k: 'bin', op: n.op, a: subst(n.a, map), b: subst(n.b, map) };
    default: return { k: 'call', f: n.f, args: n.args.map((a) => subst(a, map)) };
  }
}

function parseTokens(toks: Tok[], defs: Defs): Node {
  let i = 0;
  const isOp = (s: string) => toks[i]?.t === 'op' && (toks[i] as { s: string }).s === s;
  const startsPrimary = () => toks[i] !== undefined && (toks[i].t === 'num' || toks[i].t === 'id' || isOp('('));
  const expect = (s: string) => { if (!isOp(s)) fail('syntax', toks[i] ? show(toks[i]) : s); i++; };

  function add(): Node {
    let a = mul();
    while (isOp('+') || isOp('-')) { const op = (toks[i++] as { s: '+' | '-' }).s; a = { k: 'bin', op, a, b: mul() }; }
    return a;
  }
  function mul(): Node {
    let a = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) { const op = (toks[i++] as { s: '*' | '/' }).s; a = { k: 'bin', op, a, b: unary() }; }
      else if (startsPrimary()) a = { k: 'bin', op: '*', a, b: power() };
      else return a;
    }
  }
  function unary(): Node {
    if (isOp('-')) { i++; return { k: 'neg', a: unary() }; }
    if (isOp('+')) { i++; return unary(); }
    return power();
  }
  function power(): Node {
    const list = primary();
    if (isOp('^')) { i++; list[list.length - 1] = { k: 'bin', op: '^', a: list[list.length - 1], b: unary() }; }
    return list.reduce((a, b) => ({ k: 'bin', op: '*', a, b }));
  }
  /** One factor, or several for a word like `xy`; an exponent applies to the last one only. */
  function primary(): Node[] {
    const t = toks[i];
    if (!t) return fail('syntax', '');
    if (t.t === 'num') { i++; return [{ k: 'num', v: t.v }]; }
    if (isOp('(')) { i++; const n = add(); expect(')'); return [n]; }
    if (t.t !== 'id') return fail('syntax', show(t));
    i++;
    const parts = splitWord(t.s, isOp('('), defs);
    return parts.map((p): Node => {
      if (p.kind === 'const') return { k: 'num', v: CONST[p.name] };
      if (p.kind === 'var') return { k: 'var', n: p.name };
      expect('(');
      const args: Node[] = [add()];
      while (isOp(',')) { i++; args.push(add()); }
      expect(')');
      if (p.kind === 'user') {
        const d = defs[p.name];
        if (d.params.length !== args.length) return fail('args', p.name);
        return subst(d.body, Object.fromEntries(d.params.map((n, k) => [n, args[k]])));
      }
      const spec = FN[p.name];
      if (args.length < spec.min || args.length > spec.max) fail('args', p.name);
      return { k: 'call', f: p.name, args };
    });
  }

  if (!toks.length) return fail('empty');
  const n = add();
  if (i < toks.length) fail('syntax', show(toks[i]));
  return n;
}

export function compile(n: Node): Fn {
  switch (n.k) {
    case 'num': { const v = n.v; return () => v; }
    case 'var': { const name = n.n; return (e) => e[name] ?? NaN; }
    case 'neg': { const a = compile(n.a); return (e) => -a(e); }
    case 'bin': {
      const a = compile(n.a), b = compile(n.b);
      switch (n.op) {
        case '+': return (e) => a(e) + b(e);
        case '-': return (e) => a(e) - b(e);
        case '*': return (e) => a(e) * b(e);
        case '/': return (e) => a(e) / b(e);
        default: return (e) => pow(a(e), b(e));
      }
    }
    default: {
      const f = FN[n.f].f, args = n.args.map(compile);
      if (args.length === 1) { const a = args[0]; return (e) => f(a(e)); }
      return (e) => f(...args.map((g) => g(e)));
    }
  }
}

export function varsOf(n: Node, into = new Set<string>()): Set<string> {
  if (n.k === 'var') into.add(n.n);
  else if (n.k === 'neg') varsOf(n.a, into);
  else if (n.k === 'bin') { varsOf(n.a, into); varsOf(n.b, into); }
  else if (n.k === 'call') n.args.forEach((a) => varsOf(a, into));
  return into;
}

/** Evaluates one expression, for tests and small uses. */
export function evaluate(src: string, env: Env = {}): number {
  return compile(parseTokens(tokenize(normalize(src)), {}))(env);
}

const CMP = new Set(['<', '<=', '>', '>=', '=']);
const isCmp = (t: Tok) => t.t === 'op' && CMP.has(t.s);

/** Splits tokens at the given operators on bracket level zero. */
function splitTop(toks: Tok[], pred: (t: Tok) => boolean): { parts: Tok[][]; ops: string[] } {
  const parts: Tok[][] = [[]], ops: string[] = [];
  let depth = 0;
  for (const t of toks) {
    if (t.t === 'op' && t.s === '(') depth++;
    if (t.t === 'op' && t.s === ')') depth--;
    if (depth === 0 && pred(t)) { ops.push((t as { s: string }).s); parts.push([]); } else parts[parts.length - 1].push(t);
  }
  return { parts, ops };
}

export type Common = { vars: string[]; cond: Fn | null; range: { lo: Fn; hi: Fn } | null };
export type Item = Common & (
  | { kind: 'fn'; y: Fn }
  | { kind: 'implicit'; f: Fn }
  | { kind: 'ineq'; f: Fn; test: Fn; strict: boolean }
  | { kind: 'point'; px: Fn; py: Fn }
  | { kind: 'param'; px: Fn; py: Fn }
  | { kind: 'polar'; r: Fn }
  | { kind: 'slider'; name: string; value: number }
  | { kind: 'def'; name: string }
  | { kind: 'empty' }
);
export type Parsed = { item: Item } | { error: { code: string; detail: string } };

const DEF = /^\s*([a-zA-Z]+)\s*\(\s*([a-zA-Z](?:\s*,\s*[a-zA-Z])*)\s*\)\s*=(?![=])\s*(.+)$/;

/** Registers `f(x) = ...` in `defs`. Returns the name when the line is a definition. */
function tryDef(line: string, defs: Defs): string | null {
  const m = DEF.exec(normalize(line));
  if (!m || m[1] in FN || m[1] in CONST || m[1] === 'theta') return null;
  const params = m[2].split(',').map((p) => p.trim());
  const body = parseTokens(tokenize(m[3]), defs);
  defs[m[1]] = { params, body };
  return m[1];
}

function condition(text: string, defs: Defs): { cond: Fn; range: Common['range'] } {
  const tests: Fn[] = [];
  let range: Common['range'] = null;
  for (const piece of splitTop(tokenize(normalize(text)), (t) => t.t === 'op' && t.s === ',').parts) {
    const { parts, ops } = splitTop(piece, isCmp);
    if (!ops.length) fail('cond', text);
    const fs = parts.map((p) => compile(parseTokens(p, defs)));
    for (let k = 0; k < ops.length; k++) {
      const a = fs[k], b = fs[k + 1], op = ops[k];
      tests.push((e) => { const d = a(e) - b(e); return (op === '<' ? d < 0 : op === '<=' ? d <= 1e-12 : op === '>' ? d > 0 : op === '>=' ? d >= -1e-12 : Math.abs(d) < 1e-9) ? 1 : 0; });
    }
    const mid = parts[1];
    if (ops.length === 2 && ops.every((o) => o === '<' || o === '<=') && mid.length === 1 && mid[0].t === 'id' && (mid[0].s === 't' || mid[0].s === 'theta')) range = { lo: fs[0], hi: fs[2] };
  }
  return { cond: (e) => (tests.every((f) => f(e) === 1) ? 1 : 0), range };
}

/** Parses one line. `defs` must already hold the user functions (see parseAll). */
export function parseLine(raw: string, defs: Defs): Item {
  let text = raw;
  let cond: Fn | null = null;
  let range: Common['range'] = null;
  const br = /\{([^{}]*)\}\s*$/.exec(text);
  if (br) { ({ cond, range } = condition(br[1], defs)); text = text.slice(0, br.index); }
  const norm = normalize(text);
  const mk = <T extends object>(body: T, nodes: Node[]): Item => {
    const vs = new Set<string>();
    nodes.forEach((n) => varsOf(n, vs));
    return { ...body, vars: [...vs].filter((v) => !RESERVED.has(v)), cond, range } as unknown as Item;
  };
  if (!norm) return mk({ kind: 'empty' }, []);
  const dm = DEF.exec(norm);
  if (dm && !(dm[1] in FN) && !(dm[1] in CONST) && dm[1] !== 'theta') {
    if (!(dm[1] in defs)) tryDef(norm, defs);
    return mk({ kind: 'def', name: dm[1] }, []);
  }
  const toks = tokenize(norm);
  const { parts, ops } = splitTop(toks, isCmp);
  const P = (t: Tok[]) => parseTokens(t, defs);

  if (!ops.length) {
    // (a, b): a point or a parametric curve
    if (toks[0]?.t === 'op' && toks[0].s === '(' && toks[toks.length - 1].t === 'op' && (toks[toks.length - 1] as { s: string }).s === ')') {
      const inner = splitTop(toks.slice(1, -1), (t) => t.t === 'op' && t.s === ',').parts;
      if (inner.length === 2) {
        const a = P(inner[0]), b = P(inner[1]);
        const usesT = varsOf(a).has('t') || varsOf(b).has('t');
        return mk({ kind: usesT ? 'param' : 'point', px: compile(a), py: compile(b) }, [a, b]);
      }
      if (inner.length > 2) fail('syntax', ',');
    }
    const y = P(toks);
    return mk({ kind: 'fn', y: compile(y) }, [y]);
  }
  if (ops.length > 1) return fail('syntax', ops[1]);
  const [l, r] = parts;
  const op = ops[0];
  if (!l.length || !r.length) fail('syntax', op);
  const ln = P(l), rn = P(r);
  const lhs = l.length === 1 && l[0].t === 'id' ? l[0].s : '';

  if (op === '=') {
    if (lhs === 'y' && !varsOf(rn).has('y')) return mk({ kind: 'fn', y: compile(rn) }, [rn]);
    if (lhs === 'r' && varsOf(rn).has('t')) return mk({ kind: 'polar', r: compile(rn) }, [rn]);
    if (lhs && !RESERVED.has(lhs) && lhs.length === 1 && !(lhs in CONST) && varsOf(rn).size === 0) {
      const v = compile(rn)({});
      if (Number.isFinite(v)) return mk({ kind: 'slider', name: lhs, value: v }, []);
    }
    const d: Node = { k: 'bin', op: '-', a: ln, b: rn };
    return mk({ kind: 'implicit', f: compile(d) }, [d]);
  }
  const d: Node = { k: 'bin', op: '-', a: ln, b: rn };
  const f = compile(d);
  const test: Fn = (e) => { const v = f(e); return (op === '<' ? v < 0 : op === '<=' ? v <= 0 : op === '>' ? v > 0 : v >= 0) ? 1 : 0; };
  return mk({ kind: 'ineq', f, test, strict: op === '<' || op === '>' }, [d]);
}

/** Parses all lines. Functions defined anywhere can be used by every line. */
export function parseAll(lines: string[]): Parsed[] {
  const defs: Defs = {};
  for (const l of lines) { try { tryDef(l.replace(/\{[^{}]*\}\s*$/, ''), defs); } catch { /* reported by the second pass */ } }
  return lines.map((l): Parsed => {
    try { return { item: parseLine(l, defs) }; }
    catch (e) { const x = e as Err; return { error: { code: x.code ?? 'syntax', detail: x.detail ?? '' } }; }
  });
}
