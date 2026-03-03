/**
 * UIController.js — DOM Generation & Event Delegation
 * Dr_Fun Drum Machine · Resistor Technology
 *
 * Generates the full drum machine UI inside a container element.
 * Manages event delegation for all interactive elements.
 * Wires up KnobController and VUMeterRenderer instances.
 */

import { PatternStore } from './PatternStore.js';
import { KnobController } from './KnobController.js';
import { VUMeterRenderer } from './VUMeterRenderer.js';

export class UIController {
  /** @type {HTMLElement} */
  #root;

  /** @type {import('./PatternStore.js').PatternStore} */
  #store;

  /** @type {KnobController|null} */
  #volumeKnob = null;

  /** @type {KnobController|null} */
  #tuneKnob = null;

  /** @type {VUMeterRenderer|null} */
  #vuMeter = null;

  /** @type {HTMLElement[]} */
  #ledEls = [];

  /** @type {HTMLElement[]} */
  #stepBtns = [];

  /** @type {HTMLElement[]} */
  #instBtns = [];

  /** @type {HTMLElement[]} */
  #pageBtns = [];

  /** @type {HTMLElement|null} */
  #bpmValueEl = null;

  /** @type {HTMLElement|null} */
  #startBtn = null;

  /** @type {HTMLElement|null} */
  #stopBtn = null;

  /** Callbacks wired by DrumMachine orchestrator. */
  #callbacks = {
    onStart: null,
    onStop: null,
    onBPMChange: null,
    onVolumeChange: null,
    onTuneChange: null,
    onStepToggle: null,
    onInstrumentSelect: null,
    onPageSelect: null,
    onThemeToggle: null,
    onInstPreview: null,
  };

  /**
   * @param {HTMLElement} root — the .drum-machine container
   * @param {import('./PatternStore.js').PatternStore} store
   */
  constructor(root, store) {
    this.#root = root;
    this.#store = store;
  }

  get vuMeter() {
    return this.#vuMeter;
  }

  /**
   * Set callback handlers from the orchestrator.
   * @param {object} cbs
   */
  setCallbacks(cbs) {
    Object.assign(this.#callbacks, cbs);
  }

  /**
   * Build the full UI DOM.
   * @param {number} bpm
   */
  render(bpm) {
    this.#root.innerHTML = '';

    // Header
    const header = this.#el('div', 'dm__header');
    const title = this.#el('span', 'dm__title', 'Dr_Fun');

    const transport = this.#el('div', 'dm__transport');
    this.#startBtn = this.#el('button', 'dm__btn', 'Start');
    this.#startBtn.setAttribute('aria-label', 'Start sequencer');
    this.#stopBtn = this.#el('button', 'dm__btn', 'Stop');
    this.#stopBtn.setAttribute('aria-label', 'Stop sequencer');
    transport.append(this.#startBtn, this.#stopBtn);

    const themeBtn = this.#el('button', 'dm__theme-toggle', 'Theme');
    themeBtn.setAttribute('aria-label', 'Toggle color theme');

    header.append(title, transport, themeBtn);
    this.#root.appendChild(header);

    // LED strip
    const ledStrip = this.#el('div', 'dm__leds');
    ledStrip.setAttribute('aria-hidden', 'true');
    this.#ledEls = [];
    for (let i = 0; i < 16; i++) {
      const led = this.#el('div', 'dm__led');
      this.#ledEls.push(led);
      ledStrip.appendChild(led);
    }
    this.#root.appendChild(ledStrip);

    // Controls row
    const controls = this.#el('div', 'dm__controls');

    // Volume knob
    const volContainer = this.#el('div', 'dm__knob-container');
    this.#volumeKnob = new KnobController(volContainer, {
      label: 'Volume',
      min: 0,
      max: 1,
      value: 0.8,
      onChange: (v) => this.#callbacks.onVolumeChange?.(v),
    });
    controls.appendChild(volContainer);

    // Tune knob
    const tuneContainer = this.#el('div', 'dm__knob-container');
    this.#tuneKnob = new KnobController(tuneContainer, {
      label: 'Tune',
      min: 0,
      max: 1,
      value: this.#store.getTuning(this.#store.selectedInstrument),
      onChange: (v) => this.#callbacks.onTuneChange?.(v),
    });
    controls.appendChild(tuneContainer);

    // BPM display
    const bpmWrap = this.#el('div', 'dm__bpm-display');
    const bpmMinus = this.#el('button', 'dm__bpm-btn', '\u2212');
    bpmMinus.setAttribute('aria-label', 'Decrease BPM');
    this.#bpmValueEl = this.#el('span', 'dm__bpm-value', String(bpm));
    const bpmLabel = this.#el('span', 'dm__bpm-label', 'BPM');
    const bpmPlus = this.#el('button', 'dm__bpm-btn', '+');
    bpmPlus.setAttribute('aria-label', 'Increase BPM');

    const bpmInner = this.#el('div', '', '');
    bpmInner.style.display = 'flex';
    bpmInner.style.flexDirection = 'column';
    bpmInner.style.alignItems = 'center';
    bpmInner.style.gap = '2px';
    bpmInner.append(this.#bpmValueEl, bpmLabel);

    bpmWrap.append(bpmMinus, bpmInner, bpmPlus);
    controls.appendChild(bpmWrap);

    // VU meter
    const vuContainer = this.#el('div', 'dm__vu-container');
    this.#vuMeter = new VUMeterRenderer(vuContainer);
    controls.appendChild(vuContainer);

    this.#root.appendChild(controls);

    // Instrument buttons
    const instRow = this.#el('div', 'dm__instruments');
    instRow.setAttribute('role', 'radiogroup');
    instRow.setAttribute('aria-label', 'Instrument selection');
    this.#instBtns = [];
    for (const id of PatternStore.INSTRUMENTS) {
      const btn = this.#el('button', 'dm__inst-btn', id);
      btn.dataset.inst = id;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', id === this.#store.selectedInstrument ? 'true' : 'false');
      btn.setAttribute('aria-label', PatternStore.LABELS[id]);
      if (id === this.#store.selectedInstrument) {
        btn.classList.add('is-selected');
      }
      this.#instBtns.push(btn);
      instRow.appendChild(btn);
    }
    this.#root.appendChild(instRow);

    // Page buttons
    const pageRow = this.#el('div', 'dm__pages');
    this.#pageBtns = [];
    for (let i = 0; i < PatternStore.NUM_PAGES; i++) {
      const btn = this.#el('button', 'dm__page-btn');
      btn.dataset.page = i;
      btn.setAttribute('aria-label', `Pattern page ${i + 1}`);
      btn.textContent = `P${i + 1}`;
      const dot = this.#el('span', 'dm__page-dot');
      btn.appendChild(dot);
      if (i === this.#store.activePage) {
        btn.classList.add('is-active');
      }
      this.#pageBtns.push(btn);
      pageRow.appendChild(btn);
    }
    this.#root.appendChild(pageRow);

    // Step grid — 16 steps in 4 groups of 4
    const grid = this.#el('div', 'dm__step-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Step sequencer grid');
    this.#stepBtns = [];
    for (let g = 0; g < 4; g++) {
      const group = this.#el('div', 'dm__step-group');
      for (let s = 0; s < 4; s++) {
        const idx = g * 4 + s;
        const btn = this.#el('button', 'dm__step-btn');
        btn.dataset.step = idx;
        btn.setAttribute('aria-label', `Step ${idx + 1}`);
        btn.setAttribute('aria-pressed', this.#store.getStep(idx) ? 'true' : 'false');
        if (this.#store.getStep(idx)) {
          btn.classList.add('is-on');
        }
        this.#stepBtns.push(btn);
        group.appendChild(btn);
      }
      grid.appendChild(group);
    }
    this.#root.appendChild(grid);

    // Wire events
    this.#bindEvents(bpmMinus, bpmPlus, themeBtn);
  }

  /**
   * Bind all event listeners using delegation where possible.
   */
  #bindEvents(bpmMinus, bpmPlus, themeBtn) {
    // Start/Stop
    this.#startBtn.addEventListener('click', () => this.#callbacks.onStart?.());
    this.#stopBtn.addEventListener('click', () => this.#callbacks.onStop?.());

    // BPM
    bpmMinus.addEventListener('click', () => this.#callbacks.onBPMChange?.(-1));
    bpmPlus.addEventListener('click', () => this.#callbacks.onBPMChange?.(1));

    // Theme toggle
    themeBtn.addEventListener('click', () => this.#callbacks.onThemeToggle?.());

    // Instrument select (event delegation on parent)
    const instRow = this.#root.querySelector('.dm__instruments');
    instRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.dm__inst-btn');
      if (!btn) return;
      this.#callbacks.onInstrumentSelect?.(btn.dataset.inst);
    });

    // Instrument preview on right-click / long-press
    instRow.addEventListener('contextmenu', (e) => {
      const btn = e.target.closest('.dm__inst-btn');
      if (!btn) return;
      e.preventDefault();
      this.#callbacks.onInstPreview?.(btn.dataset.inst);
    });

    // Page select (event delegation)
    const pageRow = this.#root.querySelector('.dm__pages');
    pageRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.dm__page-btn');
      if (!btn) return;
      this.#callbacks.onPageSelect?.(Number(btn.dataset.page));
    });

    // Step toggle (event delegation)
    const grid = this.#root.querySelector('.dm__step-grid');
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.dm__step-btn');
      if (!btn) return;
      this.#callbacks.onStepToggle?.(Number(btn.dataset.step));
    });
  }

  /**
   * Update the step grid to reflect current PatternStore state.
   */
  refreshSteps() {
    for (let i = 0; i < 16; i++) {
      const isOn = this.#store.getStep(i);
      this.#stepBtns[i].classList.toggle('is-on', isOn);
      this.#stepBtns[i].setAttribute('aria-pressed', isOn ? 'true' : 'false');
    }
  }

  /**
   * Update which instrument button is selected.
   * @param {string} id
   */
  refreshInstrumentSelection(id) {
    for (const btn of this.#instBtns) {
      const isSelected = btn.dataset.inst === id;
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    }
  }

  /**
   * Update which page button is active + data indicators.
   * @param {number} page
   */
  refreshPages(page) {
    for (let i = 0; i < this.#pageBtns.length; i++) {
      this.#pageBtns[i].classList.toggle('is-active', i === page);
      // Show dot if any instrument has data on this page
      const hasData = PatternStore.INSTRUMENTS.some(
        (inst) => this.#store.hasStepsOnPage(inst, i)
      );
      this.#pageBtns[i].classList.toggle('has-data', hasData);
    }
  }

  /**
   * Update the tune knob to reflect the selected instrument's tuning.
   * @param {number} value — 0.0–1.0
   */
  refreshTuneKnob(value) {
    if (this.#tuneKnob) {
      this.#tuneKnob.setValue(value);
    }
  }

  /**
   * Update the BPM display.
   * @param {number} bpm
   */
  refreshBPM(bpm) {
    if (this.#bpmValueEl) {
      this.#bpmValueEl.textContent = String(bpm);
    }
  }

  /**
   * Highlight a single LED (turn off all others).
   * @param {number} stepInPage — 0–15, or -1 to turn all off
   */
  setActiveLED(stepInPage) {
    for (let i = 0; i < this.#ledEls.length; i++) {
      this.#ledEls[i].classList.toggle('is-active', i === stepInPage);
    }
    // Also highlight current step button
    for (let i = 0; i < this.#stepBtns.length; i++) {
      this.#stepBtns[i].classList.toggle('is-current', i === stepInPage);
    }
  }

  /**
   * Update transport button states.
   * @param {boolean} isPlaying
   */
  refreshTransport(isPlaying) {
    this.#startBtn.classList.toggle('is-active', isPlaying);
    this.#stopBtn.classList.toggle('is-active', !isPlaying);
  }

  /**
   * Helper: create an element with class and optional text.
   * @param {string} tag
   * @param {string} className
   * @param {string} [text]
   * @returns {HTMLElement}
   */
  #el(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
}
