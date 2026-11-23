import { Marked } from 'marked';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Links may point at web pages, mail, anchors or relative paths; images may also be small data: pictures. Everything else (javascript:, vbscript:, other data:) is replaced by '#'. */
export function safeUrl(href: string, image = false): string {
  // Browsers ignore control characters and spaces inside the scheme, so strip them before looking.
  const flat = href.replace(/[\u0000- \u007f-\u009f]/g, '');
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(flat);
  if (!m) return href;
  const scheme = m[1].toLowerCase();
  if (scheme === 'http' || scheme === 'https' || scheme === 'mailto') return href;
  if (image && /^data:image\/(png|jpe?g|gif|webp);/i.test(flat)) return href;
  return '#';
}

const md = new Marked({
  gfm: true,
  // Raw HTML in the source is shown as text, never run.
  renderer: { html: (t) => esc(t.text) },
  walkTokens(t) {
    if (t.type === 'link') t.href = safeUrl(t.href);
    else if (t.type === 'image') t.href = safeUrl(t.href, true);
  },
});

/** Markdown to an HTML fragment. Raw HTML is escaped and unsafe link targets are removed, so the result can be inserted into a page. */
export function markdownToHtml(src: string): string {
  return md.parse(src, { async: false });
}

/** A complete, self-contained HTML file around the fragment, with a small readable stylesheet. */
export function htmlDocument(body: string, title: string, lang = 'en'): string {
  const css = 'body{max-width:46rem;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif;color:#1c1c1e}pre,code{font-family:ui-monospace,Consolas,monospace;background:#f2f2f5;border-radius:4px}code{padding:.1em .3em}pre{padding:.8em 1em;overflow:auto}pre code{padding:0}blockquote{margin-left:0;padding-left:1em;border-left:3px solid #ccc;color:#555}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:.3em .6em}img{max-width:100%}';
  return `<!doctype html>\n<html lang="${esc(lang)}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n<style>${css}</style>\n</head>\n<body>\n${body}</body>\n</html>\n`;
}

/** The first heading in the source, for the document title; empty when there is none. */
export function firstHeading(src: string): string {
  const m = /^\s{0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/m.exec(src);
  return m ? m[1].replace(/[*_`[\]]/g, '') : '';
}

/** Words and reading time for the status line. */
export function counts(src: string): { words: number; chars: number } {
  const t = src.trim();
  return { words: t ? t.split(/\s+/).length : 0, chars: src.length };
}
