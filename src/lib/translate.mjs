// Translates a post's Markdown with any chat model. Pure logic: the caller supplies `complete(messages) => string`.
// Code, inline code and URLs are swapped for @@N@@ placeholders so the model never sees (or rewrites) them.

const LANG_NAME = { de: 'German', ru: 'Russian' };
const REVIEW_NOTE = '# machine-translated draft: review it, then delete this line';

/** Splits a post file into front matter lines and body. */
export function splitPost(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('post has no front matter');
  return { front: m[1].split('\n'), body: m[2] };
}

/** Hides code and URLs behind @@N@@ tokens. */
export function protect(body) {
  const slots = [];
  const hide = (s) => `@@${slots.push(s) - 1}@@`;
  const text = body
    .replace(/^```[\s\S]*?^```/gm, hide)
    .replace(/`[^`\n]+`/g, hide)
    .replace(/\]\(([^)\s]+)\)/g, (_, url) => `](${hide(url)})`)
    .replace(/https?:\/\/[^\s)>\]]+/g, hide);
  return { text, slots };
}

/** Puts the hidden pieces back. Throws if the model dropped, duplicated into nothing, or invented a token. */
export function restore(text, slots) {
  const seen = new Set();
  const out = text.replace(/@@(\d+)@@/g, (_, n) => {
    if (!(+n < slots.length)) throw new Error(`unknown placeholder @@${n}@@ in the model's reply`);
    seen.add(+n);
    return slots[+n];
  });
  if (seen.size !== slots.length) throw new Error(`model dropped a placeholder (${slots.length - seen.size} of ${slots.length} missing)`);
  return out;
}

/** Groups blank-line separated blocks into pieces of at most `max` characters (a longer block stays whole). */
export function chunk(text, max) {
  const parts = [];
  let cur = '';
  for (const block of text.split('\n\n')) {
    if (cur && cur.length + 2 + block.length > max) { parts.push(cur); cur = block; }
    else cur = cur ? `${cur}\n\n${block}` : block;
  }
  parts.push(cur);
  return parts;
}

/** Removes reasoning blocks and a code fence wrapped around the whole reply. */
export function cleanReply(reply) {
  const t = reply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const fenced = t.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/);
  return fenced ? fenced[1].trim() : t;
}

/** Replaces the title line of the front matter. Other lines stay as they are. */
export function withTitle(front, title) {
  return front.map((l) => (/^title:/.test(l) ? `title: ${JSON.stringify(title.replace(/\s+/g, ' ').trim())}` : l));
}

export function buildMessages(text, lang, keep, isTitle = false) {
  const system = [
    `You translate blog posts from English to ${LANG_NAME[lang]}. The author writes in the first person, in a plain, friendly, informal voice.`,
    isTitle ? 'The text is only a headline. Translate that one line. Never write the article.' : 'Translate every sentence. Add nothing, drop nothing, and keep negations and numbers exactly.',
    'Rules:',
    '- Keep all Markdown structure exactly: headings, lists, bold, blank lines.',
    '- Tokens like @@3@@ are placeholders. Copy each one unchanged, in the right place.',
    keep.length ? `- Leave these terms in English: ${keep.join(', ')}.` : '',
    '- Keep numbers, units and product or model names as they are.',
    '- Output only the translation, with no notes and no code fence around it.',
  ].filter(Boolean).join('\n');
  return [{ role: 'system', content: system }, { role: 'user', content: text }];
}

function readTitle(front) {
  const line = front.find((l) => /^title:/.test(l));
  if (!line) throw new Error('post has no title');
  const raw = line.replace(/^title:\s*/, '');
  if (raw.startsWith('"')) return JSON.parse(raw);
  return raw.replace(/^'(.*)'$/, '$1');
}

/** Returns the translated post file as text. */
export async function translatePost({ source, lang, keep = [], complete, maxChars = 3500 }) {
  const { front, body } = splitPost(source);
  const ask = async (text, isTitle = false) => {
    const out = cleanReply(await complete(buildMessages(text, lang, keep, isTitle)));
    // A reply far off the source length means the model invented, summarised or cut text.
    if (out.length > text.length * 2 + 30 || out.length < text.length * 0.4) throw new Error(`${isTitle ? 'title' : 'chunk'}: unexpected length ${out.length} for ${text.length} source characters`);
    if (isTitle && out.includes('\n')) throw new Error('title: reply has more than one line');
    return out;
  };

  const title = await ask(readTitle(front), true);
  const { text, slots } = protect(body);
  const parts = [];
  for (const part of chunk(text, maxChars)) parts.push(await ask(part));
  const translated = restore(parts.join('\n\n'), slots);

  return `---\n${[...withTitle(front, title), REVIEW_NOTE].join('\n')}\n---\n${translated.trim()}\n`;
}
