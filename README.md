# galuin.com

Personal site of Galuin: a news-style front page with blog posts, the latest YouTube videos and a Twitch card, plus pages for videos, hardware and a few browser-only tools (QR codes, PDFs, image conversion). English, German and Russian. Hosted on GitHub Pages at [galuin.com](https://galuin.com).

## Stack

[Astro](https://astro.build) (static output), TypeScript, Markdown content collections, `node:test` for tests. The tools run entirely in the visitor's browser; nothing is uploaded and no third-party script loads on page load.

## Run, build, test

```bash
npm ci            # install
npm run dev       # dev server on http://localhost:4321
npm run build     # fetches videos (prebuild), then builds into dist/
npm test          # needs a fresh build: the page tests read dist/
npm run preview   # serve dist/
```

Node 22 or newer. The unit tests import `.ts` files directly through Node's type stripping.

Optional: `tests/private-terms.local.txt` (git-ignored, one term per line) makes the build test fail if any of those terms appears in the built site. Keep it local.

## Structure

| Path | What it holds |
|---|---|
| `src/pages/` | English at the root, `de/` and `ru/` for the front page; shared pages live in `src/pages/[...lang]/` and are generated for all three languages |
| `src/content/posts/<slug>/<lang>.md` | Blog posts, one file per language |
| `src/data/` | `tools.ts` (tool list), `hardware.ts`, `legal.ts` (Impressum), `privacy.ts`, `videos.json` (fetched, git-ignored) |
| `src/i18n/ui.ts` | Interface strings and language helpers |
| `src/components/`, `src/layouts/` | Shared Astro components and the base layout |
| `src/tools/<tool>/` | Client code and pure logic for each tool |
| `scripts/fetch-videos.mjs` | Runs before every build and refreshes the video list |
| `tests/` | Unit tests plus build tests that inspect `dist/` |

## Writing a post

1. Create `src/content/posts/<slug>/en.md`. The folder name is the slug and the URL (`/blog/<slug>/`).
2. Add `de.md` and `ru.md` in the same folder for translations. A missing language is fine.
3. Front matter:

   ```yaml
   ---
   title: My post
   date: 2026-11-20
   cover: /posts/my-post.jpg   # optional
   tags: [hardware, nas]       # optional
   ---
   ```

4. **No `cover` makes a short note.** It is shown in full in the front page's notes column. **A `cover` makes a long post:** a card with a teaser, and the newest long post becomes the lead story. Put cover images in `public/posts/` and reference them by their URL path. While no long post exists, the newest video takes the lead slot.

## Adding a tool

1. Put the pure logic in `src/tools/<slug>/logic.ts` and the browser code in `src/tools/<slug>/<slug>.ts`.
2. Add the page `src/pages/[...lang]/tools/<slug>/index.astro` with `ToolLayout` and an EN/DE/RU string table. Look at `tools/image/` for a small example.
3. Add an entry to `src/data/tools.ts` (slug, icon path, name and blurb in three languages). The tools overview and the front-page strip pick it up from there.
4. Write tests first: unit tests for the logic in `tests/<slug>.test.mjs`, and a build test that the page exists in all three languages.

## Videos and the cache

`npm run build` runs `scripts/fetch-videos.mjs` first. It reads the channel's YouTube RSS feed, writes `src/data/videos.json` and downloads thumbnails to `public/thumbs/`. It never fails the build: if YouTube cannot be reached it keeps the cached list, and with no cache the video sections stay empty. Both paths are git-ignored.

In CI, `actions/cache` keeps `src/data/videos.json` and `public/thumbs` between runs. Every run saves a fresh copy under `videos-<run id>` and restores the newest one, so a failed fetch still deploys the last good list.

## Deploy

`.github/workflows/pages.yml` builds, runs the tests, and deploys with GitHub Pages. It runs on every push to `main`, on demand (`workflow_dispatch`), and on a schedule (`17 */4 * * *`) so new videos show up within about four hours. Scheduled runs also re-enable the workflow through the API, which stops GitHub from pausing the schedule after 60 days without repository activity.

## Impressum address

The Impressum needs a postal address by law. It is a placeholder until set:

1. Edit `address` in `src/data/legal.ts` (one string per line).
2. Until then the Impressum page is `noindex`, and **CI builds fail** (`CI=true` makes `legal.ts` throw), so nothing can be deployed with the placeholder.

To try the CI gate locally: `CI=true npm run build`.

## Cut-over from the old site

Only when ready to go live:

1. Set the real address in `src/data/legal.ts` and commit.
2. Repository Settings, Pages, Source: **GitHub Actions**.
3. Merge `redesign` into `main` and push. Watch the workflow run.
4. Check https://galuin.com in English, German and Russian.
5. Tick **Enforce HTTPS**.

Rollback: revert the merge commit and push, or switch the Pages source back to the branch.
