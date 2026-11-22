import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stats, transforms as T, slug } from '../src/tools/textkit/logic.ts';

test('stats counts characters (emoji as one), words, lines, paragraphs, sentences and bytes', () => {
  const s = stats('Hello world. How are you?\n\nFine 🙂!');
  assert.equal(s.words, 6);
  assert.equal(s.lines, 3);
  assert.equal(s.paragraphs, 2);
  assert.equal(s.sentences, 3);
  assert.equal(s.chars, [...'Hello world. How are you?\n\nFine 🙂!'].length);
  assert.equal(s.bytes, new TextEncoder().encode('Hello world. How are you?\n\nFine 🙂!').length);
  assert.deepEqual(stats(''), { chars: 0, noSpaces: 0, words: 0, lines: 0, paragraphs: 0, sentences: 0, bytes: 0, readMin: 0 });
});

test('case conversions split words from spaces, punctuation and camelCase', () => {
  assert.equal(T.camel('hello big_world-again'), 'helloBigWorldAgain');
  assert.equal(T.pascal('helloBigWorld'), 'HelloBigWorld');
  assert.equal(T.snake('HelloBigWorld v2'), 'hello_big_world_v2');
  assert.equal(T.kebab('Hello Big  World!'), 'hello-big-world');
  assert.equal(T.constant('helloWorld'), 'HELLO_WORLD');
  assert.equal(T.title('the QUICK brown fox\'s tail'), "The Quick Brown Fox's Tail");
  assert.equal(T.sentence('HELLO there. WHO is this? me!'), 'Hello there. Who is this? Me!');
  assert.equal(T.upper('straße'), 'STRASSE');
});

test('slug handles umlauts, accents and Cyrillic', () => {
  assert.equal(slug('Größe & Maße: Über uns!'), 'groesse-masse-ueber-uns');
  assert.equal(slug('Crème brûlée'), 'creme-brulee');
  assert.equal(slug('Привет, мир! Щука'), 'privet-mir-shchuka');
  assert.equal(slug('  ---  '), '');
});

test('line tools: natural sort, unique keeps first occurrence, empty lines, trim', () => {
  assert.equal(T.sortAsc('b\na10\na2\nA1'), 'A1\na2\na10\nb');
  assert.equal(T.sortDesc('a\nc\nb'), 'c\nb\na');
  assert.equal(T.unique('x\ny\nx\nz\ny'), 'x\ny\nz');
  assert.equal(T.noEmpty('a\n\n  \nb'), 'a\nb');
  assert.equal(T.trim('  a \n b'), 'a\nb');
  assert.equal(T.reverse('1\n2\n3'), '3\n2\n1');
  assert.equal(T.oneSpace('a   b\t\tc'), 'a b c');
});
