import { LANGS, type Lang } from './ui';

/** `getStaticPaths` for a tool page: one path per language, English without a prefix. */
export const toolPaths = () => LANGS.map((l) => ({ params: { lang: l === 'en' ? undefined : l } }));

/** The page language from `Astro.params`. */
export const langOf = (params: { lang?: string }): Lang => (params.lang ?? 'en') as Lang;
