// Sätteri HAST plugin (Astro's Markdown engine). A paragraph holding only an image becomes
// <figure class="fig"> with a link to the full image (the lightbox script opens it). An italic-only
// paragraph right after it, or an italic line in the same paragraph, becomes the <figcaption>.

const blank = (n) => n.type === 'text' && !n.value.trim();
const isEl = (n, tag) => n?.type === 'element' && n.tagName === tag;
const parts = (p) => p.children.filter((n) => !blank(n));

export const figuresPlugin = {
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
      const link = { type: 'element', tagName: 'a', properties: { href: first.properties.src, className: ['zoom'] }, children: [first] };
      const children = [link];
      if (caption) children.push({ type: 'element', tagName: 'figcaption', properties: {}, children: caption.children });
      if (captionPara) ctx.removeNode(captionPara);
      ctx.replaceNode(p, { type: 'element', tagName: 'figure', properties: { className: ['fig'] }, children });
    },
  },
};
