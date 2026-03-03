/**
 * TB303Synth.js — Monophonic Acid Bass Synthesizer
 * LakeShoreDr Bass Synth · Resistor Technology
 *
 * Core TB-303 emulation with persistent oscillator, resonant lowpass filter,
 * filter + amplitude envelopes, accent, slide, and tanh soft-clip distortion.
 *
 * Signal chain:
 *   OscillatorNode (sawtooth | square) — persistent, always running
 *     → BiquadFilterNode (lowpass)
 *       → GainNode (VCA / amplitude envelope)
 *         → dry path: dryGain → outputGain
 *         → wet path: WaveShaperNode (distortion) → wetGain → outputGain
 *           → AudioEngine.masterGain
 */

export class TB303Synth {
  // ─── Private fields ──────────────────────────────────────────────
  #engine;           // AudioEngine reference
  #osc = null;       // OscillatorNode (persistent)
  #filter = null;    // BiquadFilterNode (lowpass)
  #vca = null;       // GainNode (amplitude envelope)
  #distortion = null; // WaveShaperNode
  #dryGain = null;   // GainNode for clean signal path
  #wetGain = null;   // GainNode for distorted signal path
  #outputGain = null; // Final output gain (connects to masterGain)
  #waveform = 'sawtooth'; // 'sawtooth' or 'square'
  #isInitialized = false;

  // ─── Synth parameters (controlled by knobs) ─────────────────────
  #cutoff = 800;      // Hz, 60–12000, log scale
  #resonance = 5;     // Q, 0.5–25
  #envMod = 0.5;      // 0.0–1.0, filter envelope depth
  #decay = 0.3;       // seconds, 0.2–2.0, filter+amp envelope decay
  #accent = 0.5;      // 0.0–1.0, accent intensity
  #drive = 0.0;       // 0.0–1.0, distortion amount

  // ─── Static constants ───────────────────────────────────────────
  static FILTER_MIN = 60;
  static FILTER_MAX = 12000;
  static Q_MIN = 0.5;
  static Q_MAX = 25;
  static DECAY_MIN = 0.2;
  static DECAY_MAX = 2.0;
  static ATTACK = 0.003;  // 3ms attack
  static SLIDE_TIME = 0.06; // ~60ms portamento

  constructor(engine) {
    this.#engine = engine;
  }

  // ─── Getters ────────────────────────────────────────────────────
  get waveform() { return this.#waveform; }
  get cutoff() { return this.#cutoff; }
  get resonance() { return this.#resonance; }
  get envMod() { return this.#envMod; }
  get decay() { return this.#decay; }
  get accent() { return this.#accent; }
  get drive() { return this.#drive; }
  get isInitialized() { return this.#isInitialized; }

  /**
   * Initialize the audio graph. Must be called after engine.init().
   */
  init() {
    if (this.#isInitialized) return;
    const ctx = this.#engine.context;

    // 1. Persistent oscillator
    this.#osc = ctx.createOscillator();
    this.#osc.type = this.#waveform;
    this.#osc.frequency.value = 0; // silent until first note

    // 2. Lowpass filter (12dB/oct is default BiquadFilter)
    this.#filter = ctx.createBiquadFilter();
    this.#filter.type = 'lowpass';
    this.#filter.frequency.value = this.#cutoff;
    this.#filter.Q.value = this.#resonance;

    // 3. VCA (amplitude envelope)
    this.#vca = ctx.createGain();
    this.#vca.gain.value = 0; // silent until triggered

    // 4. Distortion (WaveShaperNode with tanh curve)
    this.#distortion = ctx.createWaveShaper();
    this.#distortion.oversample = '4x';
    this.#updateDistortionCurve();

    // 5. Dry/wet mixing for distortion
    this.#dryGain = ctx.createGain();
    this.#dryGain.gain.value = 1.0;
    this.#wetGain = ctx.createGain();
    this.#wetGain.gain.value = 0.0;

    // 6. Output gain
    this.#outputGain = ctx.createGain();
    this.#outputGain.gain.value = 1.0;

    // Wire: osc → filter → vca → dry/wet → output → masterGain
    this.#osc.connect(this.#filter);
    this.#filter.connect(this.#vca);

    // Dry path: vca → dryGain → outputGain
    this.#vca.connect(this.#dryGain);
    this.#dryGain.connect(this.#outputGain);

    // Wet path: vca → distortion → wetGain → outputGain
    this.#vca.connect(this.#distortion);
    this.#distortion.connect(this.#wetGain);
    this.#wetGain.connect(this.#outputGain);

    // Connect output to engine master
    this.#outputGain.connect(this.#engine.masterGain);

    // Start oscillator (runs forever)
    this.#osc.start();
    this.#isInitialized = true;
  }

  /**
   * Trigger a note at the given time.
   * @param {number} freq — frequency in Hz
   * @param {number} time — AudioContext time
   * @param {boolean} accent — whether this step has accent
   * @param {boolean} slide — whether to slide FROM previous note (legato)
   */
  triggerNote(freq, time, accent = false, slide = false) {
    if (!this.#isInitialized) return;

    // --- Pitch ---
    if (slide) {
      // Slide: ramp to new frequency over SLIDE_TIME
      this.#osc.frequency.cancelScheduledValues(time);
      this.#osc.frequency.setTargetAtTime(freq, time, TB303Synth.SLIDE_TIME);
    } else {
      // Instant pitch change
      this.#osc.frequency.setValueAtTime(freq, time);
    }

    // If slide, don't re-trigger envelopes (legato behavior)
    if (slide) return;

    // --- Accent multipliers ---
    const accentAmp = accent ? 1.5 : 1.0;
    const accentFilter = accent ? 1.5 : 1.0;

    // --- Amplitude Envelope ---
    this.#vca.gain.cancelScheduledValues(time);
    this.#vca.gain.setValueAtTime(0, time);
    // Attack
    this.#vca.gain.linearRampToValueAtTime(0.8 * accentAmp, time + TB303Synth.ATTACK);
    // Decay
    this.#vca.gain.setTargetAtTime(0, time + TB303Synth.ATTACK, this.#decay * 0.33);

    // --- Filter Envelope ---
    // Calculate sweep range based on envMod
    const baseFreq = this.#cutoff;
    const sweepRange = (TB303Synth.FILTER_MAX - baseFreq) * this.#envMod * accentFilter;
    const peakFreq = Math.min(baseFreq + sweepRange, TB303Synth.FILTER_MAX);

    this.#filter.frequency.cancelScheduledValues(time);
    this.#filter.frequency.setValueAtTime(baseFreq, time);
    // Attack — quick sweep up
    this.#filter.frequency.linearRampToValueAtTime(peakFreq, time + TB303Synth.ATTACK);
    // Decay — sweep back down
    this.#filter.frequency.setTargetAtTime(baseFreq, time + TB303Synth.ATTACK, this.#decay * 0.33);
  }

  /**
   * Silence the synth (for when sequencer stops).
   */
  silence() {
    if (!this.#isInitialized) return;
    const now = this.#engine.currentTime;
    this.#vca.gain.cancelScheduledValues(now);
    this.#vca.gain.setTargetAtTime(0, now, 0.01);
    this.#filter.frequency.cancelScheduledValues(now);
    this.#filter.frequency.setTargetAtTime(this.#cutoff, now, 0.01);
  }

  // ─── Parameter setters ──────────────────────────────────────────

  setWaveform(type) {
    this.#waveform = type === 'square' ? 'square' : 'sawtooth';
    if (this.#osc) {
      this.#osc.type = this.#waveform;
    }
  }

  setCutoff(value) {
    // value: 0.0–1.0 (knob), maps to 60–12000 Hz logarithmically
    this.#cutoff = TB303Synth.FILTER_MIN * Math.pow(TB303Synth.FILTER_MAX / TB303Synth.FILTER_MIN, value);
    if (this.#filter) {
      this.#filter.frequency.setTargetAtTime(this.#cutoff, this.#engine.currentTime, 0.01);
    }
  }

  setResonance(value) {
    // value: 0.0–1.0 (knob), maps to 0.5–25 Q
    this.#resonance = TB303Synth.Q_MIN + value * (TB303Synth.Q_MAX - TB303Synth.Q_MIN);
    if (this.#filter) {
      this.#filter.Q.setTargetAtTime(this.#resonance, this.#engine.currentTime, 0.01);
    }
  }

  setEnvMod(value) {
    // value: 0.0–1.0
    this.#envMod = value;
  }

  setDecay(value) {
    // value: 0.0–1.0 (knob), maps to 0.2–2.0 seconds
    this.#decay = TB303Synth.DECAY_MIN + value * (TB303Synth.DECAY_MAX - TB303Synth.DECAY_MIN);
  }

  setAccent(value) {
    // value: 0.0–1.0
    this.#accent = value;
  }

  setDrive(value) {
    // value: 0.0–1.0
    this.#drive = value;
    this.#updateDistortionCurve();
    // Update dry/wet mix
    if (this.#dryGain && this.#wetGain) {
      const now = this.#engine.currentTime;
      this.#dryGain.gain.setTargetAtTime(1.0 - value, now, 0.01);
      this.#wetGain.gain.setTargetAtTime(value, now, 0.01);
    }
  }

  /**
   * Generate a tanh-based soft clipping curve for the WaveShaperNode.
   * The drive parameter controls steepness: higher drive = harder clipping.
   */
  #updateDistortionCurve() {
    if (!this.#distortion) return;
    const samples = 256;
    const curve = new Float32Array(samples);
    const amount = 1 + this.#drive * 50; // steepness factor
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * amount);
    }
    this.#distortion.curve = curve;
  }

  /**
   * Tear down audio nodes.
   */
  destroy() {
    if (this.#osc) {
      this.#osc.stop();
      this.#osc.disconnect();
    }
    if (this.#filter) this.#filter.disconnect();
    if (this.#vca) this.#vca.disconnect();
    if (this.#distortion) this.#distortion.disconnect();
    if (this.#dryGain) this.#dryGain.disconnect();
    if (this.#wetGain) this.#wetGain.disconnect();
    if (this.#outputGain) this.#outputGain.disconnect();
    this.#isInitialized = false;
  }
}
