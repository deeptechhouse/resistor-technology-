# Resistor Technology Site — Navigation Map

> Single-page static website for Resistor Technology, showcasing raiveFlier and Resistor products.

## Architecture Overview

Pure static site — HTML + CSS + vanilla JavaScript with zero build dependencies. Designed for Render free-tier static site hosting with global CDN. Interactive synth panel hero uses CSS custom properties driven by JavaScript drag/scroll events. All animations use IntersectionObserver (no scroll event listeners for reveals).

## Directory Map

| Directory / File | Layer/Role | Description |
|---|---|---|
| `index.html` | Page | Single-page site with all sections |
| `css/foundation.css` | Design Tokens | Colors, typography, spacing, reset, film grain, a11y |
| `css/components.css` | UI Components | Cards, buttons, badges, editorial layout, reveals |
| `css/synth-elements.css` | Synth GUI | Knobs, faders, VU meter, LEDs, patch jack, panel |
| `css/main.css` | Page Layout | Nav, sections, responsive breakpoints |
| `js/synth-hero.js` | Interactivity | Knob/fader drag, VU scroll velocity, patch jack |
| `js/scroll-animations.js` | Animation | Scroll reveals, section LED indicators, parallax |
| `js/main.js` | Navigation | Nav scroll blur, mobile menu, smooth scroll |
| `assets/` | Static Assets | Images, SVGs, screenshots (placeholder) |

## Key Entry Points

- **Page:** `index.html` — all content in one file
- **Design tokens:** `css/foundation.css` — all CSS custom properties
- **Interactivity:** `js/synth-hero.js` — hero panel controls

## Module Relationships

- `foundation.css` defines CSS custom properties consumed by all other CSS files
- `synth-hero.js` writes to CSS custom properties (`--grain-opacity`, `--glow-intensity`, `--parallax-depth`)
- `scroll-animations.js` reads `--parallax-depth` and uses IntersectionObserver to trigger `.is-visible` / `.is-active` classes
- `main.js` manages nav state (`.is-scrolled`) and mobile menu (`.is-open`)

## External Dependencies

| Dependency | Purpose | Swappable? |
|---|---|---|
| Google Fonts (CDN) | Space Grotesk, Inter, IBM Plex Mono | Yes (self-host or swap fonts) |
| Render Static Site | Hosting + CDN | Yes (any static host: Vercel, Netlify, S3) |
