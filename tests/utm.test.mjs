import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUtm } from '../src/tools/utm/logic.ts';

test('adds the parameters in a fixed order and skips empty ones', () => {
  assert.equal(buildUtm('https://example.com/page', { source: 'news', medium: 'email', campaign: 'spring sale', term: ' ' }), 'https://example.com/page?utm_source=news&utm_medium=email&utm_campaign=spring+sale');
});

test('keeps other parameters and the fragment, replaces old utm values', () => {
  assert.equal(buildUtm('https://example.com/?a=1&utm_source=old&utm_term=x#top', { source: 'new' }), 'https://example.com/?a=1&utm_source=new#top');
});

test('a missing scheme becomes https, other schemes and junk are refused', () => {
  assert.equal(buildUtm('example.com', { source: 's' }), 'https://example.com/?utm_source=s');
  assert.throws(() => buildUtm('ftp://example.com', { source: 's' }), { message: 'url' });
  assert.throws(() => buildUtm('javascript:alert(1)', { source: 's' }), { message: 'url' });
  assert.throws(() => buildUtm('not a link', { source: 's' }), { message: 'url' });
  assert.throws(() => buildUtm('', { source: 's' }), { message: 'url' });
});

test('source is required; lower-casing is optional', () => {
  assert.throws(() => buildUtm('https://example.com', { medium: 'm' }), { message: 'required' });
  assert.equal(buildUtm('https://example.com', { source: 'Newsletter', campaign: 'Launch' }, true), 'https://example.com/?utm_source=newsletter&utm_campaign=launch');
  assert.equal(buildUtm('https://example.com', { source: 'Newsletter' }), 'https://example.com/?utm_source=Newsletter');
});
