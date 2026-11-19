import type { Lang } from '../i18n/ui';

/** One entry per tool page at /tools/<slug>/. `icon` is SVG path data on a 24×24 viewBox, drawn with currentColor. */
export interface Tool { slug: string; icon: string; name: Record<Lang, string>; blurb: Record<Lang, string> }

export const tools: Tool[] = [];
