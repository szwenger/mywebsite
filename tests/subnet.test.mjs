import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromIp, toIp, parseCidr, split, kindOf } from '../src/tools/subnet/logic.ts';

test('addresses round-trip and bad ones are rejected', () => {
  assert.equal(toIp(fromIp('192.168.1.10')), '192.168.1.10');
  assert.equal(fromIp('255.255.255.255'), 4294967295);
  for (const bad of ['1.2.3', '1.2.3.256', '01.2.3.4', 'a.b.c.d', '1.2.3.4.5', '']) assert.equal(fromIp(bad), null, bad);
});

test('a /24 has 254 hosts between .1 and .254', () => {
  assert.deepEqual(parseCidr('192.168.1.10/24'), {
    ip: '192.168.1.10', prefix: 24, mask: '255.255.255.0', wildcard: '0.0.0.255', network: '192.168.1.0', broadcast: '192.168.1.255',
    first: '192.168.1.1', last: '192.168.1.254', hosts: 254, total: 256, kind: 'private',
  });
});

test('odd sizes: /30, /31, /32, /0', () => {
  const a = parseCidr('10.0.0.5/30');
  assert.deepEqual([a.network, a.first, a.last, a.broadcast, a.hosts], ['10.0.0.4', '10.0.0.5', '10.0.0.6', '10.0.0.7', 2]);
  const b = parseCidr('10.0.0.4/31');
  assert.deepEqual([b.first, b.last, b.hosts, b.total], ['10.0.0.4', '10.0.0.5', 2, 2]);
  const c = parseCidr('8.8.8.8');
  assert.deepEqual([c.prefix, c.hosts, c.first, c.last, c.kind], [32, 1, '8.8.8.8', '8.8.8.8', 'public']);
  const d = parseCidr('1.2.3.4/0');
  assert.deepEqual([d.mask, d.network, d.broadcast, d.total], ['0.0.0.0', '0.0.0.0', '255.255.255.255', 4294967296]);
});

test('a netmask can stand in for the prefix', () => {
  assert.equal(parseCidr('172.16.5.9 255.255.240.0').prefix, 20);
  assert.equal(parseCidr('172.16.5.9 255.255.240.0').network, '172.16.0.0');
  assert.equal(parseCidr('1.1.1.1 0.0.0.0').prefix, 0);
  assert.equal(parseCidr('1.1.1.1 255.255.255.255').prefix, 32);
  assert.throws(() => parseCidr('1.1.1.1 255.0.255.0'), { message: 'mask' });
  assert.throws(() => parseCidr('1.1.1.1/33'), { message: 'prefix' });
  assert.throws(() => parseCidr('nope/8'), { message: 'format' });
});

test('address kinds', () => {
  const k = (s) => parseCidr(s).kind;
  assert.deepEqual(['10.1.2.3', '172.31.0.1', '172.32.0.1', '127.0.0.1', '169.254.1.1', '100.64.0.1', '224.0.0.1', '255.255.255.255', '0.0.0.0', '1.1.1.1'].map(k),
    ['private', 'private', 'public', 'loopback', 'linklocal', 'cgnat', 'multicast', 'reserved', 'this', 'public']);
  assert.equal(kindOf(fromIp('192.168.0.0')), 'private');
});

test('splitting a network', () => {
  const r = split('192.168.0.0/24', 26);
  assert.equal(r.count, 4);
  assert.deepEqual(r.subnets.map((s) => `${s.network}/${s.prefix}`), ['192.168.0.0/26', '192.168.0.64/26', '192.168.0.128/26', '192.168.0.192/26']);
  assert.equal(split('10.0.0.0/8', 24, 5).subnets.length, 5);
  assert.equal(split('10.0.0.0/8', 24, 5).count, 65536);
  assert.throws(() => split('10.0.0.0/24', 24), { message: 'prefix' });
  assert.throws(() => split('10.0.0.0/24', 33), { message: 'prefix' });
});
