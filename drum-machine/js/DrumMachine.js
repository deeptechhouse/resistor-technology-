/**
 * DrumMachine.js — Orchestrator & Public API
 * Dr_Fun Drum Machine · Resistor Technology
 *
 * Wires together AudioEngine, InstrumentSynth, Sequencer,
 * PatternStore, and UIController. Provides the public API
 * for embedding and programmatic control.
 *
 * Usage (declarative):
 *   <link rel="stylesheet" href="drum-machine/drum-machine.css">
 *   <div class="drum-machine" data-theme="bunker"></div>
 *   <script type="module" src="drum-machine/js/DrumMachine.js"></script>
 *
 * Usage (programmatic):
 *   import { DrumMachine } from './drum-machine/js/DrumMachine.js';
 *   const dm = new DrumMachine(container, { bpm: 120, theme: 'bunker' });
 */

import { AudioEngine } from './AudioEngine.js';
import { InstrumentSynth } from './InstrumentSynth.js';
import { PatternStore } from './PatternStore.js';
import { Sequencer } from './Sequencer.js';
import { UIController } from './UIController.js';

export class DrumMachine {
  /** @type {AudioEngine} */
  #engine;

  /** @type {InstrumentSynth} */
  #synth;

  /** @type {PatternStore} */
  #store;

  /** @type {Sequencer} */
  #sequencer;

  /** @type {UIController} */
  #ui;

  /** @type {HTMLElement} */
  #container;

  /** @type {string} */
  #theme;

  /** @type {Function|null} Lazy AudioContext factory from TransportSync */
  #getAudioContext;

  /** @type {Function|null} Sync callback: fired after start */
  #onStart;

  /** @type {Function|null} Sync callback: fired after stop */
  #onStop;

  /** @type {Function|null} Sync callback: fired after BPM change */
  #onBPMChange;

  /** Available themes in rotation order. */
  static THEMES = ['bunker', 'vintage'];

  /**
   * @param {HTMLElement} container — element with class "drum-machine"
   * @param {object} [opts]
   * @param {number} [opts.bpm=120]
   * @param {string} [opts.theme='bunker']
   * @param {Function} [opts.getAudioContext] — lazy factory returning shared AudioContext
   * @param {Function} [opts.onStart] — sync callback fired after playback starts
   * @param {Function} [opts.onStop] — sync callback fired after playback stops
   * @param {Function} [opts.onBPMChange] — sync callback fired after BPM changes, receives new BPM
   */
  constructor(container, opts = {}) {
    this.#container = container;
    this.#theme = opts.theme || container.dataset.theme || 'bunker';
    container.dataset.theme = this.#theme;

    // TransportSync callbacks (null when standalone)
    this.#getAudioContext = opts.getAudioContext || null;
    this.#onStart = opts.onStart || null;
    this.#onStop = opts.onStop || null;
    this.#onBPMChange = opts.onBPMChange || null;

    // Core modules
    this.#engine = new AudioEngine();
    this.#store = new PatternStore();
    this.#synth = new InstrumentSynth(this.#engine);
    this.#sequencer = new Sequencer(this.#engine, this.#synth, this.#store);

    if (opts.bpm) {
      this.#sequencer.setBPM(opts.bpm);
    }

    // UI
    this.#ui = new UIController(container, this.#store);
    this.#ui.setCallbacks({
      onStart: () => this.start(),
      onStop: () => this.stop(),
      onBPMChange: (delta) => this.#changeBPM(delta),
      onVolumeChange: (v) => this.#engine.setVolume(v),
      onTuneChange: (v) => this.#onTuneChange(v),
      onStepToggle: (step) => this.#onStepToggle(step),
      onInstrumentSelect: (id) => this.#onInstrumentSelect(id),
      onPageSelect: (page) => this.#onPageSelect(page),
      onThemeToggle: () => this.#toggleTheme(),
      onInstPreview: (id) => this.#previewInstrument(id),
    });

    this.#ui.render(this.#sequencer.bpm);

    // Sequencer callbacks for UI updates
    this.#sequencer.onStep = (absStep) => this.#onSequencerStep(absStep);
    this.#sequencer.onFrame = () => this.#onFrame();
  }

  // --- Public API ---

  /**
   * Start playback.
   */
  start() {
    const ctx = this.#getAudioContext ? this.#getAudioContext() : undefined;
    this.#engine.init(ctx);
    this.#sequencer.start();
    this.#ui.refreshTransport(true);
    if (this.#onStart) this.#onStart();
  }

  /**
   * Stop playback.
   */
  stop() {
    this.#sequencer.stop();
    this.#ui.setActiveLED(-1);
    this.#ui.refreshTransport(false);
    if (this.#ui.vuMeter) {
      this.#ui.vuMeter.reset();
    }
    if (this.#onStop) this.#onStop();
  }

  /**
   * Set BPM (30–300).
   * @param {number} value
   */
  setBPM(value) {
    this.#sequencer.setBPM(value);
    this.#ui.refreshBPM(this.#sequencer.bpm);
  }

  /**
   * Set color theme.
   * @param {string} theme — 'bunker' or 'vintage'
   */
  setTheme(theme) {
    if (DrumMachine.THEMES.includes(theme)) {
      this.#theme = theme;
      this.#container.dataset.theme = theme;
    }
  }

  /**
   * Get the full serialized pattern.
   * @returns {object}
   */
  getPattern() {
    return this.#store.serialize();
  }

  /**
   * Load a serialized pattern.
   * @param {object} data
   */
  loadPattern(data) {
    this.#store.deserialize(data);
    this.#ui.refreshSteps();
    this.#ui.refreshPages(this.#store.activePage);
    this.#ui.refreshInstrumentSelection(this.#store.selectedInstrument);
    this.#ui.refreshTuneKnob(this.#store.getTuning(this.#store.selectedInstrument));
  }

  /**
   * Tear down everything.
   */
  destroy() {
    this.#sequencer.destroy();
    this.#engine.destroy();
    this.#container.innerHTML = '';
  }

  // --- Internal Handlers ---

  /**
   * BPM +/- button handler.
   * @param {number} delta — +1 or -1 (5 BPM increment)
   */
  #changeBPM(delta) {
    this.#sequencer.setBPM(this.#sequencer.bpm + delta * 5);
    this.#ui.refreshBPM(this.#sequencer.bpm);
    if (this.#onBPMChange) this.#onBPMChange(this.#sequencer.bpm);
  }

  /**
   * Tune knob change handler.
   * @param {number} value
   */
  #onTuneChange(value) {
    this.#store.setTuning(this.#store.selectedInstrument, value);
  }

  /**
   * Step toggle handler.
   * @param {number} stepInPage — 0–15
   */
  #onStepToggle(stepInPage) {
    this.#store.toggleStep(stepInPage);
    this.#ui.refreshSteps();
    this.#ui.refreshPages(this.#store.activePage);
  }

  /**
   * Instrument select handler.
   * @param {string} id
   */
  #onInstrumentSelect(id) {
    this.#store.setSelectedInstrument(id);
    this.#ui.refreshInstrumentSelection(id);
    this.#ui.refreshSteps();
    this.#ui.refreshTuneKnob(this.#store.getTuning(id));

    // Preview sound on select
    this.#previewInstrument(id);
  }

  /**
   * Preview an instrument sound (single hit).
   * @param {string} id
   */
  #previewInstrument(id) {
    const ctx = this.#getAudioContext ? this.#getAudioContext() : undefined;
    this.#engine.init(ctx);
    this.#synth.trigger(id, this.#engine.currentTime, this.#store.getTuning(id));
  }

  /**
   * Page select handler.
   * @param {number} page
   */
  #onPageSelect(page) {
    this.#store.setActivePage(page);
    this.#ui.refreshPages(page);
    this.#ui.refreshSteps();
  }

  /**
   * Cycle through themes.
   */
  #toggleTheme() {
    const idx = DrumMachine.THEMES.indexOf(this.#theme);
    const next = DrumMachine.THEMES[(idx + 1) % DrumMachine.THEMES.length];
    this.setTheme(next);
  }

  /**
   * Called by sequencer when the current step changes.
   * @param {number} absStep — 0–63
   */
  #onSequencerStep(absStep) {
    const page = Math.floor(absStep / PatternStore.STEPS_PER_PAGE);
    const stepInPage = absStep % PatternStore.STEPS_PER_PAGE;

    // Auto-follow: switch displayed page to match playback
    if (page !== this.#store.activePage) {
      this.#store.setActivePage(page);
      this.#ui.refreshPages(page);
      this.#ui.refreshSteps();
    }

    this.#ui.setActiveLED(stepInPage);
  }

  /**
   * Called every animation frame during playback (for VU meter).
   */
  #onFrame() {
    if (this.#ui.vuMeter) {
      this.#ui.vuMeter.update(this.#engine.getLevel());
    }
  }
}

// --- Auto-Init: find all .drum-machine containers and initialize ---
document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.drum-machine[data-auto-init]');
  containers.forEach((el) => {
    new DrumMachine(el, {
      bpm: Number(el.dataset.bpm) || 120,
      theme: el.dataset.theme || 'bunker',
    });
  });
});
