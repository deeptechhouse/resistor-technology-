/**
 * PatternStore.js — Pattern Data Model
 * Dr_Fun Drum Machine · Resistor Technology
 *
 * Manages: 8 instruments × 64 steps (4 pages × 16),
 * per-instrument tuning, active page, selected instrument.
 * Serialize/deserialize for pattern save/load.
 */

export class PatternStore {
  /** Instrument IDs in display order. */
  static INSTRUMENTS = ['BD', 'SD', 'CH', 'OH', 'CP', 'LT', 'HT', 'RS'];

  /** Display labels. */
  static LABELS = {
    BD: 'Bass Drum',
    SD: 'Snare',
    CH: 'Closed HH',
    OH: 'Open HH',
    CP: 'Clap',
    LT: 'Low Tom',
    HT: 'High Tom',
    RS: 'Rimshot',
  };

  static TOTAL_STEPS = 64;
  static STEPS_PER_PAGE = 16;
  static NUM_PAGES = 4;

  /** @type {Object<string, Uint8Array>} — step data per instrument (0 or 1) */
  #steps;

  /** @type {Object<string, number>} — tuning per instrument (0.0–1.0) */
  #tuning;

  /** @type {number} — active page (0–3) */
  #activePage;

  /** @type {string} — currently selected instrument ID */
  #selectedInstrument;

  constructor() {
    this.#steps = {};
    this.#tuning = {};
    this.#activePage = 0;
    this.#selectedInstrument = PatternStore.INSTRUMENTS[0];

    for (const id of PatternStore.INSTRUMENTS) {
      this.#steps[id] = new Uint8Array(PatternStore.TOTAL_STEPS);
      this.#tuning[id] = 0.5; // center = 1.0x frequency
    }
  }

  get activePage() {
    return this.#activePage;
  }

  get selectedInstrument() {
    return this.#selectedInstrument;
  }

  /**
   * Set the active page (0–3).
   * @param {number} page
   */
  setActivePage(page) {
    this.#activePage = Math.max(0, Math.min(PatternStore.NUM_PAGES - 1, page));
  }

  /**
   * Set the selected instrument.
   * @param {string} id
   */
  setSelectedInstrument(id) {
    if (PatternStore.INSTRUMENTS.includes(id)) {
      this.#selectedInstrument = id;
    }
  }

  /**
   * Toggle a step on/off for the selected instrument on the active page.
   * @param {number} stepInPage — 0–15 (relative to active page)
   * @returns {boolean} — new state
   */
  toggleStep(stepInPage) {
    const absStep = this.#activePage * PatternStore.STEPS_PER_PAGE + stepInPage;
    const arr = this.#steps[this.#selectedInstrument];
    arr[absStep] = arr[absStep] ? 0 : 1;
    return arr[absStep] === 1;
  }

  /**
   * Get step state for the selected instrument on the active page.
   * @param {number} stepInPage — 0–15
   * @returns {boolean}
   */
  getStep(stepInPage) {
    const absStep = this.#activePage * PatternStore.STEPS_PER_PAGE + stepInPage;
    return this.#steps[this.#selectedInstrument][absStep] === 1;
  }

  /**
   * Get all active instrument IDs at a given absolute step (0–63).
   * @param {number} absStep
   * @returns {Array<{id: string, tuning: number}>}
   */
  getActiveVoicesAtStep(absStep) {
    const voices = [];
    for (const id of PatternStore.INSTRUMENTS) {
      if (this.#steps[id][absStep]) {
        voices.push({ id, tuning: this.#tuning[id] });
      }
    }
    return voices;
  }

  /**
   * Get tuning for an instrument.
   * @param {string} id
   * @returns {number}
   */
  getTuning(id) {
    return this.#tuning[id] ?? 0.5;
  }

  /**
   * Set tuning for an instrument.
   * @param {string} id
   * @param {number} value — 0.0–1.0
   */
  setTuning(id, value) {
    if (id in this.#tuning) {
      this.#tuning[id] = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Check if any steps are active for a given instrument on a given page.
   * @param {string} id
   * @param {number} page
   * @returns {boolean}
   */
  hasStepsOnPage(id, page) {
    const start = page * PatternStore.STEPS_PER_PAGE;
    const arr = this.#steps[id];
    for (let i = start; i < start + PatternStore.STEPS_PER_PAGE; i++) {
      if (arr[i]) return true;
    }
    return false;
  }

  /**
   * Clear all steps for all instruments.
   */
  clearAll() {
    for (const id of PatternStore.INSTRUMENTS) {
      this.#steps[id].fill(0);
    }
  }

  /**
   * Serialize the full pattern state to a plain object.
   * @returns {object}
   */
  serialize() {
    const steps = {};
    for (const id of PatternStore.INSTRUMENTS) {
      steps[id] = Array.from(this.#steps[id]);
    }
    return {
      steps,
      tuning: { ...this.#tuning },
      activePage: this.#activePage,
      selectedInstrument: this.#selectedInstrument,
    };
  }

  /**
   * Load pattern state from a serialized object.
   * @param {object} data
   */
  deserialize(data) {
    if (!data) return;

    if (data.steps) {
      for (const id of PatternStore.INSTRUMENTS) {
        if (data.steps[id]) {
          const arr = this.#steps[id];
          const src = data.steps[id];
          for (let i = 0; i < Math.min(arr.length, src.length); i++) {
            arr[i] = src[i] ? 1 : 0;
          }
        }
      }
    }

    if (data.tuning) {
      for (const id of PatternStore.INSTRUMENTS) {
        if (typeof data.tuning[id] === 'number') {
          this.#tuning[id] = data.tuning[id];
        }
      }
    }

    if (typeof data.activePage === 'number') {
      this.setActivePage(data.activePage);
    }

    if (typeof data.selectedInstrument === 'string') {
      this.setSelectedInstrument(data.selectedInstrument);
    }
  }
}
