/**
 * BassSequencer.js — 16-Step Look-Ahead Scheduler
 * LakeShoreDr Bass Synth · Resistor Technology
 *
 * Schedules bass notes using a look-ahead pattern to ensure
 * sample-accurate timing. Handles slide (portamento) and accent.
 */

export class BassSequencer {
  #engine;          // AudioEngine
  #synth;           // TB303Synth
  #store;           // BassPatternStore

  #bpm = 120;
  #isPlaying = false;
  #currentStep = 0;  // 0–15
  #nextStepTime = 0;
  #schedulerInterval = null;
  #animFrameId = null;
  #lastDrawnStep = -1;

  // Callbacks
  #onStep = null;   // (stepIndex: number) => void — for LED update
  #onFrame = null;  // () => void — for VU meter update

  // Timing constants
  static LOOK_AHEAD = 0.1;    // seconds to look ahead
  static INTERVAL = 25;       // ms between scheduler checks
  static DISPLAY_LEAD = 0.05; // lead time for visual update

  constructor(engine, synth, store) {
    this.#engine = engine;
    this.#synth = synth;
    this.#store = store;
  }

  get bpm() { return this.#bpm; }
  get isPlaying() { return this.#isPlaying; }
  get currentStep() { return this.#currentStep; }

  set onStep(fn) { this.#onStep = fn; }
  set onFrame(fn) { this.#onFrame = fn; }

  setBPM(value) {
    this.#bpm = Math.max(30, Math.min(300, value));
  }

  /**
   * Duration of one 16th note step in seconds.
   */
  get #stepDuration() {
    return 60 / this.#bpm / 4;
  }

  start() {
    if (this.#isPlaying) return;
    this.#isPlaying = true;
    this.#currentStep = 0;
    this.#lastDrawnStep = -1;
    this.#nextStepTime = this.#engine.currentTime + 0.05; // small initial offset

    this.#schedulerInterval = setInterval(() => this.#scheduleAhead(), BassSequencer.INTERVAL);
    this.#drawLoop();
  }

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

    this.#synth.silence();
    this.#lastDrawnStep = -1;
  }

  /**
   * Look-ahead scheduling: schedule all steps within the look-ahead window.
   */
  #scheduleAhead() {
    const deadline = this.#engine.currentTime + BassSequencer.LOOK_AHEAD;

    while (this.#nextStepTime < deadline) {
      this.#scheduleStep(this.#currentStep, this.#nextStepTime);
      this.#nextStepTime += this.#stepDuration;
      this.#currentStep = (this.#currentStep + 1) % 16;
    }
  }

  /**
   * Schedule a single step for playback.
   */
  #scheduleStep(stepIndex, time) {
    const stepData = this.#store.getStepForPlayback(stepIndex);
    if (!stepData) return;

    // Check if this step should be slid INTO (previous step had slide + this step is on)
    const prevIndex = (stepIndex - 1 + 16) % 16;
    const isSlideTarget = this.#store.shouldSlide(prevIndex);

    this.#synth.triggerNote(stepData.freq, time, stepData.accent, isSlideTarget);
  }

  /**
   * Animation loop: update LEDs and VU meter on each frame.
   */
  #drawLoop() {
    if (!this.#isPlaying) return;

    const displayTime = this.#engine.currentTime + BassSequencer.DISPLAY_LEAD;

    // Calculate which step should be displayed
    // We need to figure out what step is "current" for display
    // based on the time elapsed
    const stepDur = this.#stepDuration;
    if (stepDur > 0) {
      // Find the step that is about to play
      let displayStep = this.#currentStep;
      let futureTime = this.#nextStepTime;

      // Walk backwards from the next scheduled step to find what's playing now
      for (let i = 0; i < 16; i++) {
        const candidateStep = (displayStep - 1 - i + 32) % 16;
        const candidateTime = futureTime - (i + 1) * stepDur;
        if (candidateTime <= displayTime) {
          displayStep = candidateStep;
          break;
        }
      }

      if (displayStep !== this.#lastDrawnStep) {
        this.#lastDrawnStep = displayStep;
        if (this.#onStep) {
          this.#onStep(displayStep);
        }
      }
    }

    // VU meter update
    if (this.#onFrame) {
      this.#onFrame();
    }

    this.#animFrameId = requestAnimationFrame(() => this.#drawLoop());
  }

  destroy() {
    this.stop();
    this.#onStep = null;
    this.#onFrame = null;
  }
}
