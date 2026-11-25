// Sätteri HAST plugin (Astro's Markdown engine). A paragraph holding only an image becomes
// <figure class="fig"> with a link to the full image (the lightbox script opens it). An italic-only
// paragraph right after it, or an italic line in the same paragraph, becomes the <figcaption>.
// If public/ also holds name.light.ext and name.dark.ext next to name.ext, the figure holds both images and CSS shows
// the one for the current theme (so the theme-switch ink wave reveals the other one).

import { existsSync } from 'node:fs';

const blank = (n) => n.type === 'text' && !n.value.trim();
const isEl = (n, tag) => n?.type === 'element' && n.tagName === tag;
const parts = (p) => p.children.filter((n) => !blank(n));

const PUBLIC = new URL('../../public', import.meta.url);
const onDisk = (src) => existsSync(new URL(`.${src}`, `${PUBLIC.href}/`));

/** The two theme files for a local image, or null when `src` is not a site-rooted path with an extension. */
const variants = (src) => {
  const m = typeof src === 'string' && /^(\/[^?#]*)\.([a-z0-9]+)$/i.exec(src);
  return m ? { light: `${m[1]}.light.${m[2]}`, dark: `${m[1]}.dark.${m[2]}` } : null;
};

/** `exists(path)` says whether a site-rooted file such as /posts/a.dark.png exists; tests pass their own. */
export const makeFiguresPlugin = (exists = onDisk) => ({
  name: 'figures',
  element: {
    filter: ['p'],
    visit(p, ctx) {
      const [first, second, ...rest] = parts(p);
      if (!isEl(first, 'img') || rest.length || (second && !isEl(second, 'em'))) return;

      let caption = second;
      let captionPara;
      if (!second) {
        // Look past blank text for an italic-only paragraph.
        const siblings = ctx.parent(p).children;
        for (let j = ctx.indexOf(p) + 1; j < siblings.length; j++) {
          if (blank(siblings[j])) continue;
          const next = isEl(siblings[j], 'p') ? parts(siblings[j]) : [];
          if (next.length === 1 && isEl(next[0], 'em')) { caption = next[0]; captionPara = siblings[j]; }
          break;
        }
      }

      ctx.setProperty(first, 'loading', 'lazy');
      const v = variants(first.properties.src);
      let link;
      if (v && exists(v.light) && exists(v.dark)) {
        // Both stay in the page (visibility, not display: a hidden lazy image would never load). Dark is the default without JS.
        const img = (cls, src) => ({ type: 'element', tagName: 'img', properties: { ...first.properties, src, loading: 'lazy', className: [cls] }, children: [] });
        link = { type: 'element', tagName: 'a', properties: { href: v.dark, 'data-light-href': v.light, className: ['zoom', 'themed'] }, children: [img('tv-light', v.light), img('tv-dark', v.dark)] };
      } else {
        link = { type: 'element', tagName: 'a', properties: { href: first.properties.src, className: ['zoom'] }, children: [first] };
      }
      const children = [link];
      if (caption) children.push({ type: 'element', tagName: 'figcaption', properties: {}, children: caption.children });
      if (captionPara) ctx.removeNode(captionPara);
      ctx.replaceNode(p, { type: 'element', tagName: 'figure', properties: { className: ['fig'] }, children });
    },
  },
});

export const figuresPlugin = makeFiguresPlugin();
