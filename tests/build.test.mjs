import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

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

// ---- Task 2: blog ----
const SLUGS = ['welcome', 'version-0-1', 'content-page-and-nas', 'nas-build'];

test('blog index exists in every language and lists all 4 posts once', () => {
  for (const lang of ['en', 'de', 'ru']) {
    const h = read(join(lang === 'en' ? '' : lang, 'blog', 'index.html'));
    assert.match(h, new RegExp(`<html lang="${lang}"`));
    assert.equal((h.match(/data-post=/g) ?? []).length, 4, `${lang}: post count`);
    for (const s of SLUGS) assert.equal((h.match(new RegExp(`data-post="${s}"`, 'g')) ?? []).length, 1, `${lang}: ${s}`);
  }
});

test('every slug has a page in every language', () => {
  for (const lang of ['en', 'de', 'ru']) for (const s of SLUGS) {
    const f = join(lang === 'en' ? '' : lang, 'blog', s, 'index.html');
    assert.ok(existsSync(join('dist', f)), f);
  }
});

test('a fallback page shows the original text and canonicalises to it', () => {
  const h = read('de/blog/welcome/index.html');
  assert.match(h, /<html lang="de"/);
  assert.match(h, /<article[^>]*\blang="en"/);
  assert.match(h, /<link rel="canonical" href="https:\/\/galuin\.com\/blog\/welcome\/"/);
});

test('the original page canonicalises to itself and the blog is in the nav as current', () => {
  const h = read('blog/welcome/index.html');
  assert.match(h, /<link rel="canonical" href="https:\/\/galuin\.com\/blog\/welcome\/"/);
  assert.match(h, /aria-current="page"[^>]*>Blog</);
});

test('notes show their text on the index, the NAS note has no TBD rows', () => {
  const h = read('blog/index.html');
  assert.match(h, /Welcome to my personal blog/);
  const nas = read('blog/nas-build/index.html');
  assert.match(nas, /3 × 12/);
  assert.doesNotMatch(nas, /TBD/);
});

// ---- Task 3: videos ----
test('videos page exists in every language, links the channel, thumbnails are local', () => {
  for (const lang of ['en', 'de', 'ru']) {
    const h = read(join(lang === 'en' ? '' : lang, 'videos', 'index.html'));
    assert.match(h, new RegExp(`<html lang="${lang}"`));
    assert.match(h, /href="https:\/\/www\.youtube\.com\/@Galuin"/);
    assert.match(h, /aria-current="page"[^>]*>(Videos|Видео)</);
    const main = h.slice(h.indexOf('<main'), h.indexOf('</main>'));
    for (const [, src] of main.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)) assert.ok(src.startsWith('/thumbs/'), `${lang}: ${src}`);
  }
});

// ---- Task 4: front page ----
const section = (h, name) => {
  const i = h.indexOf(`data-section="${name}"`);
  if (i < 0) return null;
  const start = h.lastIndexOf('<', i);
  const tag = h.slice(start + 1).match(/^\w+/)[0];
  return h.slice(start, h.indexOf(`</${tag}>`, i) + tag.length + 3);
};
const cachedVideos = existsSync('src/data/videos.json') ? JSON.parse(readFileSync('src/data/videos.json', 'utf8')).videos : [];

test('front page has lead, notes, videos, Twitch and tools sections in every language', () => {
  for (const [lang, f] of Object.entries(PAGES)) {
    const h = read(f);
    for (const s of ['notes', 'twitch', 'tools']) assert.ok(section(h, s), `${s} on ${f}`);
    // All migrated posts are notes, so the lead is a video exactly when the feed gave us any.
    assert.equal(!!section(h, 'lead'), cachedVideos.length > 0, `lead on ${f}`);
    assert.equal(!!section(h, 'videos'), cachedVideos.length > 1, `videos row on ${f}`);
    assert.ok(!h.includes('homeSoon') && !/front page in the works/i.test(h), `placeholder left on ${f}`);
    assert.match(h, new RegExp(`<html lang="${lang}"`));
  }
});

test('notes column shows the newest notes in full, at most 5', () => {
  const notes = section(read('index.html'), 'notes');
  const n = (notes.match(/data-post=/g) ?? []).length;
  assert.ok(n >= 1 && n <= 5, `notes: ${n}`);
  assert.match(notes, /data-post="nas-build"/);
  assert.match(notes, /3 × 12/);
});

test('videos row: at most 4 cards, none repeats the lead, local thumbnails, links to /videos/', { skip: cachedVideos.length > 1 ? false : 'no videos cached' }, () => {
  for (const [lang, f] of Object.entries(PAGES)) {
    const h = read(f);
    const row = section(h, 'videos');
    const ids = [...row.matchAll(/href="https:\/\/www\.youtube\.com\/(?:watch\?v=|shorts\/)([\w-]+)"/g)].map((m) => m[1]);
    assert.ok(ids.length >= 1 && ids.length <= 4, `${f}: ${ids.length} cards`);
    const leadId = section(h, 'lead').match(/youtube\.com\/(?:watch\?v=|shorts\/)([\w-]+)/)?.[1];
    assert.ok(!ids.includes(leadId), `${f}: lead repeated in row`);
    assert.ok(row.includes(`href="${pre(lang)}/videos/"`), `${f}: link to videos page`);
  }
});

test('Twitch card: click-to-load button and a plain link, no player in the HTML', () => {
  for (const f of Object.values(PAGES)) {
    const tw = section(read(f), 'twitch');
    assert.match(tw, /<button[^>]*data-twitch-load/, f);
    assert.match(tw, /href="https:\/\/www\.twitch\.tv\/galuin"/, f);
    assert.doesNotMatch(tw, /player\.twitch\.tv/, f);
  }
});

test('tools strip links to the tools overview', () => {
  for (const [lang, f] of Object.entries(PAGES)) assert.ok(section(read(f), 'tools').includes(`href="${pre(lang)}/tools/"`), f);
});

// ---- Task 5: hardware, Impressum, privacy ----
const LANG_DIRS = { en: '', de: 'de/', ru: 'ru/' };
const hrefs = (h) => [...h.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
const mainOf = (h) => h.split('<main')[1].split('</main>')[0];

test('hardware, impressum and privacy exist in every language', () => {
  for (const dir of Object.values(LANG_DIRS)) {
    for (const p of ['hardware', 'impressum', 'privacy']) assert.ok(existsSync(join('dist', dir, p, 'index.html')), `${dir}${p}`);
  }
});

test('hardware lists 12 PC items, 3 audio items, the Quest 2 and the 14 original links', () => {
  const ORIGINAL = [
    'https://amzn.eu/d/4hkrHid', 'https://amzn.eu/d/9HwxtbE', 'https://amzn.eu/d/5oOMUjF', 'https://amzn.eu/d/4JcwcsO',
    'https://amzn.eu/d/b3DLYPB', 'https://www.microsoft.com/de-de/d/windows-11-pro/dg7gmgf0d8h4/000P', 'https://amzn.eu/d/deVYJgk',
    'https://amzn.eu/d/3x2ZswV', 'https://www.amazon.com/SteelSeries-QcK-Gaming-Mouse-Black/dp/B000UVRU6G/', 'https://amzn.eu/d/aVYspWD',
    'https://a.co/d/9RJIAvi', 'https://amzn.eu/d/6Mxrhpq', 'https://www.amazon.de/gp/product/B00WGAT56W/', 'https://www.amazon.de/gp/product/B00FFIGZF66/',
  ];
  for (const dir of Object.values(LANG_DIRS)) {
    const h = read(`${dir}hardware/index.html`);
    const links = hrefs(mainOf(h));
    for (const url of ORIGINAL) assert.ok(links.includes(url), `${dir} missing ${url}`);
    assert.equal(ORIGINAL.filter((u) => links.includes(u)).length, 14);
    assert.equal((h.match(/data-hw="pc"/g) ?? []).length, 12, `${dir} pc items`);
    assert.equal((h.match(/data-hw="audio"/g) ?? []).length, 3, `${dir} audio items`);
    assert.match(h, /Meta Quest 2/);
    assert.doesNotMatch(h, /sponsored/, 'not affiliate links');
    assert.match(h, /rel="noopener"/);
  }
});

test('impressum names the owner and the contact address', () => {
  for (const dir of Object.values(LANG_DIRS)) {
    const h = read(`${dir}impressum/index.html`);
    assert.match(h, /Simon Zwenger/);
    assert.match(h, /request@galuin\.com/);
  }
});

test('without CI the placeholder address shows a visible pending line and the page is noindex', () => {
  for (const dir of Object.values(LANG_DIRS)) {
    const h = read(`${dir}impressum/index.html`);
    assert.match(h, /data-address-pending/);
    assert.match(h, /<meta name="robots" content="noindex"/);
    assert.doesNotMatch(mainOf(h), /TODO-ADDRESS/, 'raw sentinel not shown');
  }
});

test('privacy page covers hosting, storage, Twitch click, outbound links, local tools and rights', () => {
  const need = {
    en: [/GitHub Pages/, /localStorage/, /Twitch/, /YouTube/, /Amazon/, /privacy\.github\.com|docs\.github\.com/, /twitch\.tv\/p\/en\/legal\/privacy-notice/],
    de: [/GitHub Pages/, /localStorage/, /Twitch/, /YouTube/, /Amazon/, /Auskunft/, /Beschwerde/],
    ru: [/GitHub Pages/, /localStorage/, /Twitch/, /YouTube/, /Amazon/],
  };
  for (const [lang, dir] of Object.entries(LANG_DIRS)) {
    const h = read(`${dir}privacy/index.html`);
    for (const re of need[lang]) assert.match(h, re, `${lang} ${re}`);
    assert.match(h, /request@galuin\.com/);
    assert.doesNotMatch(h, /affiliate|Partner/i, 'Amazon links are not affiliate links');
  }
});

test('legal pages carry the draft marker as an HTML comment only', () => {
  const h = read('de/privacy/index.html');
  assert.match(h, /<!--\s*DRAFT/);
  assert.doesNotMatch(mainOf(h).replace(/<!--[\s\S]*?-->/g, ''), /DRAFT/);
});

// ---- Task 6: tools overview and QR ----
const pageHtml = () => walk('dist').filter((f) => f.endsWith('.html'));
const jsDir = join('dist', '_astro');
const chunkSrc = (name) => readFileSync(join(jsDir, name), 'utf8');
const closure = (names) => {
  const seen = new Set();
  const todo = [...names];
  while (todo.length) {
    const n = todo.pop();
    if (seen.has(n) || !existsSync(join(jsDir, n))) continue;
    seen.add(n);
    for (const m of chunkSrc(n).matchAll(/["'`]\.\/([^"'`]+\.js)["'`]/g)) todo.push(m[1]);
  }
  return [...seen];
};

test('tools overview and QR page exist in every language and the overview lists the QR tool', () => {
  for (const dir of Object.values(LANG_DIRS)) {
    for (const p of ['tools', 'tools/qr']) assert.ok(existsSync(join('dist', dir, p, 'index.html')), `${dir}${p}`);
    const h = read(`${dir}tools/index.html`);
    assert.ok(hrefs(mainOf(h)).includes(`${pre(dir.replace('/', '') || 'en')}/tools/qr/`), `${dir} links to qr`);
    assert.match(mainOf(h), /device|Gerät|устройств/);
  }
});

test('the QR library is reachable only from the QR pages', () => {
  const marker = (name) => chunkSrc(name).includes('WIFI:T:');
  let qrPages = 0;
  for (const f of pageHtml()) {
    const html = readFileSync(f, 'utf8');
    const entries = [...html.matchAll(/\/_astro\/([^"'`\s]+\.js)/g)].map((m) => m[1]);
    const reachesQr = closure(entries).some(marker);
    const isQrPage = f.split(sep).join('/').endsWith('/tools/qr/index.html');
    assert.equal(reachesQr, isQrPage, f);
    if (isQrPage) qrPages++;
  }
  assert.equal(qrPages, 3);
});
