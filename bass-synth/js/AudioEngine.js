/**
 * AudioEngine.js — Web Audio API Foundation
 * LakeShoreDr Bass Synth · Resistor Technology
 *
 * Manages: AudioContext, master gain, dynamics compressor,
 * and AnalyserNode (for VU meter).
 */

export class AudioEngine {
  /** @type {AudioContext|null} */
  #ctx = null;

  /** @type {GainNode|null} */
  #masterGain = null;

  /** @type {DynamicsCompressorNode|null} */
  #compressor = null;

  /** @type {AnalyserNode|null} */
  #analyser = null;

  /** @type {boolean} */
  #initialized = false;

  /** @type {boolean} Whether this engine owns (and should close) its AudioContext */
  #ownsContext = true;

  get context() {
    return this.#ctx;
  }

  get masterGain() {
    return this.#masterGain;
  }

  get analyser() {
    return this.#analyser;
  }

  get currentTime() {
    return this.#ctx ? this.#ctx.currentTime : 0;
  }

  get isInitialized() {
    return this.#initialized;
  }

  /**
   * Initialize the AudioContext (must be called from a user gesture).
   * Safe to call multiple times — subsequent calls resume if suspended.
   * @param {AudioContext} [externalContext] — shared context from TransportSync
   */
  init(externalContext) {
    if (this.#initialized) {
      if (this.#ctx.state === 'suspended') {
        this.#ctx.resume();
      }
      return;
    }

    if (externalContext) {
      this.#ctx = externalContext;
      this.#ownsContext = false;
    } else {
      this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.#ownsContext = true;
    }

    // Compressor → destination (prevents clipping with multiple voices)
    this.#compressor = this.#ctx.createDynamicsCompressor();
    this.#compressor.threshold.value = -12;
    this.#compressor.knee.value = 6;
    this.#compressor.ratio.value = 4;
    this.#compressor.attack.value = 0.003;
    this.#compressor.release.value = 0.15;
    this.#compressor.connect(this.#ctx.destination);

    // Analyser (feeds VU meter)
    this.#analyser = this.#ctx.createAnalyser();
    this.#analyser.fftSize = 256;
    this.#analyser.smoothingTimeConstant = 0.7;
    this.#analyser.connect(this.#compressor);

    // Master gain → analyser
    this.#masterGain = this.#ctx.createGain();
    this.#masterGain.gain.value = 0.8;
    this.#masterGain.connect(this.#analyser);

    // iOS Safari audio unlock: play a silent buffer through the
    // destination to wake the audio hardware during a user gesture.
    this.#unlockiOS();

    this.#initialized = true;
  }

  /**
   * iOS audio unlock — play a 1-sample silent buffer directly to
   * the destination node. Required on iOS Safari where the AudioContext
   * starts suspended and hardware won't produce sound until something
   * is routed to the destination from a user gesture (click/touchend).
   */
  #unlockiOS() {
    const buffer = this.#ctx.createBuffer(1, 1, this.#ctx.sampleRate);
    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.#ctx.destination);
    source.start();
  }

  /**
   * Set master volume (0.0–1.0).
   * @param {number} value
   */
  setVolume(value) {
    if (this.#masterGain) {
      this.#masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, value)),
        this.#ctx.currentTime,
        0.01
      );
    }
  }

  /**
   * Get current RMS level from the analyser (0.0–1.0).
   * @returns {number}
   */
  getLevel() {
    if (!this.#analyser) return 0;
    const data = new Uint8Array(this.#analyser.frequencyBinCount);
    this.#analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = (data[i] - 128) / 128;
      sum += sample * sample;
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * Tear down the AudioContext (only closes if we own it).
   */
  destroy() {
    if (this.#ctx && this.#ownsContext) {
      this.#ctx.close();
    }
    this.#ctx = null;
    this.#initialized = false;
  }
}
