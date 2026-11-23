import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, category, convert, format, parseNumber } from '../src/tools/units/logic.ts';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} vs ${b}`);

test('length, mass and volume use the exact definitions', () => {
  close(convert('length', 'mi', 'km', 1), 1.609344);
  close(convert('length', 'in', 'cm', 1), 2.54);
  close(convert('length', 'ft', 'in', 1), 12);
  close(convert('mass', 'lb', 'kg', 1), 0.45359237);
  close(convert('mass', 'oz', 'g', 16), 453.59237);
  close(convert('volume', 'gal', 'L', 1), 3.785411784);
  close(convert('volume', 'cup', 'tbsp', 1), 16, 1e-9);
  close(convert('volume', 'tbsp', 'tsp', 1), 3, 1e-9);
});

test('temperature converts through Celsius', () => {
  close(convert('temperature', '°C', '°F', 100), 212);
  close(convert('temperature', '°F', '°C', -40), -40);
  close(convert('temperature', 'K', '°C', 0), -273.15);
  close(convert('temperature', '°C', 'K', 25), 298.15);
});

test('data keeps the decimal and binary prefixes apart', () => {
  close(convert('data', 'GB', 'MB', 1), 1000);
  close(convert('data', 'GiB', 'MiB', 1), 1024);
  close(convert('data', 'GiB', 'GB', 1), 1.073741824);
  close(convert('data', 'B', 'bit', 1), 8);
});

test('speed, time and angle', () => {
  close(convert('speed', 'km/h', 'm/s', 36), 10);
  close(convert('speed', 'mph', 'km/h', 60), 96.56064);
  close(convert('time', 'h', 'min', 1.5), 90);
  close(convert('time', 'd', 'h', 1), 24);
  close(convert('angle', '°', 'rad', 180), Math.PI);
  close(convert('angle', 'turn', '°', 0.25), 90);
});

test('fuel economy is reciprocal and round-trips', () => {
  close(convert('fuel', 'mpg', 'L/100km', 30), 7.84048611, 1e-8);
  close(convert('fuel', 'L/100km', 'mpg', 7.84048611), 30, 1e-8);
  close(convert('fuel', 'km/L', 'L/100km', 20), 5);
  assert.ok(!Number.isFinite(convert('fuel', 'mpg', 'L/100km', 0)) || convert('fuel', 'mpg', 'L/100km', 0) === Infinity);
});

test('every unit round-trips through its category base', () => {
  for (const cat of CATEGORIES) {
    for (const a of cat.units) {
      for (const b of cat.units) {
        const there = convert(cat.id, a.id, b.id, 7);
        close(convert(cat.id, b.id, a.id, there), 7, 1e-9);
      }
    }
  }
});

test('unit ids are unique inside a category and categories are found by id', () => {
  for (const cat of CATEGORIES) assert.equal(new Set(cat.units.map((x) => x.id)).size, cat.units.length, cat.id);
  assert.equal(category('speed').id, 'speed');
  assert.equal(category('nope').id, CATEGORIES[0].id);
});

test('format trims to ten significant digits and groups large numbers', () => {
  assert.equal(format(0.1 + 0.2), '0.3');
  assert.equal(format(1 / 3), '0.3333333333');
  assert.equal(format(1234567.5, 'en'), '1,234,567.5');
  assert.equal(format(1234567.5, 'de'), '1.234.567,5');
  assert.equal(format(0), '0');
  assert.equal(format(Infinity), '–');
  assert.match(format(1e20), /e\+?20$/);
  assert.match(format(2e-9), /e-9$/);
});

test('parseNumber reads both decimal separators and thousands marks', () => {
  assert.equal(parseNumber('1,5'), 1.5);
  assert.equal(parseNumber('1.5'), 1.5);
  assert.equal(parseNumber('1 500,25'), 1500.25);
  assert.equal(parseNumber('1,234.5'), 1234.5);
  assert.equal(parseNumber('1.234,5'), 1234.5);
  assert.equal(parseNumber('-3e2'), -300);
  assert.ok(Number.isNaN(parseNumber('abc')));
  assert.ok(Number.isNaN(parseNumber('')));
});
