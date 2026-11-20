import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wifiPayload, vcardPayload, urlPayload } from '../src/tools/qr/payload.ts';

test('wifi payload escapes backslash, semicolon, comma, colon and quote', () => {
  assert.equal(
    wifiPayload({ ssid: 'Home;Net', password: 'a"b\\c', security: 'WPA', hidden: false }),
    String.raw`WIFI:T:WPA;S:Home\;Net;P:a\"b\\c;;`,
  );
  assert.equal(wifiPayload({ ssid: 'a,b:c', password: 'x', security: 'WEP', hidden: false }), String.raw`WIFI:T:WEP;S:a\,b\:c;P:x;;`);
});

test('wifi nopass omits the password, hidden adds H:true', () => {
  assert.equal(wifiPayload({ ssid: 'Cafe', password: 'ignored', security: 'nopass', hidden: false }), 'WIFI:T:nopass;S:Cafe;;');
  assert.equal(wifiPayload({ ssid: 'Cafe', password: 'pw', security: 'WPA', hidden: true }), 'WIFI:T:WPA;S:Cafe;P:pw;H:true;;');
});

test('vcard has CRLF lines, only the filled fields, and escapes commas, semicolons and backslashes', () => {
  const v = vcardPayload({ name: 'Simon Zwenger', email: 'request@galuin.com' });
  assert.ok(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));
  assert.match(v, /\r\nFN:Simon Zwenger\r\n/);
  assert.match(v, /\r\nEMAIL:request@galuin\.com\r\n/);
  assert.ok(v.endsWith('END:VCARD'));
  assert.doesNotMatch(v, /TEL:|URL:|ORG:/);
  assert.ok(vcardPayload({ name: 'A', org: 'Foo, Bar; Baz\\Q' }).includes(String.raw`ORG:Foo\, Bar\; Baz\\Q`));
});

test('url payload is trimmed and otherwise unchanged', () => {
  assert.equal(urlPayload('  https://galuin.com/?a=1&b=2 \n'), 'https://galuin.com/?a=1&b=2');
});

import { contrastRatio } from '../src/tools/qr/contrast.ts';

test('contrast ratio follows WCAG: black/white 21, identical 1, mid grey below 3 against a similar grey', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#336699', '#336699'), 1);
  assert.ok(contrastRatio('#777777', '#999999') < 3);
  assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - 4.48) < 0.02);
  assert.equal(contrastRatio('#fff', '#000'), 21, 'short hex');
});
