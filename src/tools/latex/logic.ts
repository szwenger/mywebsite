import katex from 'katex';

export type Result = { ok: true; html: string } | { ok: false; error: string };

const base = { throwOnError: true, strict: 'ignore', trust: false, maxExpand: 1000, maxSize: 50 } as const;

/** LaTeX math to HTML (with MathML for screen readers). Never throws: a syntax error comes back as text. Links such as \href are refused by KaTeX unless trusted, and we do not trust. */
export function renderLatex(src: string, display: boolean): Result {
  if (!src.trim()) return { ok: true, html: '' };
  try { return { ok: true, html: katex.renderToString(src, { ...base, displayMode: display, output: 'htmlAndMathml' }) }; }
  catch (e) { return { ok: false, error: (e as Error).message.replace(/^KaTeX parse error: /, '') }; }
}

/** Just the MathML element, for pasting into Word, LibreOffice or a web page. Throws on a syntax error. */
export function toMathml(src: string, display: boolean): string {
  const html = katex.renderToString(src, { ...base, displayMode: display, output: 'mathml' });
  const m = /<math[\s\S]*<\/math>/.exec(html);
  return m ? m[0] : '';
}

/** Insertable snippets for the chips. `$` marks where the cursor goes. */
export const SNIPPETS: { label: string; tex: string }[] = [
  { label: 'a/b', tex: '\\frac{$}{}' },
  { label: '√', tex: '\\sqrt{$}' },
  { label: 'xⁿ', tex: '^{$}' },
  { label: 'xₙ', tex: '_{$}' },
  { label: 'Σ', tex: '\\sum_{i=1}^{n} $' },
  { label: '∫', tex: '\\int_{a}^{b} $ \\, dx' },
  { label: 'lim', tex: '\\lim_{x \\to \\infty} $' },
  { label: '( )', tex: '\\left( $ \\right)' },
  { label: '[ ]', tex: '\\begin{bmatrix} $ & \\\\ & \\end{bmatrix}' },
  { label: 'α β', tex: '\\alpha \\beta \\gamma$' },
  { label: '≤ ≠ ≈', tex: '\\le \\ne \\approx$' },
  { label: '→ ⇒', tex: '\\to \\Rightarrow$' },
];

/** Puts a snippet into `text` replacing the selection; the selected text goes where `$` is. Returns the new text and the cursor position. */
export function insertSnippet(text: string, start: number, end: number, snippet: string): { text: string; cursor: number } {
  const at = snippet.indexOf('$');
  const body = at < 0 ? snippet : snippet.slice(0, at) + text.slice(start, end) + snippet.slice(at + 1);
  const cursor = at < 0 ? start + snippet.length : start + at + (end - start);
  return { text: text.slice(0, start) + body + text.slice(end), cursor };
}
