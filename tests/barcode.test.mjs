import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIDTHS, code128Values, code128, checkDigit, withCheck, ean13, ean8, upca, label, toSvg } from '../src/tools/barcode/logic.ts';

test('the Code 128 table is well formed: 11 modules per symbol, 3 bars and 3 spaces, all different', () => {
  assert.equal(WIDTHS.length, 107);
  WIDTHS.slice(0, 106).forEach((w, i) => { assert.equal(w.length, 6, `len ${i}`); assert.equal([...w].reduce((a, d) => a + Number(d), 0), 11, `sum ${i}`); });
  assert.equal(WIDTHS[106].length, 7);
  assert.equal([...WIDTHS[106]].reduce((a, d) => a + Number(d), 0), 13);
  assert.equal(new Set(WIDTHS).size, 107);
});

test('Code 128 picks subsets and checksums per the spec', () => {
  // Wikipedia example "PJJ123C" in subset B: start 104, P=48 J=42 J=42 1=17 2=18 3=19 C=35; check (104+48+84+126+68+90+... ) mod 103
  assert.deepEqual(code128Values('Hi'), [104, 40, 73]);
  assert.deepEqual(code128Values('1234'), [105, 12, 34]);
  assert.deepEqual(code128Values('A12345'), [104, 33, 99, 12, 34, 100, 21]);
  assert.deepEqual(code128Values('12345'), [105, 12, 34, 100, 21]);
  assert.deepEqual(code128Values('12'), [105, 12]);
  assert.deepEqual(code128Values('123'), [104, 17, 18, 19]);
  assert.throws(() => code128Values('é'), { message: 'chars' });
  assert.throws(() => code128Values(''), { message: 'empty' });
});

test('Code 128 module string: start + data + checksum + stop is a whole number of symbols', () => {
  const m = code128('Hi');
  // start(11) + 2 data(22) + check(11) + stop(13)
  assert.equal(m.length, 57);
  assert.match(m, /^11010010000/); // START B
  assert.ok(m.endsWith('1100011101011')); // STOP
  // checksum = (104 + 40*1 + 73*2) % 103 = 84, whose pattern is 124112
  assert.equal(m.slice(33, 44), '10011110100');
});

test('GS1 check digits', () => {
  assert.equal(checkDigit('400638133393'), 1);
  assert.equal(checkDigit('590123412345'), 7);
  assert.equal(checkDigit('7351353'), 7);
  assert.equal(checkDigit('03600029145'), 2);
  assert.equal(withCheck('400638133393', 13), '4006381333931');
  assert.equal(withCheck('4006381333931', 13), '4006381333931');
  assert.throws(() => withCheck('4006381333932', 13), { message: 'check' });
  assert.throws(() => withCheck('4006', 13), { message: 'length' });
  assert.throws(() => withCheck('40063813339x', 13), { message: 'digits' });
});

test('EAN-13, EAN-8 and UPC-A have the right size and guards', () => {
  const a = ean13('5901234123457');
  assert.equal(a.length, 95);
  assert.ok(a.startsWith('101') && a.endsWith('101') && a.slice(45, 50) === '01010');
  // first digit 5 gives parity LGGLLG; left digits 9 (L) and 0 (G)
  assert.equal(a.slice(3, 10), '0001011');
  assert.equal(a.slice(10, 17), '0100111');
  const e = ean8('73513537');
  assert.equal(e.length, 67);
  assert.equal(ean8('7351353'), e);
  const u = upca('036000291452');
  assert.equal(u.length, 95);
  assert.equal(u, ean13('0036000291452'));
  assert.equal(label('upca', '03600029145'), '036000291452');
  assert.equal(label('code128', 'x'), 'x');
});

test('SVG has one path with a run per bar group and escapes the label', () => {
  const svg = toSvg('1101', '<a&b>', { module: 3, height: 50 });
  assert.match(svg, /d="M30 0h6v50h-6zM39 0h3v50h-3z"/);
  assert.match(svg, /&lt;a&amp;b>/);
  assert.match(svg, /width="72"/); // 4 modules * 3 + 2 * 30 quiet zone
});
