import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNum, toData, niceTicks, fmt, renderChart, COLORS } from '../src/tools/plot/logic.ts';

const O = { kind: 'line', title: '', xLabel: '', yLabel: '', width: 800, height: 450, grid: true, legend: true, zeroBase: false };

test('parseNum', () => {
  assert.equal(parseNum('3'), 3);
  assert.equal(parseNum(' -2.5 '), -2.5);
  assert.equal(parseNum('1,5'), 1.5);
  assert.equal(parseNum('1e3'), 1000);
  assert.equal(parseNum('.5'), 0.5);
  for (const bad of ['', 'abc', '1,2,3', '12px', '--1']) assert.equal(parseNum(bad), null, bad);
});

test('toData: header, numeric x, several series, comma csv and semicolon decimals', () => {
  const d = toData('x,a,b\n1,2,3\n2,4,\n3,6,9\n');
  assert.equal(d.header, true);
  assert.deepEqual(d.xNum, [1, 2, 3]);
  assert.deepEqual(d.series.map((s) => s.name), ['a', 'b']);
  assert.deepEqual(d.series[1].values, [3, null, 9]);
  const e = toData('x;y\n1;1,5\n2;2,5');
  assert.deepEqual(e.series[0].values, [1.5, 2.5]);
});

test('toData: no header, text x, tab separated, limits', () => {
  const d = toData('Mon\t3\nTue\t5');
  assert.equal(d.header, false);
  assert.equal(d.xNum, null);
  assert.deepEqual(d.xLabels, ['Mon', 'Tue']);
  assert.equal(d.series[0].name, 'y1');
  const wide = toData(Array.from({ length: 12 }, (_, i) => i).join(',') + '\n' + Array.from({ length: 12 }, (_, i) => i).join(','));
  assert.equal(wide.series.length, 8);
  assert.equal(wide.dropped, 3);
  assert.throws(() => toData(''), { message: 'empty' });
  assert.throws(() => toData('1\n2\n3'), { message: 'cols' });
  assert.throws(() => toData('x,y'), { message: 'empty' });
});

test('niceTicks cover the range with round steps', () => {
  assert.deepEqual(niceTicks(0, 10, 5), [0, 2, 4, 6, 8, 10]);
  const t = niceTicks(3.2, 97, 6);
  assert.ok(t[0] <= 3.2 && t[t.length - 1] >= 97);
  assert.ok(niceTicks(5, 5).length >= 2); // constant data still gets an axis
  assert.ok(niceTicks(0.1, 0.35).every((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9));
  assert.ok(niceTicks(-50, 120).includes(0));
});

test('fmt strips float noise', () => {
  assert.equal(fmt(0.1 + 0.2), '0.3');
  assert.equal(fmt(0), '0');
  assert.equal(fmt(2500), '2500');
});

test('renderChart: valid svg, one path per series, escapes text, legend colours in order', () => {
  const d = toData('x,"a<b",b\n1,2,3\n2,4,1\n3,6,9');
  const svg = renderChart(d, { ...O, title: 'T & "q"' });
  assert.match(svg, /^<svg [^>]*viewBox="0 0 800 450"/);
  assert.equal((svg.match(/<path /g) ?? []).length, 2);
  assert.match(svg, /T &amp; &quot;q&quot;/);
  assert.match(svg, /a&lt;b/);
  assert.doesNotMatch(svg.replace(/xmlns="[^"]*"/, ''), /<script|href=|https?:/);
  assert.ok(svg.includes(COLORS[0]) && svg.includes(COLORS[1]) && !svg.includes(COLORS[2]));
  assert.equal((svg.match(/<\/svg>/g) ?? []).length, 1);
});

test('renderChart: a single series has no legend; null breaks the line', () => {
  const one = renderChart(toData('x,y\n1,1\n2,\n3,3\n4,4'), O);
  assert.equal((one.match(/<rect /g) ?? []).length, 1); // only the background
  assert.equal((one.match(/M/g) ?? []).length, 2); // two segments
});

test('renderChart: bars start at zero, negatives go down, scatter has no path', () => {
  const d = toData('k,v\na,5\nb,-3');
  const svg = renderChart(d, { ...O, kind: 'bar' });
  assert.equal((svg.match(/rx="2" fill="#0072B2"/g) ?? []).length, 2);
  assert.doesNotMatch(renderChart(toData('x,y\n1,1\n2,4'), { ...O, kind: 'scatter' }), /<path /);
});

test('renderChart: text x on a line chart, constant data, nothing to draw', () => {
  assert.match(renderChart(toData('d,y\nMon,2\nTue,3'), O), />Mon</);
  assert.match(renderChart(toData('x,y\n1,5\n2,5'), O), /^<svg/);
  assert.match(renderChart(toData('x,y\n1,\n2,'), O), /^<svg/);
});

import { logTicks, valueTable, tableCsv } from '../src/tools/plot/logic.ts';

test('logTicks: decades, minor ticks inside, wide spans thin out', () => {
  const t = logTicks(1, 1000, 6);
  assert.deepEqual(t.major, [1, 10, 100, 1000]);
  assert.ok(t.minor.includes(2) && t.minor.includes(500) && !t.minor.includes(10));
  const wide = logTicks(1e-20, 1e20, 6);
  assert.ok(wide.major.length <= 8 && wide.minor.length === 0);
  assert.ok(wide.major.every((v) => Number.isFinite(v) && v > 0));
});

test('logTicks: less than a decade still has labels, less than a tenth falls back to linear', () => {
  assert.deepEqual(logTicks(2, 6, 6).major, [2, 3, 4, 5, 6]);
  const tight = logTicks(100, 101, 6);
  assert.ok(tight.major.length >= 2 && tight.major.every((v) => v >= 100 && v <= 101.2));
});

test('valueTable: rows, undefined cells and the step cap', () => {
  const rows = valueTable([(x) => x * x, (x) => Math.sqrt(x)], -1, 1, 3);
  assert.deepEqual(rows, [[-1, 1, NaN], [0, 0, 0], [1, 1, 1]]);
  assert.equal(valueTable([(x) => x], 0, 1, 5000).length, 200);
  assert.deepEqual(valueTable([(x) => x], 0, 0.1, 3).map((r) => r[0]), [0, 0.1, 0.2]); // no float noise
  assert.equal(valueTable([], 0, 1, 3).length, 3);
});

test('tableCsv: header, number format, empty cell for undefined', () => {
  const csv = tableCsv(['x', 'y = x^2, sq'], [[1, 1], [2, NaN]]);
  assert.equal(csv, 'x,"y = x^2, sq"\n1,1\n2,');
});
