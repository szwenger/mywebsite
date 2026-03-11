# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static personal website for **galuin.com** (hosted on GitHub Pages), a gaming and coding personal site. No build tools, package managers, or frameworks — plain HTML, CSS, and vanilla JavaScript.

## Development

Open `index.html` directly in a browser or use any local static server:

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

There are no build steps, linting, or test commands.

## Architecture

The site uses a **single-page application pattern** without a router library:

- `index.html` — Shell page with nav, the 3D carousel, a `#content` div, and footer
- `script.js` — All interactivity: content loading, dark mode, carousel 3D logic
- `styles.css` — All styles including nav, dark mode, and the 3D carousel
- `homeContent.html` — External HTML fragment loaded via `fetch()` into `#content`

**Two display modes controlled by JS:**
- **Home/landing**: `#carouselContainer` visible, `#defaultMenu` hidden — shows the 3D carousel
- **Content pages**: `#carouselContainer` hidden, `#defaultMenu` visible — shows the standard nav

**Content loading pattern:** All section content (Home, Content Creation, Hardware, Blog) is injected into `<div id="content">` via `innerHTML`. Home content is fetched from `homeContent.html`; other sections have their HTML inlined in `script.js` event handlers.

**3D Carousel:** CSS `transform-style: preserve-3d` with JS-driven `--rotatey` CSS custom property. Items are positioned via `rotatey()` + `translatez()`. Draggable via mouse/touch with linear interpolation (`lerp`) for smooth animation via `requestAnimationFrame`.

**Dark mode:** Toggled by adding/removing `dark-mode` class on `<body>` via the toggle image in the nav.

## File Conventions

- Page sections added to the nav need a button in both `#defaultMenu` (standard nav) and `#carouselContainer` (carousel), plus a click handler in `script.js`
- The `114-carrossel-3d/` folder contains a standalone prototype of the carousel — not used by the main site
- `resources/` holds static assets (images, logos)
- The CNAME file maps the GitHub Pages deployment to `galuin.com`
