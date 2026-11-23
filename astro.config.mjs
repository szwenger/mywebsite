import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { figuresPlugin } from './src/lib/figures.mjs';

export default defineConfig({
  site: 'https://galuin.com',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' }, // no render-blocking CSS requests; the sheets are a few KB
  markdown: { processor: satteri({ hastPlugins: [figuresPlugin] }) },
  i18n: { defaultLocale: 'en', locales: ['en', 'de', 'ru'], routing: { prefixDefaultLocale: false } },
});
