import css from 'katex/dist/katex.min.css?inline';

export type Look = { color: string; bg: string | null };

const b64 = (buf: ArrayBuffer): string => {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const weight = (w: string): string => (w === 'bold' || w === 'bolder' || Number(w) >= 600 ? '700' : '400');
const FACE = /@font-face\s*\{[^}]*\}/g;

/** The KaTeX stylesheet with only the fonts this formula uses, embedded as data, so the file stands alone. */
async function standaloneCss(used: Set<string>): Promise<string> {
  let out = css.replace(FACE, '');
  for (const face of css.match(FACE) ?? []) {
    const fam = /font-family:\s*["']?([^;"'}]+)/.exec(face)?.[1]?.trim();
    const w = weight(/font-weight:\s*(\w+)/.exec(face)?.[1] ?? '400');
    const st = /font-style:\s*(\w+)/.exec(face)?.[1] ?? 'normal';
    const url = /url\(["']?([^"')]+?\.woff2[^"')]*)["']?\)/.exec(face)?.[1];
    if (!fam || !url || !used.has(`${fam}|${w}|${st}`)) continue;
    const buf = await (await fetch(url)).arrayBuffer();
    out += `@font-face{font-family:${fam};font-weight:${w};font-style:${st};src:url(data:font/woff2;base64,${b64(buf)}) format("woff2")}`;
  }
  return out;
}

/** The formula currently shown in `view` as a self-contained SVG (HTML inside foreignObject, fonts embedded). Null when nothing is shown. */
export async function formulaSvg(view: HTMLElement, look: Look): Promise<{ svg: string; w: number; h: number } | null> {
  const el = view.querySelector<HTMLElement>('.katex');
  const box = el?.querySelector<HTMLElement>('.katex-html');
  if (!el || !box) return null;
  const used = new Set<string>();
  for (const n of [el, ...el.querySelectorAll<HTMLElement>('*')]) {
    const c = getComputedStyle(n);
    const fam = c.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (fam.startsWith('KaTeX')) used.add(`${fam}|${weight(c.fontWeight)}|${c.fontStyle === 'italic' ? 'italic' : 'normal'}`);
  }
  const r = box.getBoundingClientRect();
  const pad = 8, w = Math.ceil(r.width) + 2, h = Math.ceil(r.height) + 2, W = w + 2 * pad, H = h + 2 * pad;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelector('.katex-mathml')?.remove();
  const inner = new XMLSerializer().serializeToString(clone);
  const bg = look.bg ? `<rect width="${W}" height="${H}" fill="${look.bg}"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style><![CDATA[${await standaloneCss(used)}]]></style>${bg}<foreignObject x="${pad}" y="${pad}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;font-size:${getComputedStyle(view).fontSize};color:${look.color}">${inner}</div></foreignObject></svg>`;
  return { svg, w: W, h: H };
}
