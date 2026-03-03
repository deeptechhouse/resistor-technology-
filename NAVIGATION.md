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
| `drum-machine/` | Feature Module | Dr_Fun web drum machine (self-contained, embeddable) |
| `drum-machine/drum-machine.css` | Styles | Dual-theme CSS (bunker + vintage), responsive |
| `drum-machine/js/DrumMachine.js` | Orchestrator | Public API, auto-init, wires all modules |
| `drum-machine/js/AudioEngine.js` | Audio | Web Audio API context, gain, analyser, compressor |
| `drum-machine/js/InstrumentSynth.js` | Audio | 8 synthesized drum voices (808-style) |
| `drum-machine/js/Sequencer.js` | Timing | Look-ahead scheduler with AudioContext timing |
| `drum-machine/js/PatternStore.js` | Data | 8×64 step grid, tuning, serialize/deserialize |
| `drum-machine/js/UIController.js` | UI | DOM generation, event delegation |
| `drum-machine/js/KnobController.js` | UI | Rotary knob (drag + keyboard + ARIA) |
| `drum-machine/js/VUMeterRenderer.js` | UI | SVG needle VU meter |
| `bass-synth/` | Feature Module | LakeShoreDr TB-303 bass synthesizer clone (self-contained, embeddable) |
| `bass-synth/bass-synth.css` | Styles | Dual-theme CSS, sequencer grid, knobs, responsive |
| `bass-synth/js/LakeShoreDr.js` | Orchestrator | Public API, auto-init, wires all modules |
| `bass-synth/js/AudioEngine.js` | Audio | Web Audio API context, gain, analyser, compressor |
| `bass-synth/js/TB303Synth.js` | Audio | TB-303 bass synthesis — sawtooth/square, resonant filter, slide, accent, distortion |
| `bass-synth/js/BassSequencer.js` | Timing | 16-step sequencer scheduler with AudioContext timing |
| `bass-synth/js/BassPatternStore.js` | Data | 16 steps with note, octave, slide, accent, rest; serialize/deserialize |
| `bass-synth/js/BassUIController.js` | UI | DOM generation, event delegation |
| `bass-synth/js/KnobController.js` | UI | Rotary knob (drag + keyboard + ARIA) |
| `bass-synth/js/VUMeterRenderer.js` | UI | SVG needle VU meter |
| `assets/` | Static Assets | Images, SVGs, screenshots (placeholder) |

## Key Entry Points

- **Page:** `index.html` — all content in one file
- **Design tokens:** `css/foundation.css` — all CSS custom properties
- **Interactivity:** `js/synth-hero.js` — hero panel controls
- **Drum machine:** `drum-machine/js/DrumMachine.js` — Dr_Fun orchestrator and public API
- **Bass synth:** `bass-synth/js/LakeShoreDr.js` — LakeShoreDr orchestrator and public API

## Module Relationships

- `foundation.css` defines CSS custom properties consumed by all other CSS files
- `synth-hero.js` writes to CSS custom properties (`--grain-opacity`, `--glow-intensity`, `--parallax-depth`)
- `scroll-animations.js` reads `--parallax-depth` and uses IntersectionObserver to trigger `.is-visible` / `.is-active` classes
- `main.js` manages nav state (`.is-scrolled`) and mobile menu (`.is-open`)
- `drum-machine/` is self-contained: `DrumMachine.js` orchestrates AudioEngine, InstrumentSynth, Sequencer, PatternStore, UIController. UIController uses KnobController and VUMeterRenderer.
- `bass-synth/` follows the same pattern: `LakeShoreDr.js` orchestrates AudioEngine, TB303Synth, BassSequencer, BassPatternStore, BassUIController. BassUIController uses KnobController and VUMeterRenderer.

## External Dependencies

| Dependency | Purpose | Swappable? |
|---|---|---|
| Google Fonts (CDN) | Space Grotesk, Inter, IBM Plex Mono | Yes (self-host or swap fonts) |
| Render Static Site | Hosting + CDN | Yes (any static host: Vercel, Netlify, S3) |
