import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJson, printJson } from '../src/tools/json/logic.ts';

const fmt = (src, o = {}, lenient = false) => { const r = parseJson(src, lenient); assert.ok(r.ok, JSON.stringify(r)); return printJson(r.node, { indent: 2, sort: false, ...o }); };

test('formats with two spaces, four spaces or tabs, and keeps empty containers compact', () => {
  assert.equal(fmt('{"a":[1,2],"b":{}, "c":[]}'), '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {},\n  "c": []\n}');
  assert.equal(fmt('[1]', { indent: 4 }), '[\n    1\n]');
  assert.equal(fmt('{"a":1}', { indent: 'tab' }), '{\n\t"a": 1\n}');
});

test('minify removes all whitespace', () => {
  assert.equal(fmt('{ "a" : [ 1 , 2 ] ,\n "b" : "x y" }', { indent: 0 }), '{"a":[1,2],"b":"x y"}');
});

test('numbers keep their exact text, including ones JSON.parse would round', () => {
  assert.equal(fmt('[12345678901234567890, 1.10, 1E+5, -0]', { indent: 0 }), '[12345678901234567890,1.10,1E+5,-0]');
});

test('sort keys orders objects at every depth and leaves array order alone', () => {
  assert.equal(fmt('{"b":1,"a":{"d":[3,1],"c":2}}', { indent: 0, sort: true }), '{"a":{"c":2,"d":[3,1]},"b":1}');
});

test('strings keep their escapes as written', () => {
  assert.equal(fmt('{"a":"x\\ny\\u00e9\\"q"}', { indent: 0 }), '{"a":"x\\ny\\u00e9\\"q"}');
});

test('strict mode rejects comments and trailing commas; lenient mode accepts them', () => {
  assert.equal(parseJson('{"a":1,}', false).ok, false);
  assert.equal(parseJson('{"a":1} // c', false).ok, false);
  assert.equal(fmt('{\n // c\n "a": 1, /* x */ "b": [1,2,],\n}', { indent: 0 }, true), '{"a":1,"b":[1,2]}');
  assert.equal(fmt('{"url":"http://x//y"}', { indent: 0 }, true), '{"url":"http://x//y"}');
});

test('errors give a code and the line and column', () => {
  assert.deepEqual(parseJson('{\n  "a": }', false), { ok: false, err: { code: 'char', ch: '}', line: 2, col: 8 } });
  assert.deepEqual(parseJson('{"a": 1', false), { ok: false, err: { code: 'eof', ch: '', line: 1, col: 8 } });
  assert.equal(parseJson('', false).err.code, 'eof');
  assert.equal(parseJson('[1] 2', false).err.code, 'char');
  assert.equal(parseJson('{"a":01}', false).ok, false);
  assert.equal(parseJson('{a:1}', false).err.code, 'char');
  assert.equal(parseJson('["a\nb"]', false).err.code, 'string');
});

test('everything JSON.parse accepts is accepted, and the output parses back to the same value', () => {
  const samples = ['null', 'true', '"x"', '-1.5e-3', '[[],[[]],{"a":{}}]', '{"":0,"\\u0000":1}', ' \n[ 1 ]\t'];
  for (const s of samples) assert.deepEqual(JSON.parse(fmt(s)), JSON.parse(s));
});
