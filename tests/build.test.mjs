import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (p) => readFileSync(join('dist', p), 'utf8');
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const PAGES = { en: 'index.html', de: 'de/index.html', ru: 'ru/index.html' };
const pre = (lang) => (lang === 'en' ? '' : `/${lang}`);

test('lang attributes', () => {
  for (const [lang, f] of Object.entries(PAGES)) assert.match(read(f), new RegExp(`<html lang="${lang}"`), f);
});

test('hreflang alternates link all three languages plus x-default', () => {
  for (const f of Object.values(PAGES)) {
    const h = read(f);
    for (const l of ['en', 'de', 'ru', 'x-default']) {
      assert.match(h, new RegExp(`<link rel="alternate" hreflang="${l}" href="https://galuin.com/`), `${l} in ${f}`);
    }
  }
});

test('theme-init inline script sits in head', () => {
  for (const f of Object.values(PAGES)) {
    const head = read(f).split('</head>')[0];
    assert.match(head, /<script[^>]*>[^<]*localStorage[^<]*theme/, f);
  }
});

test('CNAME', () => {
  assert.equal(read('CNAME').trim(), 'galuin.com');
});

// Terms that must never ship live in a git-ignored file, one per line. Without the file the test is skipped.
const PRIVATE = 'tests/private-terms.local.txt';
const privateTerms = existsSync(PRIVATE) ? readFileSync(PRIVATE, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
test('no private data in build', { skip: privateTerms.length ? false : `${PRIVATE} missing` }, () => {
  for (const f of walk('dist').filter((p) => /\.(html|js|css|txt|xml)$/.test(p))) {
    const c = readFileSync(f, 'utf8');
    for (const bad of privateTerms) assert.ok(!c.includes(bad), `private term #${privateTerms.indexOf(bad) + 1} in ${f}`);
  }
});

test('nav links to sections (language-prefixed) and Twitch; footer to legal pages and YouTube', () => {
  for (const [lang, f] of Object.entries(PAGES)) {
    const h = read(f);
    const nav = h.split('<nav')[1].split('</nav>')[0];
    for (const p of ['/blog/', '/videos/', '/tools/', '/hardware/']) assert.ok(nav.includes(`href="${pre(lang)}${p}"`), `${p} in nav of ${f}`);
    assert.ok(h.split('</header>')[0].includes('href="https://www.twitch.tv/galuin"'), `twitch in header of ${f}`);
    const foot = h.split('<footer')[1];
    for (const p of ['/impressum/', '/privacy/']) assert.ok(foot.includes(`href="${pre(lang)}${p}"`), `${p} in footer of ${f}`);
    assert.ok(foot.includes('href="https://www.youtube.com/@Galuin"'), `youtube in footer of ${f}`);
    assert.ok(foot.includes('href="https://www.twitch.tv/galuin"'), `twitch in footer of ${f}`);
  }
});

test('language switcher offers the other two languages for the same path', () => {
  const sw = (f) => [...read(f).matchAll(/<a[^>]*data-lang="(\w+)"[^>]*href="([^"]+)"|<a[^>]*href="([^"]+)"[^>]*data-lang="(\w+)"/g)]
    .map((m) => [m[1] ?? m[4], m[2] ?? m[3]]);
  assert.deepEqual(Object.fromEntries(sw('index.html')), { de: '/de/', ru: '/ru/' });
  assert.deepEqual(Object.fromEntries(sw('de/index.html')), { en: '/', ru: '/ru/' });
  assert.deepEqual(Object.fromEntries(sw('ru/index.html')), { en: '/', de: '/de/' });
});

test('theme toggle button is labelled', () => {
  for (const f of Object.values(PAGES)) {
    assert.match(read(f), /<button[^>]*data-theme-toggle[^>]*aria-label="[^"]+"|<button[^>]*aria-label="[^"]+"[^>]*data-theme-toggle/, f);
  }
});

test('no third-party load on any page', () => {
  const external = /^https?:\/\/(?!galuin\.com[/"]|galuin\.com$)/;
  for (const f of walk('dist').filter((p) => p.endsWith('.html'))) {
    const h = readFileSync(f, 'utf8');
    for (const m of h.matchAll(/\ssrc(?:set)?="([^"]+)"/g)) assert.ok(!external.test(m[1]), `${m[1]} loaded by ${f}`);
    for (const m of h.matchAll(/<link[^>]*>/g)) {
      if (!/rel="(stylesheet|preload|modulepreload|icon|preconnect|dns-prefetch)"/.test(m[0])) continue;
      const href = m[0].match(/href="([^"]+)"/)?.[1] ?? '';
      assert.ok(!external.test(href), `${href} linked by ${f}`);
    }
    assert.ok(!/<iframe/i.test(h), `iframe in ${f}`);
  }
  for (const f of walk('dist').filter((p) => p.endsWith('.css'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/url\(\s*['"]?(https?:[^'")]+)/g)) assert.fail(`${m[1]} in ${f}`);
  }
});

test('self-hosted font covers Cyrillic', () => {
  const css = walk('dist').filter((p) => p.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
  const faces = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  assert.ok(faces.some((f) => /unicode-range:[^;}]*U\+0?400/i.test(f)), 'no @font-face with a Cyrillic unicode-range');
});

test('404 page: not indexed, links home in all three languages', () => {
  const h = read('404.html');
  assert.match(h, /<meta name="robots" content="noindex"/);
  assert.ok(!h.includes('rel="canonical"'), '404 must not claim a canonical URL');
  for (const p of ['/', '/de/', '/ru/']) assert.ok(h.includes(`href="${p}"`), `${p} in 404`);
});
