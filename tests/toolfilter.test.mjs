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
