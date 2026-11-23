import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseAll, parseLine } from '../src/tools/plot/expr.ts';

const close = (a, b, m = '') => assert.ok(Math.abs(a - b) < 1e-9, `${m} ${a} vs ${b}`);

test('arithmetic, precedence and powers', () => {
  assert.equal(evaluate('2+3*4'), 14);
  assert.equal(evaluate('-2^2'), -4);
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('2^-1'), 0.5);
  assert.equal(evaluate('(1+2)(3+4)'), 21);
  assert.equal(evaluate('10/4'), 2.5);
  close(evaluate('2e3'), 2000);
  close(evaluate('2e'), 2 * Math.E);
});

test('implicit multiplication and word splitting', () => {
  assert.equal(evaluate('2x', { x: 5 }), 10);
  assert.equal(evaluate('xy', { x: 2, y: 3 }), 6);
  assert.equal(evaluate('xy^2', { x: 2, y: 3 }), 18);
  assert.equal(evaluate('3(x+1)', { x: 1 }), 6);
  close(evaluate('2pi'), 2 * Math.PI);
  close(evaluate('2π'), 2 * Math.PI);
  close(evaluate('xsin(x)', { x: Math.PI / 2 }), Math.PI / 2);
  close(evaluate('a sin(b x)', { a: 2, b: 1, x: Math.PI / 2 }), 2);
});

test('functions and real odd roots', () => {
  assert.equal(evaluate('sqrt(16)'), 4);
  assert.equal(evaluate('abs(-3)'), 3);
  assert.equal(evaluate('max(1, 5, 3)'), 5);
  assert.equal(evaluate('mod(-1, 5)'), 4);
  close(evaluate('(-8)^(1/3)'), -2);
  assert.ok(Number.isNaN(evaluate('(-8)^(1/2)')));
  close(evaluate('ln(e)'), 1);
  close(evaluate('log(1000)'), 3);
});

test('mistakes come back as codes, never as thrown crashes', () => {
  const codes = (src) => parseAll([src])[0].error?.code;
  assert.equal(codes('sinx'), 'func');
  assert.equal(codes('sin'), 'func');
  assert.equal(codes('1 +'), 'syntax');
  assert.equal(codes('(1+2'), 'syntax');
  assert.equal(codes('x $ 2'), 'char');
  assert.equal(codes('sqrt(1,2)'), 'args');
  assert.equal(codes('1 < 2 < 3'), 'syntax');
  assert.equal(parseAll([''])[0].item.kind, 'empty');
});

test('line kinds', () => {
  const kind = (s) => parseAll([s])[0].item?.kind;
  assert.equal(kind('y = x^2'), 'fn');
  assert.equal(kind('x^2'), 'fn');
  assert.equal(kind('x^2 + y^2 = 9'), 'implicit');
  assert.equal(kind('x = 3'), 'implicit');
  assert.equal(kind('y = x + y'), 'implicit');
  assert.equal(kind('y > x^2'), 'ineq');
  assert.equal(kind('(1, 2)'), 'point');
  assert.equal(kind('(cos(t), sin(t))'), 'param');
  assert.equal(kind('r = 1 + cos(theta)'), 'polar');
  assert.equal(kind('a = 2'), 'slider');
  assert.equal(kind('y = 2'), 'fn');
  assert.equal(kind('f(x) = x^2'), 'def');
});

test('sliders: free variables are listed, values are read', () => {
  const [a, b] = parseAll(['y = a sin(b x)', 'a = 2.5']);
  assert.deepEqual(a.item.vars.sort(), ['a', 'b']);
  assert.equal(b.item.value, 2.5);
  close(a.item.y({ x: Math.PI / 2, a: 2, b: 1 }), 2);
});

test('user functions work in any order and with several arguments', () => {
  const r = parseAll(['y = f(x) + g(x, 2)', 'f(x) = x^2', 'g(u, v) = u*v']);
  assert.equal(r[0].item.y({ x: 3 }), 9 + 6);
  assert.equal(r[1].item.kind, 'def');
  assert.equal(parseAll(['y = f(1, 2)', 'f(x) = x'])[0].error.code, 'args');
});

test('restrictions and parameter ranges', () => {
  const it = parseAll(['y = x^2 {x > 0, x < 2}'])[0].item;
  assert.equal(it.cond({ x: 1 }), 1);
  assert.equal(it.cond({ x: -1 }), 0);
  assert.equal(it.cond({ x: 3 }), 0);
  const p = parseAll(['(t, t^2) {0 <= t <= a}'])[0].item;
  assert.equal(p.kind, 'param');
  assert.equal(p.range.lo({}), 0);
  assert.equal(p.range.hi({ a: 4 }), 4);
});

test('inequality test and strictness', () => {
  const it = parseLine('y >= x', {});
  assert.equal(it.test({ x: 1, y: 1 }), 1);
  assert.equal(it.test({ x: 1, y: 0 }), 0);
  assert.equal(it.strict, false);
  assert.equal(parseLine('y < x', {}).strict, true);
});
