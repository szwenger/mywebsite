import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches, norm } from '../src/scripts/toolfilter.ts';

test('case and accents are ignored on both sides', () => {
  assert.equal(norm('Größe Crème Ёлка'), 'große creme елка');
  assert.ok(matches('Crème brûlée', 'creme'));
  assert.ok(matches('Конвертер субтитров', 'СУБТИТР'));
  assert.ok(matches('Konverter für Übergröße', 'ubergro'));
});

test('every word must match, in any order and any place', () => {
  assert.ok(matches('Base64, URL and JWT decoder', 'jwt base64'));
  assert.ok(!matches('Base64, URL and JWT decoder', 'jwt pdf'));
});

test('an empty or blank query matches everything', () => {
  assert.ok(matches('anything', ''));
  assert.ok(matches('anything', '   '));
});

import { extKey, parseConversion, finds } from '../src/scripts/toolfilter.ts';

test('extensions: dots and case do not matter, jpeg is jpg and heif is heic', () => {
  assert.equal(extKey('.JPEG'), 'jpg');
  assert.equal(extKey('HEIF'), 'heic');
  assert.equal(extKey('tiff'), 'tif');
  assert.equal(extKey('png'), 'png');
});

test('conversion queries: "X to Y", X2Y and X→Y; plain words are not conversions', () => {
  assert.deepEqual(parseConversion('heic to jpg'), { from: 'heic', to: 'jpg' });
  assert.deepEqual(parseConversion('PDF2JPEG'), { from: 'pdf', to: 'jpg' });
  assert.deepEqual(parseConversion('px → rem'), { from: 'px', to: 'rem' });
  assert.deepEqual(parseConversion('svg->png'), { from: 'svg', to: 'png' });
  assert.equal(parseConversion('photo editor'), null);
  assert.equal(parseConversion('toolkit'), null);
  assert.equal(parseConversion('base64'), null);
  assert.equal(parseConversion('to jpg'), null);
});

const card = (hay, accepts = [], produces = []) => ({ hay, accepts, produces });
const image = card('Image converter heic jpg jpeg png iphone', ['png', 'jpg', 'webp', 'heic'], ['png', 'jpg', 'webp']);
const units = card('Unit converter celsius fahrenheit px rem');

test('finds: a conversion matches by accepted and produced formats, either way round of spelling', () => {
  assert.ok(finds(image, 'heic to jpg'));
  assert.ok(finds(image, 'heif2jpeg'));
  assert.ok(!finds(image, 'jpg to heic')); // the words are all there, but the tool cannot make heic
  assert.ok(!finds(image, 'pdf to jpg'));
});

test('finds: a tool that declares no formats is matched by its words (celsius to fahrenheit)', () => {
  assert.ok(finds(units, 'celsius to fahrenheit'));
  assert.ok(finds(units, 'px2rem'));
  assert.ok(!finds(units, 'celsius to pdf'));
});

test('finds: a bare extension, with or without the dot, matches what accepts or produces it', () => {
  assert.ok(finds(image, '.heic'));
  assert.ok(finds(image, 'jpeg'));
  assert.ok(!finds(image, '.pdf'));
  assert.ok(finds(card('Subtitles'), ''));
});
