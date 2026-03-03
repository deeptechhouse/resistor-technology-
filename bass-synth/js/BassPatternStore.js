/**
 * BassPatternStore.js — 16-Step Pattern Data Model
 * LakeShoreDr Bass Synth · Resistor Technology
 *
 * Each step: { on: boolean, note: MIDI int (36–60), accent: boolean, slide: boolean }
 * Default note: 48 (C3). Range: C2 (36) to C4 (60).
 */

export class BassPatternStore {
  static TOTAL_STEPS = 16;
  static NOTE_MIN = 36;   // C2
  static NOTE_MAX = 60;   // C4
  static DEFAULT_NOTE = 48; // C3

  // Note name lookup
  static NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  #steps;          // Array of 16 step objects
  #selectedStep;   // Currently selected step for pitch editing (0–15 or -1)

  constructor() {
    this.#steps = [];
    for (let i = 0; i < BassPatternStore.TOTAL_STEPS; i++) {
      this.#steps.push({
        on: false,
        note: BassPatternStore.DEFAULT_NOTE,
        accent: false,
        slide: false,
      });
    }
    this.#selectedStep = -1;
  }

  get selectedStep() { return this.#selectedStep; }

  setSelectedStep(index) {
    this.#selectedStep = (index >= 0 && index < BassPatternStore.TOTAL_STEPS) ? index : -1;
  }

  // --- Step data access ---

  getStep(index) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return null;
    // Return defensive copy
    return { ...this.#steps[index] };
  }

  toggleStep(index) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return false;
    this.#steps[index].on = !this.#steps[index].on;
    return this.#steps[index].on;
  }

  toggleAccent(index) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return false;
    this.#steps[index].accent = !this.#steps[index].accent;
    return this.#steps[index].accent;
  }

  toggleSlide(index) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return false;
    this.#steps[index].slide = !this.#steps[index].slide;
    return this.#steps[index].slide;
  }

  // --- Note pitch control ---

  getNoteAt(index) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return BassPatternStore.DEFAULT_NOTE;
    return this.#steps[index].note;
  }

  setNoteAt(index, midiNote) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return;
    this.#steps[index].note = Math.max(BassPatternStore.NOTE_MIN, Math.min(BassPatternStore.NOTE_MAX, midiNote));
  }

  noteUp(index) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return;
    if (this.#steps[index].note < BassPatternStore.NOTE_MAX) {
      this.#steps[index].note++;
    }
  }

  noteDown(index) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return;
    if (this.#steps[index].note > BassPatternStore.NOTE_MIN) {
      this.#steps[index].note--;
    }
  }

  // --- MIDI/Hz conversion ---

  static midiToHz(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  static midiToName(note) {
    const name = BassPatternStore.NOTE_NAMES[note % 12];
    const octave = Math.floor(note / 12) - 1;
    return name + octave;
  }

  // --- Sequencer access (gets step data for playback at absolute step) ---

  getStepForPlayback(index) {
    if (index < 0 || index >= BassPatternStore.TOTAL_STEPS) return null;
    const step = this.#steps[index];
    if (!step.on) return null;
    return {
      on: true,
      freq: BassPatternStore.midiToHz(step.note),
      note: step.note,
      accent: step.accent,
      slide: step.slide,
    };
  }

  /**
   * Check if the NEXT active step should slide into (for legato logic).
   * A slide happens when current step has slide=true AND the next step is active.
   */
  shouldSlide(currentIndex) {
    if (currentIndex < 0 || currentIndex >= BassPatternStore.TOTAL_STEPS) return false;
    const current = this.#steps[currentIndex];
    if (!current.slide) return false;
    // Check next step (wraps around)
    const nextIndex = (currentIndex + 1) % BassPatternStore.TOTAL_STEPS;
    return this.#steps[nextIndex].on;
  }

  // --- Pattern management ---

  clearAll() {
    for (let i = 0; i < BassPatternStore.TOTAL_STEPS; i++) {
      this.#steps[i] = {
        on: false,
        note: BassPatternStore.DEFAULT_NOTE,
        accent: false,
        slide: false,
      };
    }
    this.#selectedStep = -1;
  }

  serialize() {
    return {
      steps: this.#steps.map(s => ({ ...s })),
      selectedStep: this.#selectedStep,
    };
  }

  deserialize(data) {
    if (!data || !Array.isArray(data.steps)) return;
    for (let i = 0; i < BassPatternStore.TOTAL_STEPS && i < data.steps.length; i++) {
      const s = data.steps[i];
      this.#steps[i] = {
        on: !!s.on,
        note: Math.max(BassPatternStore.NOTE_MIN, Math.min(BassPatternStore.NOTE_MAX, s.note || BassPatternStore.DEFAULT_NOTE)),
        accent: !!s.accent,
        slide: !!s.slide,
      };
    }
    this.#selectedStep = data.selectedStep ?? -1;
  }
}
