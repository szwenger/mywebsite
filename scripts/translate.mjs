// Drafts German and Russian versions of a post with a local model (llama-server or LM Studio).
// Usage: npm run translate -- <slug> [--lang de,ru] [--force] [--url http://127.0.0.1:8080/v1] [--model qwen3.5-35b-a3b]
// Start the model first: llm-bench\serve.ps1 (port 8080). Output is a draft: read it, then commit it yourself.
import { access, readFile, writeFile } from 'node:fs/promises';
import { translatePost } from '../src/lib/translate.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const slug = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const force = args.includes('--force');
const langs = flag('lang', 'de,ru').split(',');
const url = flag('url', 'http://127.0.0.1:8080/v1');
const model = flag('model', 'qwen3.5-35b-a3b');

if (!slug || !langs.every((l) => ['de', 'ru'].includes(l))) {
  console.error('Usage: npm run translate -- <slug> [--lang de,ru] [--force] [--url <base>] [--model <name>]');
  process.exit(1);
}

const dir = `src/content/posts/${slug}`;
const source = await readFile(`${dir}/en.md`, 'utf8').catch(() => { console.error(`No ${dir}/en.md`); process.exit(1); });
const keep = JSON.parse(await readFile('scripts/translate-keep.json', 'utf8'));

async function complete(messages) {
  let res;
  try {
    res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0, stream: false }),
      signal: AbortSignal.timeout(10 * 60_000),
    });
  } catch (e) {
    console.error(`Cannot reach ${url} (${e.cause?.code ?? e.message}). Start the model: llm-bench\\serve.ps1`);
    process.exit(1);
  }
  if (!res.ok) throw new Error(`model server: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).choices[0].message.content ?? '';
}

for (const lang of langs) {
  const out = `${dir}/${lang}.md`;
  if (!force && await access(out).then(() => true, () => false)) { console.log(`skip ${out} (exists, use --force)`); continue; }
  const t0 = Date.now();
  await writeFile(out, await translatePost({ source, lang, keep, complete }));
  console.log(`wrote ${out} in ${Math.round((Date.now() - t0) / 1000)} s: review it, then delete the "machine-translated" line`);
}
