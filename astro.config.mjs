import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://galuin.com',
  trailingSlash: 'always',
  i18n: { defaultLocale: 'en', locales: ['en', 'de', 'ru'], routing: { prefixDefaultLocale: false } },
});
