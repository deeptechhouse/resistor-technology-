/**
 * LakeShoreDr.js — TB-303 Bass Synth Orchestrator
 * LakeShoreDr Bass Synth · Resistor Technology
 *
 * Public API:
 *   const synth = new LakeShoreDr(container, { bpm: 130, theme: 'bunker' });
 *   synth.start() / synth.stop() / synth.setBPM(140) / synth.setTheme('vintage')
 *   synth.getPattern() / synth.loadPattern(data) / synth.destroy()
 */

import { AudioEngine } from './AudioEngine.js';
import { TB303Synth } from './TB303Synth.js';
import { BassPatternStore } from './BassPatternStore.js';
import { BassSequencer } from './BassSequencer.js';
import { BassUIController } from './BassUIController.js';

export class LakeShoreDr {
  #engine;
  #synth;
  #store;
  #sequencer;
  #ui;
  #container;
  #theme;

  static THEMES = ['bunker', 'vintage'];

  constructor(container, opts = {}) {
    this.#container = container;
    this.#theme = opts.theme || 'bunker';
    const bpm = opts.bpm || 120;

    // Set theme attribute
    this.#container.classList.add('bass-synth');
    this.#container.setAttribute('data-theme', this.#theme);

    // Create modules
    this.#engine = new AudioEngine();
    this.#synth = new TB303Synth(this.#engine);
    this.#store = new BassPatternStore();
    this.#sequencer = new BassSequencer(this.#engine, this.#synth, this.#store);
    this.#sequencer.setBPM(bpm);
    this.#ui = new BassUIController(this.#container, this.#store);

    // Wire UI callbacks
    this.#ui.setCallbacks({
      onStart: () => this.start(),
      onStop: () => this.stop(),
      onBPMChange: (delta) => {
        const newBpm = this.#sequencer.bpm + delta * 5;
        this.setBPM(newBpm);
      },
      onVolumeChange: (v) => this.#engine.setVolume(v),
      onCutoffChange: (v) => this.#synth.setCutoff(v),
      onResonanceChange: (v) => this.#synth.setResonance(v),
      onEnvModChange: (v) => this.#synth.setEnvMod(v),
      onDecayChange: (v) => this.#synth.setDecay(v),
      onAccentChange: (v) => this.#synth.setAccent(v),
      onDriveChange: (v) => this.#synth.setDrive(v),
      onWaveformChange: (type) => {
        this.#synth.setWaveform(type);
        this.#ui.refreshWaveform(this.#synth.waveform);
      },
      onStepToggle: (idx) => {
        this.#store.toggleStep(idx);
        this.#store.setSelectedStep(idx);
        this.#ui.refreshSteps();
        this.#ui.refreshNoteDisplay();
      },
      onAccentToggle: (idx) => {
        this.#store.toggleAccent(idx);
        this.#ui.refreshSteps();
      },
      onSlideToggle: (idx) => {
        this.#store.toggleSlide(idx);
        this.#ui.refreshSteps();
      },
      onNoteUp: () => {
        const sel = this.#store.selectedStep;
        if (sel >= 0) {
          this.#store.noteUp(sel);
          this.#ui.refreshNoteDisplay();
        }
      },
      onNoteDown: () => {
        const sel = this.#store.selectedStep;
        if (sel >= 0) {
          this.#store.noteDown(sel);
          this.#ui.refreshNoteDisplay();
        }
      },
      onThemeToggle: () => {
        const idx = LakeShoreDr.THEMES.indexOf(this.#theme);
        this.setTheme(LakeShoreDr.THEMES[(idx + 1) % LakeShoreDr.THEMES.length]);
      },
    });

    // Wire sequencer callbacks
    this.#sequencer.onStep = (stepIndex) => {
      this.#ui.setActiveLED(stepIndex);
    };
    this.#sequencer.onFrame = () => {
      if (this.#ui.vuMeter) {
        this.#ui.vuMeter.update(this.#engine.getLevel());
      }
    };

    // Render UI
    this.#ui.render(bpm);
    this.#ui.refreshSteps();
    this.#ui.refreshNoteDisplay();
    this.#ui.refreshWaveform(this.#synth.waveform);
  }

  start() {
    this.#engine.init();
    this.#synth.init();
    this.#sequencer.start();
    this.#ui.refreshTransport(true);
  }

  stop() {
    this.#sequencer.stop();
    this.#ui.refreshTransport(false);
    // Clear LEDs
    this.#ui.setActiveLED(-1);
    // Reset VU
    if (this.#ui.vuMeter) this.#ui.vuMeter.reset();
  }

  setBPM(value) {
    this.#sequencer.setBPM(value);
    this.#ui.refreshBPM(this.#sequencer.bpm);
  }

  setTheme(theme) {
    if (LakeShoreDr.THEMES.includes(theme)) {
      this.#theme = theme;
      this.#container.setAttribute('data-theme', theme);
    }
  }

  getPattern() {
    return this.#store.serialize();
  }

  loadPattern(data) {
    this.#store.deserialize(data);
    this.#ui.refreshSteps();
    this.#ui.refreshNoteDisplay();
  }

  destroy() {
    this.#sequencer.destroy();
    this.#synth.destroy();
    this.#engine.destroy();
    this.#container.innerHTML = '';
  }
}

/* ────── Auto-Init (standalone page) ────── */
document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.bass-synth[data-auto-init]');
  containers.forEach((el) => {
    new LakeShoreDr(el, {
      bpm: Number(el.dataset.bpm) || 120,
      theme: el.dataset.theme || 'bunker',
    });
  });
});
