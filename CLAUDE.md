# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal site for **galuin.com** (GitHub Pages): a news-style front page with blog posts, YouTube videos and a Twitch card, plus videos, hardware, Impressum and privacy pages and three browser-only tools (QR, PDF, image converter). English, German and Russian. Astro 7, static output, TypeScript. The repository is public.

## Commands

```bash
npm ci          # install
npm run dev     # dev server
npm run build   # prebuild fetches videos, then astro build into dist/
npm test        # node:test; the build tests read dist/, so build first
```

Run `npm run build && npm test` before every commit.

## Architecture

- **i18n:** `en` (no URL prefix), `de`, `ru`, with `trailingSlash: 'always'`. Shared pages live in `src/pages/[...lang]/` and return `lang: l === 'en' ? undefined : l` from `getStaticPaths`. Strings are in `src/i18n/ui.ts`; page-specific strings sit in an `s` table inside the page.
- **Posts:** `src/content/posts/YYYY-MM-DD_<slug>/<lang>.md` (the date prefix is stripped, URL is `/blog/<slug>/`). No `cover` in the front matter is a short note, a `cover` makes a long post (the newest becomes the lead story; with none, the newest video leads).
- **Videos:** `scripts/fetch-videos.mjs` (npm `prebuild`) reads the YouTube RSS feed into `src/data/videos.json` and `public/thumbs/`. It never fails the build and falls back to the cache. Both paths are git-ignored; CI caches them.
- **Tools:** each tool has `src/tools/<slug>/logic.ts` (pure, unit-tested), a client script, and a page in `src/pages/[...lang]/tools/<slug>/`. Register it in `src/data/tools.ts`. Everything runs in the browser; no third-party loads on page load, no CDN scripts (a build test checks this).
- **Changelog:** `src/data/changelog.ts` feeds `/changelog/` and the version link on `/tools/`. Versions are `0.MINOR.PATCH`: a commit that adds a tool starts a new MINOR (patch 0, kind `new`), every other commit is the next PATCH. Add a `Change` (en, de, ru) per commit that a visitor can notice. That covers new tools and changes to existing ones (a button, a tab, a fix), so every such commit bumps the version in the same commit; only commits with no visible effect are `internal` or skipped. `tests/changelog.test.mjs` enforces the numbering, so run it before committing.
- **Impressum:** `src/data/legal.ts` holds the address. While it is `TODO-ADDRESS` the page says the address is pending, is `noindex`, and builds print a warning.
- **Deploy:** `.github/workflows/pages.yml` builds, tests and deploys on push to `main`, manually, and every four hours (video refresh plus a keep-alive call).

## Conventions

- Test first. Unit tests import `.ts` directly (Node type stripping): escape `/` inside regex character classes and avoid TS-only syntax Node cannot strip.
- Astro removes HTML comments from templates, and DOM created by client scripts needs `:global()` styles.
- Public repo: no private details in code, content or tests (no home address, birth data or employer internals). Private terms for the leak test live only in the git-ignored `tests/private-terms.local.txt`.
- `docs/` and `HANDOFF.md` are git-ignored on purpose. Stage explicit paths rather than `git add -A`.
- Images made by hand (screenshots, charts, covers, blog figures) must follow the Lighthouse performance pointers before they are committed, above all "efficiently encode images": compress them (WebP or AVIF for photos and covers, optimised PNG for flat graphics, no oversized originals), size them to the largest width they are shown at, and give `<img>` explicit `width` and `height`. Files go in `public/posts/` for blog images. The rest of the Lighthouse report was already close to clean.
- Hardware links to Amazon are plain links, not affiliate links.
- The `CNAME` file in `public/` maps the deployment to `galuin.com`.

## Session handoff
Chats do not sync between devices. Follow the HANDOFF.md convention from `C:\Users\Simon\Documents\02_Dev\CLAUDE.md`: read `HANDOFF.md` at session start if present; at the end of a meaningful session (or when the user switches device) rewrite it (goal, state, next steps, how to verify, uncommitted work, decisions, open questions; under ~60 lines, no secrets). Commit or push only when asked.
