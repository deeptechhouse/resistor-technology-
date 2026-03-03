/**
 * Sequencer.js — Look-Ahead Step Scheduler
 * Dr_Fun Drum Machine · Resistor Technology
 *
 * Uses the Web Audio look-ahead technique:
 *  - setInterval (25ms) checks AudioContext.currentTime
 *  - Schedules notes within a 100ms window for sample-accurate timing
 *  - requestAnimationFrame updates the UI (step LEDs, VU meter)
 *
 * 64 steps total (4 pages × 16), plays continuously through all pages.
 */

export class Sequencer {
  /** @type {import('./AudioEngine.js').AudioEngine} */
  #engine;

  /** @type {import('./InstrumentSynth.js').InstrumentSynth} */
  #synth;

  /** @type {import('./PatternStore.js').PatternStore} */
  #store;

  /** @type {number} — BPM (beats per minute, each beat = 1 step) */
  #bpm = 120;

  /** @type {boolean} */
  #isPlaying = false;

  /** @type {number} — current absolute step (0–63) */
  #currentStep = 0;

  /** @type {number} — AudioContext time of next scheduled step */
  #nextStepTime = 0;

  /** @type {number|null} — scheduler interval ID */
  #schedulerInterval = null;

  /** @type {number|null} — UI animation frame ID */
  #animFrameId = null;

  /** @type {number} — last step drawn in UI (to avoid redundant updates) */
  #lastDrawnStep = -1;

  /** @type {Function|null} — callback for UI step updates */
  #onStep = null;

  /** @type {Function|null} — callback for each animation frame (VU) */
  #onFrame = null;

  /** Look-ahead window in seconds. */
  static LOOK_AHEAD = 0.1;

  /** Scheduler interval in ms. */
  static SCHEDULER_INTERVAL = 25;

  /**
   * @param {import('./AudioEngine.js').AudioEngine} engine
   * @param {import('./InstrumentSynth.js').InstrumentSynth} synth
   * @param {import('./PatternStore.js').PatternStore} store
   */
  constructor(engine, synth, store) {
    this.#engine = engine;
    this.#synth = synth;
    this.#store = store;
  }

  get bpm() {
    return this.#bpm;
  }

  get isPlaying() {
    return this.#isPlaying;
  }

  get currentStep() {
    return this.#currentStep;
  }

  /**
   * Register a callback invoked when the current step changes.
   * @param {(step: number) => void} fn — receives absolute step (0–63)
   */
  set onStep(fn) {
    this.#onStep = fn;
  }

  /**
   * Register a callback invoked every animation frame while playing.
   * @param {() => void} fn
   */
  set onFrame(fn) {
    this.#onFrame = fn;
  }

  /**
   * Set BPM (30–300).
   * @param {number} value
   */
  setBPM(value) {
    this.#bpm = Math.max(30, Math.min(300, Math.round(value)));
  }

  /**
   * Seconds per step at the current BPM.
   * BPM = quarter notes per minute; each step = 1/16th note = 1/4 of a beat.
   * @returns {number}
   */
  #stepDuration() {
    return 60 / this.#bpm / 4;
  }

  /**
   * Start playback.
   */
  start() {
    if (this.#isPlaying) return;
    this.#engine.init();
    this.#isPlaying = true;
    this.#currentStep = 0;
    this.#lastDrawnStep = -1;
    this.#nextStepTime = this.#engine.currentTime + 0.05;

    this.#schedulerInterval = setInterval(
      () => this.#scheduleAhead(),
      Sequencer.SCHEDULER_INTERVAL
    );

    this.#drawLoop();
  }

  /**
   * Stop playback.
   */
  stop() {
    this.#isPlaying = false;
    if (this.#schedulerInterval !== null) {
      clearInterval(this.#schedulerInterval);
      this.#schedulerInterval = null;
    }
    if (this.#animFrameId !== null) {
      cancelAnimationFrame(this.#animFrameId);
      this.#animFrameId = null;
    }
  }

  /**
   * Look-ahead scheduler — schedules all steps within the look-ahead window.
   */
  #scheduleAhead() {
    const deadline = this.#engine.currentTime + Sequencer.LOOK_AHEAD;

    while (this.#nextStepTime < deadline) {
      // Trigger all active voices at this step
      const voices = this.#store.getActiveVoicesAtStep(this.#currentStep);
      for (const voice of voices) {
        this.#synth.trigger(voice.id, this.#nextStepTime, voice.tuning);
      }

      // Advance
      this.#nextStepTime += this.#stepDuration();
      this.#currentStep = (this.#currentStep + 1) % 64;
    }
  }

  /**
   * Animation frame loop — updates UI at display refresh rate.
   */
  #drawLoop() {
    if (!this.#isPlaying) return;

    // Calculate which step is "now" for visual display
    // Use a slight offset so the LED lights just before the sound
    const displayStep = this.#getDisplayStep();

    if (displayStep !== this.#lastDrawnStep) {
      this.#lastDrawnStep = displayStep;
      if (this.#onStep) {
        this.#onStep(displayStep);
      }
    }

    if (this.#onFrame) {
      this.#onFrame();
    }

    this.#animFrameId = requestAnimationFrame(() => this.#drawLoop());
  }

  /**
   * Estimate which step is currently audible (for LED display).
   * @returns {number}
   */
  #getDisplayStep() {
    const stepsAhead = (this.#nextStepTime - this.#engine.currentTime) / this.#stepDuration();
    let step = this.#currentStep - Math.ceil(stepsAhead);
    if (step < 0) step += 64;
    return step % 64;
  }

  /**
   * Clean up.
   */
  destroy() {
    this.stop();
  }
}
