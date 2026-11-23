import { test } from 'node:test';
import assert from 'node:assert/strict';
import { morseEncode, morseDecode, morseTimings, natoEncode, natoDecode, brailleEncode, brailleDecode, caesar, caesarAll, vigenere } from '../src/tools/codes/logic.ts';

test('morse encodes letters, digits and punctuation, words split by /', () => {
  assert.equal(morseEncode('SOS').out, '... --- ...');
  assert.equal(morseEncode('Hello World').out, '.... . .-.. .-.. --- / .-- --- .-. .-.. -..');
  assert.equal(morseEncode('a1?').out, '.- .---- ..--..');
  assert.equal(morseEncode('Ärger').out, '.-.- .-. --. . .-.');
});

test('morse counts what has no code instead of guessing', () => {
  assert.deepEqual(morseEncode('a~b'), { out: '.- -...', unknown: 1 });
  assert.equal(morseEncode('').out, '');
});

test('morse decodes with / | or wide gaps as word breaks, and accepts typographic dots and dashes', () => {
  assert.equal(morseDecode('... --- ...').out, 'SOS');
  assert.equal(morseDecode('.... .. / - .partial').out, 'HI T?');
  assert.equal(morseDecode('.... ..   - .partial').out, 'HI T?');
  assert.equal(morseDecode('····  –··· ').out.length > 0, true);
  assert.equal(morseDecode('.... .. | .-').out, 'HI A');
  assert.equal(morseDecode('.-.-.-').out, '.');
});

test('morse round-trips every supported text in both alphabets', () => {
  const latin = 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 0123456789 .,?!/()&:;=+-_"$@ ÄÖÜ';
  assert.equal(morseDecode(morseEncode(latin).out).out, latin);
  const cyr = 'СЪЕШЬ ЕЩЁ ЭТИХ МЯГКИХ ФРАНЦУЗСКИХ БУЛОК 123';
  assert.equal(morseDecode(morseEncode(cyr, 'cyrillic').out, 'cyrillic').out, cyr.replace('Ё', 'Е'));
});

test('morse timings follow the PARIS standard: dot = 1200/wpm ms, dash 3, gaps 1, 3 and 7', () => {
  assert.deepEqual(morseTimings('.-', 20), [{ on: true, ms: 60 }, { on: false, ms: 60 }, { on: true, ms: 180 }]);
  assert.deepEqual(morseTimings('. .', 20), [{ on: true, ms: 60 }, { on: false, ms: 180 }, { on: true, ms: 60 }]);
  assert.deepEqual(morseTimings('. / .', 20), [{ on: true, ms: 60 }, { on: false, ms: 420 }, { on: true, ms: 60 }]);
  assert.deepEqual(morseTimings('', 20), []);
});

test('NATO phonetic alphabet spells letters and digits, and reads them back', () => {
  assert.equal(natoEncode('Hi 5').out, 'Hotel India / Fife');
  assert.equal(natoEncode('9').out, 'Niner');
  assert.equal(natoDecode('hotel india / fife').out, 'HI 5');
  assert.equal(natoDecode('Alpha Juliet X-ray three four').out, 'AJX34');
  assert.deepEqual(natoDecode('hotel banana'), { out: 'H?', unknown: 1 });
  assert.equal(natoDecode(natoEncode('Test 0129 Zulu').out).out, 'TEST 0129 ZULU');
});

test('braille (English grade 1): capitals, numbers and punctuation', () => {
  assert.equal(brailleEncode('Hello').out, '⠠⠓⠑⠇⠇⠕');
  assert.equal(brailleEncode('abc 123').out, '⠁⠃⠉⠀⠼⠁⠃⠉');
  assert.equal(brailleEncode('Hi!').out, '⠠⠓⠊⠖');
  assert.equal(brailleDecode('⠠⠓⠑⠇⠇⠕').out, 'Hello');
  assert.equal(brailleDecode('⠼⠁⠃⠉⠀⠁⠃⠉').out, '123 abc'); // the number sign ends at the space
  assert.equal(brailleDecode(brailleEncode('Zoe, age 42. Ready?').out).out, 'Zoe, age 42. Ready?');
  assert.deepEqual(brailleEncode('a€b'), { out: '⠁⠃', unknown: 1 });
});

test('caesar shifts letters only, keeps case, and ROT13 undoes itself', () => {
  assert.equal(caesar('Hello, World!', 3), 'Khoor, Zruog!');
  assert.equal(caesar('Khoor, Zruog!', -3), 'Hello, World!');
  assert.equal(caesar('abc', 26), 'abc');
  assert.equal(caesar('xyz', 3), 'abc');
  assert.equal(caesar(caesar('Test ä 1', 13), 13), 'Test ä 1');
  assert.equal(caesar('abc', -27), 'zab');
});

test('caesarAll lists the 25 other shifts', () => {
  const all = caesarAll('Khoor');
  assert.equal(all.length, 25);
  assert.deepEqual(all[0], { shift: 1, text: 'Lipps' });
  assert.ok(all.some((x) => x.text === 'Hello'));
});

test('vigenere matches the textbook example, skips non-letters and keeps case', () => {
  assert.equal(vigenere('ATTACKATDAWN', 'LEMON', 1), 'LXFOPVEFRNHR');
  assert.equal(vigenere('Attack at dawn!', 'lemon', 1), 'Lxfopv ef rnhr!');
  assert.equal(vigenere('LXFOPVEFRNHR', 'LEMON', -1), 'ATTACKATDAWN');
  assert.equal(vigenere('Hello', '', 1), 'Hello'); // no key letters, nothing to do
  assert.equal(vigenere('Hello', '123', 1), 'Hello');
});
