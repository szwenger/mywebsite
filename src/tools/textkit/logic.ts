/** Text statistics and one-click transformations (case, slugs, line tools). */
export interface Stats { chars: number; noSpaces: number; words: number; lines: number; paragraphs: number; sentences: number; bytes: number; readMin: number }

const seg = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;

export function stats(text: string): Stats {
  const words = seg ? [...seg.segment(text)].filter((x) => x.isWordLike).length : (text.match(/\S+/g) ?? []).length;
  return {
    chars: [...text].length,
    noSpaces: [...text.replace(/\s/g, '')].length,
    words,
    lines: text ? text.split(/\r?\n/).length : 0,
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
    sentences: (text.match(/[^.!?…]+[.!?…]+(?=\s|$)|[^.!?…\s][^.!?…]*$/g) ?? []).filter((x) => /\p{L}|\p{N}/u.test(x)).length,
    bytes: new TextEncoder().encode(text).length,
    readMin: words / 200,
  };
}

const parts = (s: string): string[] => s.replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
const lines = (fn: (l: string[]) => string[]) => (s: string): string => fn(s.split(/\r?\n/)).join('\n');
const collate = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const RU: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };

export function slug(s: string): string {
  return s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[а-яё]/g, (c) => RU[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const transforms: Record<string, (s: string) => string> = {
  upper: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  title: (s) => s.toLowerCase().replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()),
  sentence: (s) => s.toLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()),
  camel: (s) => parts(s).map((w, i) => (i ? cap(w) : w.toLowerCase())).join(''),
  pascal: (s) => parts(s).map(cap).join(''),
  snake: (s) => parts(s).join('_').toLowerCase(),
  kebab: (s) => parts(s).join('-').toLowerCase(),
  constant: (s) => parts(s).join('_').toUpperCase(),
  slug,
  sortAsc: lines((l) => [...l].sort(collate.compare)),
  sortDesc: lines((l) => [...l].sort((a, b) => collate.compare(b, a))),
  unique: lines((l) => [...new Set(l)]),
  reverse: lines((l) => [...l].reverse()),
  trim: lines((l) => l.map((x) => x.trim())),
  noEmpty: lines((l) => l.filter((x) => x.trim())),
  oneSpace: (s) => s.replace(/[ \t]+/g, ' '),
};
