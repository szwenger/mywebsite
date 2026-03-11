# galuin.com

Personal website for Galuin — gaming, coding, and hardware content. Hosted on GitHub Pages at [galuin.com](https://galuin.com).

## About

This site covers:
- **Content Creation** — YouTube gaming and tech videos
- **Hardware** — Full PC setup specs and an ongoing NAS build
- **Blog** — Personal project updates and notes

## Tech Stack

Plain HTML5, CSS3, and vanilla JavaScript. No frameworks, no build tools, no dependencies.

## Running Locally

Open `index.html` directly in a browser, or serve with a local static server to avoid `fetch()` CORS issues with `homeContent.html`:

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

Then visit `http://localhost:8080`.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Main shell — nav, 3D carousel, content area, footer |
| `styles.css` | All styles — nav, carousel, content sections, dark mode |
| `script.js` | Navigation logic, carousel 3D math, dark mode toggle |
| `homeContent.html` | Home section HTML fragment (loaded via `fetch`) |
| `resources/` | Static assets (logos, images) |
| `114-carrossel-3d/` | Standalone carousel prototype — not used by the main site |

## Adding a New Section

1. Add a `<li>` with a button in `#defaultMenu` (nav) in `index.html`
2. Add a `<div class="carrossel-item">` with an `<a>` in `#carouselContainer`
3. Write a content function in `script.js` returning an HTML string wrapped in `<div class="content-section">`
4. Wire up click handlers for both the nav button and the carousel item using `showSection()`
