# Blog figure templates

Charts, photo grids and schemas for blog posts, drawn from a small JSON spec so every figure keeps the same look. Style rules and colours are in `~/.claude/skills/new-blog-post/references/figures.md`; the code here enforces the ones that can be checked (axis title, source line, two-line headline).

```bash
# light and dark variant, same layout (writes llm-benchmark.light.png and llm-benchmark.dark.png)
node scripts/figures/render.mjs scripts/figures/specs/llm-benchmark.json --out public/posts/llm-benchmark.png

# plus the 1280 x 720 WebP cover for each variant
node scripts/figures/render.mjs scripts/figures/specs/llm-benchmark.json --out public/posts/llm-benchmark.png --cover public/posts/llm-benchmark-cover.webp

# one theme only, exact file name
node scripts/figures/render.mjs scripts/figures/specs/llm-benchmark.json --out /tmp/x.png --theme dark

# schema: the inline SVG block for the post (follows the site theme itself, no variants needed)
node scripts/figures/render.mjs scripts/figures/specs/owui-cloudflared.json --svg /tmp/schema.html
```

Needs Chrome or Edge installed (set `CHROME` to point at another browser). Uses `sharp`, which the site already has. `.jpg` output is for photo grids, everything with text is PNG.

## Specs (`specs/`)
- `type: "chart"`: `kind` dumbbell or dots, `scale` linear or log, `title` (use `\n` for the second line), `subtitle`, `axisTitle`, `series`, `rows`, `source`, optional `valueLabels`, `result` (ratio column), per-row `note`. Copy `llm-benchmark.json` (two series, log, ratio column) or `tts-benchmark.json` (three series, linear, notes).
- `type: "grid"`: `columns` (title and sub line), `images[row][column]` paths relative to the spec file, `margin` 30 for covers, 10 for inline strips.
- `type: "schema"`: zones, nodes, links, numbered badges, notes, in the 760 x 250 coordinate space the post diagrams use.
- The example specs reproduce the published figures. The tts numbers were read off the published chart; recompute from `tts-bench/results/` before reusing them for a new claim.

## Light and dark
Every figure renders in both themes from the same spec with identical layout, so a post can stack the two images and cross-fade them when the site theme changes. Palettes are in `THEMES` in `lib.mjs`; the series colours were checked with the dataviz `validate_palette.js` against both surfaces.

## Check
`node --test tests/chartfig.test.mjs`. It covers the axes, the enforced rules, that light and dark differ only in colour, and that the schema template still reproduces the diagram published in the Cloudflare post.
