import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDelim, parseCsv, csvToJson, jsonToCsv } from '../src/tools/csv/logic.ts';

test('delimiter is detected outside quotes', () => {
  assert.equal(detectDelim('a;b;c\n1;2;3'), ';');
  assert.equal(detectDelim('a\tb\n1\t2'), '\t');
  assert.equal(detectDelim('"a;b;c",d\n1,2'), ',');
  assert.equal(detectDelim('single'), ',');
});

test('quoted cells keep delimiters, line breaks and quotes', () => {
  assert.deepEqual(parseCsv('a,"b,c","say ""hi"""\r\n"x\ny",,z\r\n', ','), [['a', 'b,c', 'say "hi"'], ['x\ny', '', 'z']]);
  assert.deepEqual(parseCsv('﻿a,b\n1,2', ','), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCsv('a,b', ','), [['a', 'b']]);
  assert.deepEqual(parseCsv('', ','), []);
  assert.deepEqual(parseCsv('a,\n', ','), [['a', '']]);
  assert.throws(() => parseCsv('a,"b', ','), { message: 'quote' });
});

test('rows become objects; types are only guessed on request and leading zeros survive', () => {
  const rows = parseCsv('id,name,ok,zip,big\n1,Ann,true,007,12345678901234567890\n2,Bob,false,10115', ',');
  assert.deepEqual(csvToJson(rows, true, false)[0], { id: '1', name: 'Ann', ok: 'true', zip: '007', big: '12345678901234567890' });
  assert.deepEqual(csvToJson(rows, true, true), [
    { id: 1, name: 'Ann', ok: true, zip: '007', big: '12345678901234567890' },
    { id: 2, name: 'Bob', ok: false, zip: 10115, big: null },
  ]);
  assert.deepEqual(csvToJson([['a', 'b'], ['c']], false, false), [{ col1: 'a', col2: 'b' }, { col1: 'c', col2: null }]);
});

test('empty and repeated header names are made unique', () => {
  assert.deepEqual(csvToJson([['x', 'x', '', 'x'], ['1', '2', '3', '4']], true, false), [{ x: '1', x_2: '2', col3: '3', x_3: '4' }]);
  assert.deepEqual(csvToJson([], true, false), []);
});

test('JSON to CSV: union of keys, dotted nesting, quoting', () => {
  const csv = jsonToCsv([{ a: 1, b: { c: 'x,y' } }, { a: 2, d: [1, 2], e: null }, { a: 'q"t' }], ',', '\n');
  assert.equal(csv, 'a,b.c,d,e\n1,"x,y",,\n2,,"[1,2]",\n"q""t",,,');
  assert.equal(jsonToCsv({ a: 1 }, ';'), 'a\r\n1');
  assert.throws(() => jsonToCsv([1, 2], ','), { message: 'shape' });
  assert.throws(() => jsonToCsv([], ','), { message: 'shape' });
  assert.throws(() => jsonToCsv('x', ','), { message: 'shape' });
});

test('a round trip keeps the text of every cell', () => {
  const src = [['n', 'note'], ['1', 'line1\nline2'], ['2', ' padded '], ['3', 'a;b']];
  const objs = csvToJson(src, true, false);
  assert.deepEqual(parseCsv(jsonToCsv(objs, ';'), ';'), src);
});
