/**
 * BassUIController.js — DOM Generation & Event Delegation
 * LakeShoreDr Bass Synth · Resistor Technology
 */

import { KnobController } from './KnobController.js';
import { VUMeterRenderer } from './VUMeterRenderer.js';
import { BassPatternStore } from './BassPatternStore.js';

export class BassUIController {
  #root;           // HTMLElement (the .bass-synth container)
  #store;          // BassPatternStore
  #callbacks = {}; // Event callbacks from orchestrator
  #vuMeter = null; // VUMeterRenderer

  // Knob references for programmatic updates
  #cutoffKnob = null;
  #resoKnob = null;
  #envModKnob = null;
  #decayKnob = null;
  #accentKnob = null;
  #driveKnob = null;
  #volumeKnob = null;

  // DOM element references
  #leds = [];
  #stepBtns = [];
  #accentBtns = [];
  #slideBtns = [];
  #noteValueEl = null;
  #bpmValueEl = null;
  #waveBtns = {};

  constructor(root, store) {
    this.#root = root;
    this.#store = store;
  }

  get vuMeter() { return this.#vuMeter; }

  setCallbacks(cbs) {
    this.#callbacks = cbs;
  }

  /**
   * Generate the full DOM and bind all events.
   */
  render(bpm) {
    this.#root.innerHTML = '';

    // --- Header ---
    const header = this.#el('div', 'bs__header');
    const title = this.#el('span', 'bs__title');
    title.textContent = 'LakeShoreDr';

    // Acid house smiley — a nod to 303 culture
    const smiley = this.#el('span', 'bs__smiley');
    smiley.setAttribute('aria-hidden', 'true');
    smiley.innerHTML = '<span class="bs__smiley-eye bs__smiley-eye--l"></span><span class="bs__smiley-eye bs__smiley-eye--r"></span><span class="bs__smiley-mouth"></span>';

    const transport = this.#el('div', 'bs__transport');
    const startBtn = this.#el('button', 'bs__btn');
    startBtn.textContent = 'Start';
    startBtn.setAttribute('aria-label', 'Start sequencer');
    startBtn.dataset.action = 'start';
    const stopBtn = this.#el('button', 'bs__btn');
    stopBtn.textContent = 'Stop';
    stopBtn.setAttribute('aria-label', 'Stop sequencer');
    stopBtn.dataset.action = 'stop';
    transport.append(startBtn, stopBtn);

    const themeBtn = this.#el('button', 'bs__theme-toggle');
    themeBtn.textContent = 'Theme';
    themeBtn.setAttribute('aria-label', 'Toggle theme');
    themeBtn.dataset.action = 'theme';

    header.append(title, smiley, transport, themeBtn);
    this.#root.append(header);

    // --- LED Strip ---
    const ledStrip = this.#el('div', 'bs__leds');
    ledStrip.setAttribute('aria-label', 'Step position indicators');
    this.#leds = [];
    for (let i = 0; i < 16; i++) {
      const led = this.#el('div', 'bs__led');
      led.setAttribute('aria-hidden', 'true');
      ledStrip.append(led);
      this.#leds.push(led);
    }
    this.#root.append(ledStrip);

    // --- Controls Row (knobs + BPM + VU) ---
    const controls = this.#el('div', 'bs__controls');

    // 7 knobs: Cutoff, Resonance, Env Mod, Decay, Accent, Drive, Volume
    const knobDefs = [
      { key: 'cutoff',    label: 'Cutoff',  value: 0.5,  cb: 'onCutoffChange' },
      { key: 'resonance', label: 'Reso',    value: 0.2,  cb: 'onResonanceChange' },
      { key: 'envMod',    label: 'Env Mod', value: 0.5,  cb: 'onEnvModChange' },
      { key: 'decay',     label: 'Decay',   value: 0.3,  cb: 'onDecayChange' },
      { key: 'accent',    label: 'Accent',  value: 0.5,  cb: 'onAccentChange' },
      { key: 'drive',     label: 'Drive',   value: 0.0,  cb: 'onDriveChange' },
      { key: 'volume',    label: 'Volume',  value: 0.8,  cb: 'onVolumeChange' },
    ];

    for (const def of knobDefs) {
      const container = this.#el('div', 'bs__knob-container');
      const knob = new KnobController(container, {
        label: def.label,
        min: 0,
        max: 1,
        value: def.value,
        size: 'small',
        onChange: (v) => {
          if (this.#callbacks[def.cb]) this.#callbacks[def.cb](v);
        },
      });
      controls.append(container);

      // Store references via a switch
      switch (def.key) {
        case 'cutoff': this.#cutoffKnob = knob; break;
        case 'resonance': this.#resoKnob = knob; break;
        case 'envMod': this.#envModKnob = knob; break;
        case 'decay': this.#decayKnob = knob; break;
        case 'accent': this.#accentKnob = knob; break;
        case 'drive': this.#driveKnob = knob; break;
        case 'volume': this.#volumeKnob = knob; break;
      }
    }

    // BPM display
    const bpmDisplay = this.#el('div', 'bs__bpm-display');
    const bpmMinus = this.#el('button', 'bs__bpm-btn');
    bpmMinus.textContent = '-';
    bpmMinus.setAttribute('aria-label', 'Decrease BPM');
    bpmMinus.dataset.action = 'bpm-down';

    const bpmValWrap = this.#el('div');
    const bpmVal = this.#el('span', 'bs__bpm-value');
    bpmVal.textContent = bpm;
    const bpmLabel = this.#el('span', 'bs__bpm-label');
    bpmLabel.textContent = 'BPM';
    bpmValWrap.style.display = 'flex';
    bpmValWrap.style.flexDirection = 'column';
    bpmValWrap.style.alignItems = 'center';
    bpmValWrap.style.gap = '0.15rem';
    bpmValWrap.append(bpmVal, bpmLabel);

    const bpmPlus = this.#el('button', 'bs__bpm-btn');
    bpmPlus.textContent = '+';
    bpmPlus.setAttribute('aria-label', 'Increase BPM');
    bpmPlus.dataset.action = 'bpm-up';

    bpmDisplay.append(bpmMinus, bpmValWrap, bpmPlus);
    this.#bpmValueEl = bpmVal;
    controls.append(bpmDisplay);

    // VU meter
    const vuContainer = this.#el('div', 'bs__vu-container');
    this.#vuMeter = new VUMeterRenderer(vuContainer);
    controls.append(vuContainer);

    this.#root.append(controls);

    // --- Waveform Toggle ---
    const waveToggle = this.#el('div', 'bs__wave-toggle');
    const sawBtn = this.#el('button', 'bs__wave-btn is-active');
    sawBtn.textContent = 'SAW';
    sawBtn.setAttribute('aria-label', 'Sawtooth waveform');
    sawBtn.dataset.wave = 'sawtooth';
    const sqrBtn = this.#el('button', 'bs__wave-btn');
    sqrBtn.textContent = 'SQR';
    sqrBtn.setAttribute('aria-label', 'Square waveform');
    sqrBtn.dataset.wave = 'square';
    waveToggle.append(sawBtn, sqrBtn);
    this.#waveBtns = { sawtooth: sawBtn, square: sqrBtn };
    this.#root.append(waveToggle);

    // --- Note Display ---
    const noteDisplay = this.#el('div', 'bs__note-display');
    const noteDown = this.#el('button', 'bs__note-btn');
    noteDown.textContent = '-';
    noteDown.setAttribute('aria-label', 'Note down');
    noteDown.dataset.action = 'note-down';

    const noteValWrap = this.#el('div');
    noteValWrap.style.display = 'flex';
    noteValWrap.style.flexDirection = 'column';
    noteValWrap.style.alignItems = 'center';
    noteValWrap.style.gap = '0.15rem';
    const noteVal = this.#el('span', 'bs__note-value');
    noteVal.textContent = '---';
    const noteLabel = this.#el('span', 'bs__note-label');
    noteLabel.textContent = 'Note';
    noteValWrap.append(noteVal, noteLabel);

    const noteUp = this.#el('button', 'bs__note-btn');
    noteUp.textContent = '+';
    noteUp.setAttribute('aria-label', 'Note up');
    noteUp.dataset.action = 'note-up';

    noteDisplay.append(noteDown, noteValWrap, noteUp);
    this.#noteValueEl = noteVal;
    this.#root.append(noteDisplay);

    // --- Step Grid ---
    const stepLabel = this.#el('div', 'bs__section-label');
    stepLabel.textContent = 'Steps';
    this.#root.append(stepLabel);

    const stepGrid = this.#el('div', 'bs__step-grid');
    this.#stepBtns = [];
    for (let g = 0; g < 4; g++) {
      const group = this.#el('div', 'bs__step-group');
      for (let s = 0; s < 4; s++) {
        const idx = g * 4 + s;
        const btn = this.#el('button', 'bs__step-btn');
        btn.setAttribute('aria-label', `Step ${idx + 1}`);
        btn.dataset.step = idx;
        group.append(btn);
        this.#stepBtns.push(btn);
      }
      stepGrid.append(group);
    }
    this.#root.append(stepGrid);

    // --- Accent Row ---
    const accentLabel = this.#el('div', 'bs__section-label');
    accentLabel.textContent = 'Accent';
    this.#root.append(accentLabel);

    const accentRow = this.#el('div', 'bs__accent-row');
    this.#accentBtns = [];
    for (let g = 0; g < 4; g++) {
      const group = this.#el('div', 'bs__accent-group');
      for (let s = 0; s < 4; s++) {
        const idx = g * 4 + s;
        const btn = this.#el('button', 'bs__accent-btn');
        btn.setAttribute('aria-label', `Accent step ${idx + 1}`);
        btn.dataset.accent = idx;
        btn.textContent = 'A';
        group.append(btn);
        this.#accentBtns.push(btn);
      }
      accentRow.append(group);
    }
    this.#root.append(accentRow);

    // --- Slide Row ---
    const slideLabel = this.#el('div', 'bs__section-label');
    slideLabel.textContent = 'Slide';
    this.#root.append(slideLabel);

    const slideRow = this.#el('div', 'bs__slide-row');
    this.#slideBtns = [];
    for (let g = 0; g < 4; g++) {
      const group = this.#el('div', 'bs__slide-group');
      for (let s = 0; s < 4; s++) {
        const idx = g * 4 + s;
        const btn = this.#el('button', 'bs__slide-btn');
        btn.setAttribute('aria-label', `Slide step ${idx + 1}`);
        btn.dataset.slide = idx;
        btn.textContent = 'S';
        group.append(btn);
        this.#slideBtns.push(btn);
      }
      slideRow.append(group);
    }
    this.#root.append(slideRow);

    // --- Bind all click events via delegation ---
    this.#bindEvents();
  }

  #bindEvents() {
    this.#root.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action], [data-step], [data-accent], [data-slide], [data-wave]');
      if (!target) return;

      if (target.dataset.action) {
        switch (target.dataset.action) {
          case 'start':
            if (this.#callbacks.onStart) this.#callbacks.onStart();
            break;
          case 'stop':
            if (this.#callbacks.onStop) this.#callbacks.onStop();
            break;
          case 'theme':
            if (this.#callbacks.onThemeToggle) this.#callbacks.onThemeToggle();
            break;
          case 'bpm-up':
            if (this.#callbacks.onBPMChange) this.#callbacks.onBPMChange(1);
            break;
          case 'bpm-down':
            if (this.#callbacks.onBPMChange) this.#callbacks.onBPMChange(-1);
            break;
          case 'note-up':
            if (this.#callbacks.onNoteUp) this.#callbacks.onNoteUp();
            break;
          case 'note-down':
            if (this.#callbacks.onNoteDown) this.#callbacks.onNoteDown();
            break;
        }
      }

      if (target.dataset.step !== undefined) {
        const idx = Number(target.dataset.step);
        if (this.#callbacks.onStepToggle) this.#callbacks.onStepToggle(idx);
      }

      if (target.dataset.accent !== undefined) {
        const idx = Number(target.dataset.accent);
        if (this.#callbacks.onAccentToggle) this.#callbacks.onAccentToggle(idx);
      }

      if (target.dataset.slide !== undefined) {
        const idx = Number(target.dataset.slide);
        if (this.#callbacks.onSlideToggle) this.#callbacks.onSlideToggle(idx);
      }

      if (target.dataset.wave) {
        if (this.#callbacks.onWaveformChange) this.#callbacks.onWaveformChange(target.dataset.wave);
      }
    });
  }

  // --- Refresh methods ---

  refreshSteps() {
    for (let i = 0; i < 16; i++) {
      const step = this.#store.getStep(i);
      this.#stepBtns[i].classList.toggle('is-on', step.on);
      this.#stepBtns[i].classList.toggle('is-selected', i === this.#store.selectedStep);
      this.#accentBtns[i].classList.toggle('is-on', step.accent);
      this.#slideBtns[i].classList.toggle('is-on', step.slide);
    }
  }

  refreshNoteDisplay() {
    const sel = this.#store.selectedStep;
    if (sel >= 0) {
      const note = this.#store.getNoteAt(sel);
      this.#noteValueEl.textContent = BassPatternStore.midiToName(note);
    } else {
      this.#noteValueEl.textContent = '---';
    }
  }

  refreshBPM(bpm) {
    if (this.#bpmValueEl) {
      this.#bpmValueEl.textContent = bpm;
    }
  }

  refreshWaveform(waveform) {
    for (const [type, btn] of Object.entries(this.#waveBtns)) {
      btn.classList.toggle('is-active', type === waveform);
    }
  }

  setActiveLED(stepIndex) {
    for (let i = 0; i < 16; i++) {
      this.#leds[i].classList.toggle('is-active', i === stepIndex);
    }
  }

  refreshTransport(isPlaying) {
    const startBtn = this.#root.querySelector('[data-action="start"]');
    const stopBtn = this.#root.querySelector('[data-action="stop"]');
    if (startBtn) startBtn.classList.toggle('is-active', isPlaying);
    if (stopBtn) stopBtn.classList.toggle('is-active', !isPlaying);
  }

  // --- Helpers ---
  #el(tag, className) {
    const el = document.createElement(tag);
    if (className) {
      // Support space-separated classes
      for (const c of className.split(' ')) {
        if (c) el.classList.add(c);
      }
    }
    return el;
  }
}
