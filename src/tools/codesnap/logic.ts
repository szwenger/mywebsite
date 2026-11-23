import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dart from 'highlight.js/lib/languages/dart';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import elixir from 'highlight.js/lib/languages/elixir';
import go from 'highlight.js/lib/languages/go';
import haskell from 'highlight.js/lib/languages/haskell';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import lua from 'highlight.js/lib/languages/lua';
import markdown from 'highlight.js/lib/languages/markdown';
import perl from 'highlight.js/lib/languages/perl';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import r from 'highlight.js/lib/languages/r';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import scala from 'highlight.js/lib/languages/scala';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

/** Languages offered in the picker: [highlight.js id, display name, module]. */
const REG: [string, string, Parameters<typeof hljs.registerLanguage>[1]][] = [
  ['bash', 'Shell / Bash', bash], ['c', 'C', c], ['cpp', 'C++', cpp], ['csharp', 'C#', csharp], ['css', 'CSS', css], ['dart', 'Dart', dart],
  ['diff', 'Diff', diff], ['dockerfile', 'Dockerfile', dockerfile], ['elixir', 'Elixir', elixir], ['go', 'Go', go], ['haskell', 'Haskell', haskell],
  ['xml', 'HTML / XML', xml], ['ini', 'INI / TOML', ini], ['java', 'Java', java], ['javascript', 'JavaScript', javascript], ['json', 'JSON', json],
  ['kotlin', 'Kotlin', kotlin], ['lua', 'Lua', lua], ['markdown', 'Markdown', markdown], ['perl', 'Perl', perl], ['php', 'PHP', php],
  ['plaintext', 'Plain text', plaintext], ['powershell', 'PowerShell', powershell], ['python', 'Python', python], ['r', 'R', r], ['ruby', 'Ruby', ruby],
  ['rust', 'Rust', rust], ['scala', 'Scala', scala], ['scss', 'SCSS', scss], ['sql', 'SQL', sql], ['swift', 'Swift', swift],
  ['typescript', 'TypeScript', typescript], ['yaml', 'YAML', yaml],
];
for (const [id, , mod] of REG) hljs.registerLanguage(id, mod);
export const LANGS: { id: string; name: string }[] = REG.map(([id, name]) => ({ id, name }));
const AUTO = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'bash', 'sql', 'json', 'yaml', 'xml', 'css', 'markdown', 'kotlin', 'swift'];

// ---------------------------------------------------------------- tokens

export type Tok = { t: string; c: string };
const ENT: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#x27;': "'", '&#39;': "'" };
const decode = (s: string) => s.replace(/&(?:lt|gt|amp|quot|#x27|#39);/g, (m) => ENT[m]);

/** Maps a highlight.js class list such as `title function_` to one of our colour categories. */
export function category(cls: string): string {
  const w = cls.replace(/hljs-/g, '').split(/\s+/);
  if (w.includes('function_')) return 'title';
  if (w.includes('class_')) return 'type';
  if (w.includes('language_')) return 'keyword';
  const k = w[0];
  if (k === 'comment' || k === 'doctag' || k === 'quote') return 'comment';
  if (k === 'keyword' || k === 'selector-pseudo' || k === 'meta-keyword') return 'keyword';
  if (k === 'string' || k === 'regexp' || k === 'template-tag' || k === 'char') return 'string';
  if (k === 'number' || k === 'literal' || k === 'symbol' || k === 'bullet') return 'number';
  if (k === 'built_in') return 'builtin';
  if (k === 'type' || k === 'selector-class' || k === 'selector-id' || k === 'selector-tag') return 'type';
  if (k === 'title' || k === 'section') return 'title';
  if (k === 'attr' || k === 'attribute' || k === 'property' || k === 'variable' || k === 'template-variable' || k === 'link') return 'attr';
  if (k === 'tag' || k === 'name') return 'tag';
  if (k === 'meta' || k === 'meta-string') return 'meta';
  if (k === 'operator' || k === 'punctuation') return 'punct';
  if (k === 'addition') return 'add';
  if (k === 'deletion') return 'del';
  return 'fg';
}

/** Cuts the highlight.js HTML into lines of coloured pieces. */
function toLines(html: string): Tok[][] {
  const lines: Tok[][] = [[]];
  const stack: string[] = [];
  for (const m of html.matchAll(/<span class="([^"]*)">|<\/span>|([^<]+)/g)) {
    if (m[1] !== undefined) { stack.push(category(m[1])); continue; }
    if (m[0] === '</span>') { stack.pop(); continue; }
    const cat = stack.length ? stack[stack.length - 1] : 'fg';
    decode(m[2]).split('\n').forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ t: part, c: cat });
    });
  }
  return lines;
}

/** Tabs to spaces by column, line ends unified, trailing blank lines dropped. */
export function prepare(code: string, tab = 2): string {
  return code.replace(/\r\n?/g, '\n').split('\n').map((l) => {
    let out = '';
    for (const ch of l) out += ch === '\t' ? ' '.repeat(tab - (out.length % tab)) : ch;
    return out.replace(/\s+$/, '');
  }).join('\n').replace(/\n+$/, '');
}

/** The code as coloured lines, with the language that was used. `lang` may be 'auto'. */
export function tokenize(code: string, lang: string): { lines: Tok[][]; lang: string } {
  if (!code) return { lines: [[]], lang: lang === 'auto' ? 'plaintext' : lang };
  let used = lang, html = '';
  if (lang === 'auto') {
    const r = hljs.highlightAuto(code, AUTO);
    used = r.language ?? 'plaintext';
    html = r.value;
  } else if (lang !== 'plaintext' && hljs.getLanguage(lang)) html = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  else { used = 'plaintext'; html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  return { lines: toLines(html), lang: used };
}

// ---------------------------------------------------------------- themes

export interface Theme { id: string; name: string; bg: string; fg: string; dark: boolean; comment: string; keyword: string; string: string; number: string; builtin: string; type: string; title: string; attr: string; tag: string; punct: string; meta: string }

export const THEMES: Theme[] = [
  { id: 'night', name: 'Night', dark: true, bg: '#1a1b26', fg: '#c0caf5', comment: '#565f89', keyword: '#bb9af7', string: '#9ece6a', number: '#ff9e64', builtin: '#7dcfff', type: '#2ac3de', title: '#7aa2f7', attr: '#e0af68', tag: '#f7768e', punct: '#89ddff', meta: '#e0af68' },
  { id: 'dracula', name: 'Vampire', dark: true, bg: '#282a36', fg: '#f8f8f2', comment: '#6272a4', keyword: '#ff79c6', string: '#f1fa8c', number: '#bd93f9', builtin: '#8be9fd', type: '#8be9fd', title: '#50fa7b', attr: '#50fa7b', tag: '#ff79c6', punct: '#f8f8f2', meta: '#ffb86c' },
  { id: 'onedark', name: 'One Dark', dark: true, bg: '#282c34', fg: '#abb2bf', comment: '#5c6370', keyword: '#c678dd', string: '#98c379', number: '#d19a66', builtin: '#e6c07b', type: '#e6c07b', title: '#61afef', attr: '#d19a66', tag: '#e06c75', punct: '#abb2bf', meta: '#61afef' },
  { id: 'monokai', name: 'Monokai', dark: true, bg: '#272822', fg: '#f8f8f2', comment: '#75715e', keyword: '#f92672', string: '#e6db74', number: '#ae81ff', builtin: '#66d9ef', type: '#66d9ef', title: '#a6e22e', attr: '#a6e22e', tag: '#f92672', punct: '#f8f8f2', meta: '#fd971f' },
  { id: 'nord', name: 'Nord', dark: true, bg: '#2e3440', fg: '#d8dee9', comment: '#616e88', keyword: '#81a1c1', string: '#a3be8c', number: '#b48ead', builtin: '#88c0d0', type: '#8fbcbb', title: '#88c0d0', attr: '#8fbcbb', tag: '#81a1c1', punct: '#eceff4', meta: '#d08770' },
  { id: 'mocha', name: 'Mocha', dark: true, bg: '#1e1e2e', fg: '#cdd6f4', comment: '#6c7086', keyword: '#cba6f7', string: '#a6e3a1', number: '#fab387', builtin: '#89dceb', type: '#f9e2af', title: '#89b4fa', attr: '#f9e2af', tag: '#f38ba8', punct: '#9399b2', meta: '#f5c2e7' },
  { id: 'soldark', name: 'Solar dark', dark: true, bg: '#002b36', fg: '#93a1a1', comment: '#586e75', keyword: '#859900', string: '#2aa198', number: '#d33682', builtin: '#268bd2', type: '#b58900', title: '#268bd2', attr: '#b58900', tag: '#268bd2', punct: '#93a1a1', meta: '#cb4b16' },
  { id: 'github', name: 'Paper', dark: false, bg: '#ffffff', fg: '#24292f', comment: '#6e7781', keyword: '#cf222e', string: '#0a3069', number: '#0550ae', builtin: '#953800', type: '#953800', title: '#8250df', attr: '#0550ae', tag: '#116329', punct: '#24292f', meta: '#8250df' },
  { id: 'sollight', name: 'Solar light', dark: false, bg: '#fdf6e3', fg: '#657b83', comment: '#93a1a1', keyword: '#859900', string: '#2aa198', number: '#d33682', builtin: '#268bd2', type: '#b58900', title: '#268bd2', attr: '#b58900', tag: '#268bd2', punct: '#657b83', meta: '#cb4b16' },
  { id: 'atomlight', name: 'Daylight', dark: false, bg: '#fafafa', fg: '#383a42', comment: '#a0a1a7', keyword: '#a626a4', string: '#50a14f', number: '#986801', builtin: '#c18401', type: '#c18401', title: '#4078f2', attr: '#986801', tag: '#e45649', punct: '#383a42', meta: '#4078f2' },
];

const ADD = '#3fb950', DEL = '#f85149';
const colorOf = (th: Theme, cat: string): string => (cat === 'add' ? ADD : cat === 'del' ? DEL : cat === 'fg' ? th.fg : (th as unknown as Record<string, string>)[cat] ?? th.fg);

// ---------------------------------------------------------------- line marks

export type Mark = 'mark' | 'add' | 'del';

/** "2, +4-6, -8" to a map from line number to mark: plain numbers highlight, + adds, - removes. */
export function parseLines(spec: string): Map<number, Mark> {
  const out = new Map<number, Mark>();
  for (const part of spec.split(/[,;\s]+/)) {
    const m = /^([+-]?)(\d{1,5})(?:-(\d{1,5}))?$/.exec(part);
    if (!m) continue;
    const kind: Mark = m[1] === '+' ? 'add' : m[1] === '-' ? 'del' : 'mark';
    const a = Number(m[2]), b = m[3] ? Number(m[3]) : a;
    for (let n = Math.min(a, b); n <= Math.max(a, b) && n - Math.min(a, b) < 2000; n++) out.set(n, kind);
  }
  return out;
}

// ---------------------------------------------------------------- the picture

export interface Opts {
  code: string; lang: string; theme: string;
  bgMode: 'gradient' | 'solid' | 'none'; c1: string; c2: string; angle: number;
  padding: number; frame: 'mac' | 'win' | 'none'; title: string;
  lineNumbers: boolean; start: number; fontSize: number; radius: number; shadow: boolean;
  marks: string; others: 'normal' | 'dim' | 'blur'; tab: number; minWidth: number; watermark: string;
}
export const DEFAULTS: Opts = {
  code: '', lang: 'auto', theme: 'night', bgMode: 'gradient', c1: '#8e44ad', c2: '#3498db', angle: 135, padding: 48, frame: 'mac', title: '',
  lineNumbers: false, start: 1, fontSize: 15, radius: 12, shadow: true, marks: '', others: 'normal', tab: 2, minWidth: 0, watermark: '',
};

const FONT = "'JetBrains Mono','Cascadia Code','Fira Code',Consolas,Menlo,'DejaVu Sans Mono','Liberation Mono',monospace";
const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex = (s: string, fb: string) => (/^#[0-9a-f]{3,8}$/i.test(s) ? s : fb);

/** Display width of one character in monospace cells: CJK, full-width forms and emoji take two. */
export function cells(ch: string): number {
  const cp = ch.codePointAt(0)!;
  return (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe6f) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff) ? 2 : 1;
}
const width = (s: string) => { let n = 0; for (const ch of s) n += cells(ch); return n; };

/** The finished picture as an SVG string and its size in pixels. Text is placed on a fixed grid, so it looks the same in whatever monospace font the viewer has. */
export function renderSnap(o: Opts): { svg: string; w: number; h: number; lang: string; lines: number } {
  const th = THEMES.find((t) => t.id === o.theme) ?? THEMES[0];
  const { lines, lang } = tokenize(prepare(o.code, o.tab), o.lang);
  const fs = Math.min(40, Math.max(8, o.fontSize)), cw = fs * 0.6, lh = Math.round(fs * 1.6);
  const marks = parseLines(o.marks);
  const n = lines.length, last = o.start + n - 1;
  const gutter = o.lineNumbers ? String(last).length * cw + 22 : 0;
  const maxCells = Math.max(1, ...lines.map((l) => l.reduce((a, t) => a + width(t.t), 0)));
  const padX = 24, padY = 20, head = o.frame === 'none' ? 0 : 44, foot = o.watermark ? 28 : 0;
  const winW = Math.ceil(Math.max(gutter + maxCells * cw + padX * 2, o.minWidth, o.frame === 'none' ? 0 : 280));
  const winH = Math.ceil(head + padY * 2 + n * lh + foot);
  const pad = Math.max(0, Math.min(200, o.padding));
  const W = winW + pad * 2, H = winH + pad * 2;
  const r = Math.max(0, Math.min(40, o.radius));
  const c1 = hex(o.c1, '#8e44ad'), c2 = hex(o.c2, '#3498db');
  const a = (o.angle * Math.PI) / 180;
  const gx = Math.sin(a) / 2, gy = -Math.cos(a) / 2;
  const muted = th.comment;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  out.push('<defs>');
  if (o.bgMode === 'gradient') out.push(`<linearGradient id="bg" x1="${0.5 - gx}" y1="${0.5 - gy}" x2="${0.5 + gx}" y2="${0.5 + gy}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`);
  if (o.shadow) out.push('<filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.45"/></filter>');
  if (o.others === 'blur') out.push('<filter id="bl" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>');
  out.push(`<clipPath id="win"><rect width="${winW}" height="${winH}" rx="${r}"/></clipPath>`);
  out.push('</defs>');
  if (o.bgMode === 'gradient') out.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  else if (o.bgMode === 'solid') out.push(`<rect width="${W}" height="${H}" fill="${c1}"/>`);
  out.push(`<g transform="translate(${pad} ${pad})">`);
  out.push(`<rect width="${winW}" height="${winH}" rx="${r}" fill="${th.bg}"${o.shadow ? ' filter="url(#sh)"' : ''}/>`);
  out.push('<g clip-path="url(#win)">');
  if (head) {
    out.push(`<rect width="${winW}" height="${head}" fill="${th.dark ? '#ffffff' : '#000000'}" fill-opacity="0.05"/>`);
    if (o.frame === 'mac') {
      ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => out.push(`<circle cx="${22 + i * 20}" cy="${head / 2}" r="6" fill="${col}"/>`));
      if (o.title) out.push(`<text x="${winW / 2}" y="${head / 2 + 4.5}" text-anchor="middle" font-family="${SANS}" font-size="13" fill="${muted}">${esc(o.title)}</text>`);
    } else {
      if (o.title) out.push(`<text x="18" y="${head / 2 + 4.5}" font-family="${SANS}" font-size="13" fill="${muted}">${esc(o.title)}</text>`);
      const y = head / 2, x = winW - 20;
      out.push(`<g stroke="${muted}" stroke-width="1.4" fill="none"><path d="M${x - 92} ${y}h10"/><rect x="${x - 55}" y="${y - 5}" width="10" height="10"/><path d="M${x - 14} ${y - 5}l10 10M${x - 4} ${y - 5}l-10 10"/></g>`);
    }
  }
  const top = head + padY;
  lines.forEach((_, i) => {
    const m = marks.get(o.start + i);
    if (!m) return;
    const y = top + i * lh;
    const fill = m === 'add' ? ADD : m === 'del' ? DEL : th.dark ? '#ffffff' : '#000000';
    out.push(`<rect y="${y}" width="${winW}" height="${lh}" fill="${fill}" fill-opacity="${m === 'mark' ? 0.1 : 0.18}"/>`);
    if (m !== 'mark') out.push(`<rect y="${y}" width="3" height="${lh}" fill="${fill}"/>`);
  });
  lines.forEach((toks, i) => {
    const num = o.start + i;
    const y = top + i * lh + lh / 2 + fs * 0.33;
    const focus = marks.size > 0 && o.others !== 'normal' && !marks.has(num);
    const attr = focus ? (o.others === 'dim' ? ' opacity="0.38"' : ' filter="url(#bl)"') : '';
    const parts: string[] = [];
    if (o.lineNumbers) parts.push(`<tspan x="${padX + gutter - 22}" text-anchor="end" fill="${muted}" fill-opacity="0.8">${num}</tspan>`);
    let x = padX + gutter;
    for (const t of toks) {
      const len = width(t.t) * cw;
      if (t.t.trim()) parts.push(`<tspan x="${+x.toFixed(2)}" fill="${colorOf(th, t.c)}" textLength="${+len.toFixed(2)}" lengthAdjust="spacing">${esc(t.t)}</tspan>`);
      x += len;
    }
    if (parts.length) out.push(`<text y="${+y.toFixed(2)}" font-family="${FONT}" font-size="${fs}" xml:space="preserve"${attr}>${parts.join('')}</text>`);
  });
  if (o.watermark) out.push(`<text x="${winW - padX}" y="${winH - 12}" text-anchor="end" font-family="${SANS}" font-size="12" fill="${muted}" fill-opacity="0.9">${esc(o.watermark)}</text>`);
  out.push('</g></g></svg>');
  return { svg: out.join(''), w: W, h: H, lang, lines: n };
}
