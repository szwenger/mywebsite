import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { figuresPlugin } from './src/lib/figures.mjs';

// tesseract.js falls back to cdn.jsdelivr.net when a path option is missing. We always pass local paths, so the fallback is
// rewritten to a dead on-site address: a future mistake then fails loudly instead of silently loading from a CDN.
const NO_CDN = [/https:\/\/cdn\.jsdelivr\.net\/npm\/[^"'`]*/g, '/ocr-missing'];
const ocrNoCdn = () => ({
  name: 'ocr-no-cdn',
  transform(code, id) {
    if (!id.includes('node_modules/tesseract.js/') || !NO_CDN[0].test(code)) return null;
    NO_CDN[0].lastIndex = 0;
    return { code: code.replace(...NO_CDN), map: null };
  },
  generateBundle(_o, bundle) {
    for (const f of Object.values(bundle)) {
      if (f.type !== 'asset' || !/^_astro\/worker\.min\./.test(f.fileName)) continue;
      const text = Buffer.from(f.source).toString('utf8');
      NO_CDN[0].lastIndex = 0;
      if (NO_CDN[0].test(text)) { NO_CDN[0].lastIndex = 0; f.source = text.replace(...NO_CDN); }
    }
  },
});

export default defineConfig({
  site: 'https://galuin.com',
  trailingSlash: 'always',
  // The old stand-alone PDF to images page lives on as the convert tab of the PDF tools.
  // The Hangout page moved into the footer of every page.
  redirects: { '/hangout/': '/#hangout', '/de/hangout/': '/de/#hangout', '/ru/hangout/': '/ru/#hangout',
    '/tools/pdf2img/': '/tools/pdf/#convert', '/de/tools/pdf2img/': '/de/tools/pdf/#convert', '/ru/tools/pdf2img/': '/ru/tools/pdf/#convert',
    '/tools/palette/': '/tools/color/#photo', '/de/tools/palette/': '/de/tools/color/#photo', '/ru/tools/palette/': '/ru/tools/color/#photo',
    '/tools/barcode/': '/tools/qr/#barcode', '/de/tools/barcode/': '/de/tools/qr/#barcode', '/ru/tools/barcode/': '/ru/tools/qr/#barcode' },
  build: { inlineStylesheets: 'always' }, // no render-blocking CSS requests; the sheets are a few KB
  vite: {
    plugins: [ocrNoCdn()],
    // Astro reads the client output from environments.client, not build.rollupOptions. The OCR language files keep their names:
    // tesseract.js builds <folder>/<code>.traineddata.gz itself.
    environments: { client: { build: { rolldownOptions: { output: {
      assetFileNames: (a) => {
        const n = a.names?.[0] ?? '';
        return /\.traineddata\.gz$/.test(n) ? `ocr/${n}` : '_astro/[name].[hash][extname]';
      },
    } } } } },
  },
  markdown: { processor: satteri({ hastPlugins: [figuresPlugin] }) },
  i18n: { defaultLocale: 'en', locales: ['en', 'de', 'ru'], routing: { prefixDefaultLocale: false } },
});
