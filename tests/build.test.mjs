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
// Posts as the content folder has them, so these tests follow new posts instead of pinning today's set.
const POSTS = readdirSync('src/content/posts').map((slug) => {
  const dir = join('src/content/posts', slug);
  const fm = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => readFileSync(join(dir, f), 'utf8').split('---')[1] ?? '');
  return { slug, long: fm.some((m) => /^cover:/m.test(m)), date: fm.map((m) => m.match(/^date:\s*(\S+)/m)?.[1]).find(Boolean) ?? '' };
});
const SLUGS = POSTS.map((p) => p.slug);
const hasLongPost = POSTS.some((p) => p.long);

test('the migrated posts are still there', () => {
  for (const s of ['welcome', 'version-0-1', 'content-page-and-nas', 'nas-build']) assert.ok(SLUGS.includes(s), s);
});

test('blog index exists in every language and lists every post once', () => {
  for (const lang of ['en', 'de', 'ru']) {
    const h = read(join(lang === 'en' ? '' : lang, 'blog', 'index.html'));
    assert.match(h, new RegExp(`<html lang="${lang}"`));
    assert.equal((h.match(/data-post=/g) ?? []).length, SLUGS.length, `${lang}: post count`);
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
  assert.match(h, /aria-current="page"[^>]*>(?:<svg[^>]*>.*?<\/svg>)?Blog</);
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
    assert.match(h, /aria-current="page"[^>]*>(?:<svg[^>]*>.*?<\/svg>)?(Videos|Видео)</);
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
    // A long post takes the lead; without one the newest video does and leaves the row.
    assert.equal(!!section(h, 'lead'), hasLongPost || cachedVideos.length > 0, `lead on ${f}`);
    assert.equal(!!section(h, 'videos'), cachedVideos.length > (hasLongPost ? 0 : 1), `videos row on ${f}`);
    assert.ok(!h.includes('homeSoon') && !/front page in the works/i.test(h), `placeholder left on ${f}`);
    assert.match(h, new RegExp(`<html lang="${lang}"`));
  }
});

test('notes column shows the newest notes in full, at most 5', () => {
  const notes = section(read('index.html'), 'notes');
  const ids = [...notes.matchAll(/data-post="([^"]+)"/g)].map((m) => m[1]);
  const all = POSTS.filter((p) => !p.long);
  assert.equal(ids.length, Math.min(5, all.length), 'notes shown');
  for (const id of ids) assert.ok(all.some((p) => p.slug === id), `${id} is not a note`);
  const newest = all.reduce((a, b) => (b.date > a.date ? b : a));
  assert.ok(all.filter((p) => p.date === newest.date).some((p) => ids.includes(p.slug)), 'newest note missing');
  if (ids.includes('nas-build')) assert.match(notes, /3 × 12/);
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

test('hardware lists 6 PC parts, 6 peripherals, 3 audio items, the Quest 2 and the 12 kept original links', () => {
  const ORIGINAL = [
    'https://amzn.eu/d/4hkrHid', 'https://amzn.eu/d/9HwxtbE', 'https://amzn.eu/d/5oOMUjF', 'https://amzn.eu/d/4JcwcsO',
    'https://amzn.eu/d/b3DLYPB', 'https://www.microsoft.com/de-de/d/windows-11-pro/dg7gmgf0d8h4/000P',
    'https://amzn.eu/d/3x2ZswV', 'https://amzn.eu/d/aVYspWD',
    'https://a.co/d/9RJIAvi', 'https://amzn.eu/d/6Mxrhpq', 'https://www.amazon.de/gp/product/B00WGAT56W/', 'https://www.amazon.de/gp/product/B00FFIGZF66/',
  ];
  for (const dir of Object.values(LANG_DIRS)) {
    const h = read(`${dir}hardware/index.html`);
    const links = hrefs(mainOf(h));
    for (const url of ORIGINAL) assert.ok(links.includes(url), `${dir} missing ${url}`);
    assert.equal(ORIGINAL.filter((u) => links.includes(u)).length, 12);
    assert.ok(links.includes('https://www.mchose.store/products/mchose-a7-v2-series-lightweight-all-round-wireless-gaming-mouse?variant=50834270847271'), `${dir} mchose link`);
    assert.match(h, /MCHOSE A7 V2 Ultra/);
    assert.match(h, /QcK XXL/);
    assert.doesNotMatch(h, /G305|QcK\+/);
    assert.equal((h.match(/data-hw="pc"/g) ?? []).length, 6, `${dir} pc parts`);
    assert.equal((h.match(/data-hw="peripherals"/g) ?? []).length, 6, `${dir} peripherals`);
    assert.equal((h.match(/data-hw="audio"/g) ?? []).length, 3, `${dir} audio items`);
    assert.match(h, /Meta Quest 2/);
    assert.doesNotMatch(h, /sponsored/, 'not affiliate links');
    assert.match(h, /rel="noopener"/);
  }
});

test('hardware desk: every part opens a card, every item is in a card, images and masks exist', () => {
  const ITEMS = 16;
  for (const dir of Object.values(LANG_DIRS)) {
    const h = read(`${dir}hardware/index.html`);
    const parts = [...h.matchAll(/<button[^>]*class="part"[^>]*>/g)].map((m) => m[0]);
    assert.equal(parts.length, 11, `${dir} parts`);
    for (const d of parts) {
      const id = d.match(/aria-controls="([^"]+)"/)?.[1];
      assert.ok(id && h.includes(`id="${id}"`), `${dir} ${d} has a card`);
      assert.match(d, /data-mask="\/hardware\/mask-[\w]+\.webp"/);
    }
    assert.doesNotMatch(h, /class="hs"/, 'no dots drawn on the picture');
    assert.match(h, /data-ids="\/hardware\/hero-ids\.png"/);
    assert.equal((h.match(/data-spot-item/g) ?? []).length, ITEMS, `${dir} items in cards`);
    assert.match(h, /<img[^>]*class="stage-img"[^>]*alt="[^"]{20,}"/, `${dir} hero alt`);
    const files = new Set([...(h.match(/\/hardware\/[\w-]+\.(?:avif|webp|png)/g) ?? [])]);
    assert.ok(files.size > 20, `${dir} refs ${files.size}`);
    for (const src of files) assert.ok(existsSync(join('dist', src)), `${dir} ${src} exists`);
    assert.match(h, /hero-base/);
    assert.match(h, /data-mode="rainbow"/, `${dir} rainbow by default`);
    assert.ok((h.match(/class="glow glow-/g) ?? []).length >= 3, `${dir} rgb layers`);
  }
});

test('hardware desk: a real camera tour (48 frames per part) is wired to every close-up', () => {
  for (const dir of Object.values(LANG_DIRS)) {
    const h = read(`${dir}hardware/index.html`);
    assert.match(h, /<canvas[^>]*class="tour"/, `${dir} tour canvas`);
    assert.match(h, /data-tour="48"/, `${dir} tour length`);
    const shots = new Set([...h.matchAll(/data-shot="([\w]+)"/g)].map((m) => m[1]));
    assert.ok(shots.size >= 9, `${dir} shots ${shots.size}`);
    for (const k of shots) for (let i = 0; i < 48; i++) assert.ok(existsSync(join('dist', 'hardware', `tour-${k}-${String(i).padStart(2, '0')}.webp`)), `${dir} tour-${k}-${i}`);
  }
});

test('impressum names the owner and the contact address', () => {
  for (const dir of Object.values(LANG_DIRS)) {
    const h = read(`${dir}impressum/index.html`);
    assert.match(h, /Simon Zwenger/);
    assert.match(h, /request@galuin\.com/);
  }
});

// legal.ts throws on import under CI while the address is the placeholder; that counts as "no address".
let legalData = { hasAddress: false, legal: { address: [] } };
try { legalData = await import('../src/data/legal.ts'); } catch { /* placeholder under CI */ }

test('Impressum: placeholder shows a pending line and noindex; a real address shows every line and is indexed', () => {
  for (const dir of Object.values(LANG_DIRS)) {
    const h = read(`${dir}impressum/index.html`);
    assert.doesNotMatch(mainOf(h), /TODO-ADDRESS/, 'raw sentinel not shown');
    if (legalData.hasAddress) {
      assert.doesNotMatch(h, /data-address-pending/);
      assert.doesNotMatch(h, /<meta name="robots" content="noindex"/);
      for (const line of legalData.legal.address) assert.ok(mainOf(h).includes(line), `${dir}: ${line}`);
    } else {
      assert.match(h, /data-address-pending/);
      assert.match(h, /<meta name="robots" content="noindex"/);
    }
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

// ---- Task 7: PDF tools ----
test('PDF tool pages exist in every language and the overview links to them', () => {
  for (const dir of Object.values(LANG_DIRS)) {
    assert.ok(existsSync(join('dist', dir, 'tools/pdf/index.html')), `${dir}tools/pdf`);
    assert.ok(hrefs(mainOf(read(`${dir}tools/index.html`))).includes(`${pre(dir.replace('/', '') || 'en')}/tools/pdf/`), `${dir} links to pdf`);
  }
});

test('the PDF libraries are reachable only from the PDF pages', () => {
  const marker = (name) => chunkSrc(name).includes('PDFDocument.load');
  let pdfPages = 0;
  for (const f of pageHtml()) {
    const html = readFileSync(f, 'utf8');
    const entries = [...html.matchAll(/\/_astro\/([^"'`\s]+\.js)/g)].map((m) => m[1]);
    const reaches = closure(entries).some(marker);
    const isPdfPage = f.split(sep).join('/').endsWith('/tools/pdf/index.html');
    assert.equal(reaches, isPdfPage, f);
    if (isPdfPage) pdfPages++;
  }
  assert.equal(pdfPages, 3);
});

test('no built script loads from a CDN, and the pdf.js worker ships with the site', () => {
  const scripts = readdirSync(jsDir).filter((n) => /\.m?js$/.test(n));
  assert.ok(scripts.some((n) => n.includes('pdf.worker')), 'worker file present');
  for (const n of scripts) assert.doesNotMatch(chunkSrc(n), /cdn\.|unpkg|jsdelivr|cdnjs/i, n);
});

// ---- Task 8: image converter ----
test('image converter pages exist in every language; the overview and the tools strip list all three tools', () => {
  for (const [lang, f] of Object.entries(PAGES)) {
    const dir = f.replace(/index\.html$/, '');
    assert.ok(existsSync(join('dist', dir, 'tools/image/index.html')), `${dir}tools/image`);
    const overview = hrefs(mainOf(read(`${dir}tools/index.html`)));
    const strip = hrefs(section(read(f), 'tools'));
    for (const slug of ['qr', 'pdf', 'image']) {
      assert.ok(overview.includes(`${pre(lang)}/tools/${slug}/`), `${lang} overview links to ${slug}`);
      assert.ok(strip.includes(`${pre(lang)}/tools/${slug}/`), `${lang} front-page strip links to ${slug}`);
    }
  }
});

test('PDF presenter pages exist in every language and the overview and the tools strip link to them', () => {
  for (const [lang, f] of Object.entries(PAGES)) {
    const dir = f.replace(/index\.html$/, '');
    const page = join('dist', dir, 'tools/presenter/index.html');
    assert.ok(existsSync(page), `${dir}tools/presenter`);
    assert.match(read(`${dir}tools/presenter/index.html`), /data-presenter/);
    assert.ok(hrefs(mainOf(read(`${dir}tools/index.html`))).includes(`${pre(lang)}/tools/presenter/`), `${lang} overview`);
    assert.ok(hrefs(section(read(f), 'tools')).includes(`${pre(lang)}/tools/presenter/`), `${lang} strip`);
  }
});

// ---- Task 9: deploy workflow ----
test('deploy workflow: triggers, build and test steps, video cache, permissions, keep-alive', () => {
  const wf = readFileSync('.github/workflows/pages.yml', 'utf8');
  for (const re of [
    /^on:[\s\S]*?\n {2}push:\s*\n\s+branches: \[main\]/m,
    /workflow_dispatch:/,
    /schedule:\s*\n\s+- cron: '[^']+'/,
    /npm ci/, /npm run build/, /npm test/,
    /actions\/cache@v\d/,
    /src\/data\/videos\.json/, /public\/thumbs/,
    /CI: true/, /pages: write/, /id-token: write/, /actions: write/,
    /actions\/upload-pages-artifact@v\d/, /actions\/deploy-pages@v\d/,
  ]) assert.match(wf, re);
  // keep-alive: re-enables this workflow so GitHub does not pause the schedule, and only on scheduled runs
  assert.match(wf, /if: github\.event_name == 'schedule'/);
  assert.match(wf, /gh api -X PUT repos\/\$\{\{ github\.repository \}\}\/actions\/workflows\/pages\.yml\/enable/);
});

test('post images become figures that link to the full image, and a lightbox dialog is on every page', () => {
  for (const [lang, pre_] of [['en', ''], ['de', '/de'], ['ru', '/ru']]) {
    const h = read(`${pre_ ? pre_.slice(1) + '/' : ''}blog/llm-benchmark/index.html`);
    assert.match(h, /<figure class="fig"><a href="\/posts\/llm-benchmark\.png" class="zoom"><img /, `figure in ${lang} post`);
    assert.match(h, /<dialog[^>]*class="lightbox"[^>]*>[\s\S]*<button[^>]*aria-label="[^"]+"/, `lightbox dialog in ${lang} post`);
  }
  const shipped = walk('dist').filter((p) => /\.(js|html)$/.test(p)).map((f) => readFileSync(f, 'utf8')).join('\n');
  assert.ok(shipped.includes('showModal'), 'lightbox script ships');
});
