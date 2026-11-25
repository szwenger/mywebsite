// Renders a figure spec to PNG (and a 1280 x 720 WebP cover) with the installed Chrome or Edge, headless. No extra dependencies.
//   node scripts/figures/render.mjs scripts/figures/specs/llm-benchmark.json --out public/posts/llm-benchmark.png --cover public/posts/llm-benchmark-cover.webp
//   --theme light | dark | both   (default both: writes <name>.light.png and <name>.dark.png, same layout, for the light/dark aware posts)
//   --out name.jpg                photo grids as JPEG, everything with text as PNG
//   --svg <file>                  schema specs only: write the inline SVG block for the post (follows the site theme by itself)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { build, schemaSvg, themeNames } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

function arg(name) { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; }
function chrome() {
  const c = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  const hit = c.find((p) => p && fs.existsSync(p));
  if (!hit) throw new Error('no Chrome or Edge found; set the CHROME environment variable');
  return hit;
}
const withTheme = (file, theme, both) => (both ? file.replace(/(\.[a-z]+)$/i, `.${theme}$1`) : file);

const specFile = process.argv[2];
if (!specFile || specFile.startsWith('--')) { console.error('usage: node scripts/figures/render.mjs <spec.json> [--out file.png] [--cover file.webp] [--theme light|dark|both] [--svg file.html]'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const specDir = path.dirname(path.resolve(specFile));
if (spec.type === 'grid') spec.images = spec.images.map((row) => row.map((p) => (/^(https?|file):/.test(p) ? p : pathToFileURL(path.resolve(specDir, p)).href)));

if (arg('svg')) {
  if (spec.type !== 'schema') throw new Error('--svg only applies to schema specs');
  fs.writeFileSync(arg('svg'), schemaSvg(spec) + '\n');
  console.log('wrote', arg('svg'));
}

const out = arg('out'), cover = arg('cover'), themeArg = arg('theme') ?? 'both';
if (out || cover) {
  const themes = themeArg === 'both' ? themeNames : [themeArg], both = themeArg === 'both';
  const fonts = { display: pathToFileURL(path.join(root, 'node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2')).href, sans: pathToFileURL(path.join(root, 'node_modules/@fontsource-variable/onest/files/onest-latin-wght-normal.woff2')).href };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-'));
  for (const theme of themes) {
    const html = build(spec, fonts, theme);
    const [, w, h] = /width:(\d+)px;height:(\d+)px/.exec(html);
    const htmlFile = path.join(tmp, `${theme}.html`), png = path.join(tmp, `${theme}.png`);
    fs.writeFileSync(htmlFile, html);
    const r = spawnSync(chrome(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${path.join(tmp, 'profile')}`, `--window-size=${w},${h}`, `--screenshot=${png}`, '--virtual-time-budget=4000', pathToFileURL(htmlFile).href], { encoding: 'utf8' });
    if (!fs.existsSync(png)) throw new Error(`Chrome produced no screenshot: ${r.stderr || r.error}`);
    const m = await sharp(png).metadata();
    if (m.width !== +w || m.height !== +h) throw new Error(`screenshot is ${m.width}x${m.height}, expected ${w}x${h}`);
    if (out) { const f = withTheme(out, theme, both); const jpg = /.jpe?g$/i.test(f); await (jpg ? sharp(png).jpeg({ quality: 85, mozjpeg: true }) : sharp(png).png({ compressionLevel: 9 })).toFile(f); console.log('wrote', f, fs.statSync(f).size, 'bytes'); }
    if (cover) { const f = withTheme(cover, theme, both); await sharp(png).resize(1280, 720, { fit: 'cover' }).webp({ quality: 80 }).toFile(f); console.log('wrote', f, fs.statSync(f).size, 'bytes'); }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
