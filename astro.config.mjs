import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { figuresPlugin } from './src/lib/figures.mjs';

export default defineConfig({
  site: 'https://galuin.com',
  trailingSlash: 'always',
  // The old stand-alone PDF to images page lives on as the convert tab of the PDF tools.
  redirects: { '/tools/pdf2img/': '/tools/pdf/#convert', '/de/tools/pdf2img/': '/de/tools/pdf/#convert', '/ru/tools/pdf2img/': '/ru/tools/pdf/#convert',
    '/tools/palette/': '/tools/color/#photo', '/de/tools/palette/': '/de/tools/color/#photo', '/ru/tools/palette/': '/ru/tools/color/#photo',
    '/tools/barcode/': '/tools/qr/#barcode', '/de/tools/barcode/': '/de/tools/qr/#barcode', '/ru/tools/barcode/': '/ru/tools/qr/#barcode' },
  build: { inlineStylesheets: 'always' }, // no render-blocking CSS requests; the sheets are a few KB
  markdown: { processor: satteri({ hastPlugins: [figuresPlugin] }) },
  i18n: { defaultLocale: 'en', locales: ['en', 'de', 'ru'], routing: { prefixDefaultLocale: false } },
});
