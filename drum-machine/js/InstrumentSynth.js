/**
 * InstrumentSynth.js — 808-Style Drum Synthesis
 * Dr_Fun Drum Machine · Resistor Technology
 *
 * 8 synthesized drum voices using Web Audio API oscillators,
 * filtered noise, and envelope shaping. No samples required.
 * Tuning (0.0–1.0) scales base frequencies by 0.5x–2.0x.
 */

export class InstrumentSynth {
  /** @type {import('./AudioEngine.js').AudioEngine} */
  #engine;

  /** Base frequencies per instrument (Hz). */
  static BASE_FREQ = {
    BD: 150,
    SD: 200,
    CH: 10000,
    OH: 10000,
    CP: 1000,
    LT: 120,
    HT: 200,
    RS: 500,
  };

  /** @type {GainNode|null} — open hi-hat choke reference */
  #ohGain = null;

  /**
   * @param {import('./AudioEngine.js').AudioEngine} engine
   */
  constructor(engine) {
    this.#engine = engine;
  }

  /**
   * Convert a tuning value (0.0–1.0) to a frequency multiplier (0.5–2.0).
   * 0.5 = tuning 0, 1.0 = tuning 0.5, 2.0 = tuning 1.0.
   * @param {number} tuning
   * @returns {number}
   */
  #tuneMultiplier(tuning) {
    return 0.5 * Math.pow(4, tuning);
  }

  /**
   * Trigger a drum voice at a precise time.
   * @param {string} id — instrument ID (BD/SD/CH/OH/CP/LT/HT/RS)
   * @param {number} time — AudioContext time to start
   * @param {number} tuning — 0.0–1.0
   */
  trigger(id, time, tuning = 0.5) {
    const ctx = this.#engine.context;
    const dest = this.#engine.masterGain;
    if (!ctx || !dest) return;

    const mul = this.#tuneMultiplier(tuning);

    switch (id) {
      case 'BD': this.#triggerBD(ctx, dest, time, mul); break;
      case 'SD': this.#triggerSD(ctx, dest, time, mul); break;
      case 'CH': this.#triggerCH(ctx, dest, time, mul); break;
      case 'OH': this.#triggerOH(ctx, dest, time, mul); break;
      case 'CP': this.#triggerCP(ctx, dest, time, mul); break;
      case 'LT': this.#triggerLT(ctx, dest, time, mul); break;
      case 'HT': this.#triggerHT(ctx, dest, time, mul); break;
      case 'RS': this.#triggerRS(ctx, dest, time, mul); break;
    }
  }

  /**
   * Bass Drum — Sine osc with pitch envelope 150→40 Hz, 0.3s decay.
   */
  #triggerBD(ctx, dest, time, mul) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 * mul, time);
    osc.frequency.exponentialRampToValueAtTime(40 * mul, time + 0.08);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  /**
   * Snare Drum — Triangle osc 200 Hz + highpass-filtered white noise.
   */
  #triggerSD(ctx, dest, time, mul) {
    // Tonal body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200 * mul, time);
    osc.frequency.exponentialRampToValueAtTime(120 * mul, time + 0.05);
    oscGain.gain.setValueAtTime(0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.15);

    // Noise body
    const noise = this.#createNoiseSource(ctx, time, 0.2);
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 2000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    noise.connect(hpf);
    hpf.connect(noiseGain);
    noiseGain.connect(dest);
  }

  /**
   * Closed Hi-Hat — Bandpass-filtered noise at 10kHz, 0.05s decay.
   * Chokes any open hi-hat.
   */
  #triggerCH(ctx, dest, time, mul) {
    // Choke open hi-hat
    if (this.#ohGain) {
      this.#ohGain.gain.cancelScheduledValues(time);
      this.#ohGain.gain.setValueAtTime(this.#ohGain.gain.value, time);
      this.#ohGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    }

    const noise = this.#createNoiseSource(ctx, time, 0.08);
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 10000 * mul;
    bpf.Q.value = 1.5;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(bpf);
    bpf.connect(hpf);
    hpf.connect(gain);
    gain.connect(dest);
  }

  /**
   * Open Hi-Hat — Same as CH but 0.3s decay, stores gain ref for choking.
   */
  #triggerOH(ctx, dest, time, mul) {
    const noise = this.#createNoiseSource(ctx, time, 0.4);
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 10000 * mul;
    bpf.Q.value = 1.5;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    noise.connect(bpf);
    bpf.connect(hpf);
    hpf.connect(gain);
    gain.connect(dest);

    this.#ohGain = gain;
  }

  /**
   * Clap — Bandpass noise with 3 rapid bursts + tail.
   */
  #triggerCP(ctx, dest, time, mul) {
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 1000 * mul;
    bpf.Q.value = 0.7;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);

    // 3 rapid bursts
    for (let i = 0; i < 3; i++) {
      const t = time + i * 0.015;
      env.gain.setValueAtTime(0.8, t);
      env.gain.exponentialRampToValueAtTime(0.1, t + 0.01);
    }
    // Tail
    const tailStart = time + 0.045;
    env.gain.setValueAtTime(0.6, tailStart);
    env.gain.exponentialRampToValueAtTime(0.001, tailStart + 0.2);

    const noise = this.#createNoiseSource(ctx, time, 0.3);
    noise.connect(bpf);
    bpf.connect(env);
    env.connect(dest);
  }

  /**
   * Low Tom — Sine osc 120 Hz with pitch envelope, 0.2s decay.
   */
  #triggerLT(ctx, dest, time, mul) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 * mul, time);
    osc.frequency.exponentialRampToValueAtTime(60 * mul, time + 0.1);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  /**
   * High Tom — Sine osc 200 Hz with pitch envelope, 0.15s decay.
   */
  #triggerHT(ctx, dest, time, mul) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200 * mul, time);
    osc.frequency.exponentialRampToValueAtTime(100 * mul, time + 0.08);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  /**
   * Rimshot — Triangle osc 500 Hz + bandpass noise, very short.
   */
  #triggerRS(ctx, dest, time, mul) {
    // Tonal click
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500 * mul, time);
    oscGain.gain.setValueAtTime(0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.05);

    // Noise snap
    const noise = this.#createNoiseSource(ctx, time, 0.06);
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 3000 * mul;
    bpf.Q.value = 2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    noise.connect(bpf);
    bpf.connect(noiseGain);
    noiseGain.connect(dest);
  }

  /**
   * Create a noise source from the shared buffer.
   * @param {AudioContext} ctx
   * @param {number} startTime
   * @param {number} duration
   * @returns {AudioBufferSourceNode}
   */
  #createNoiseSource(ctx, startTime, duration) {
    const source = ctx.createBufferSource();
    source.buffer = this.#engine.noiseBuffer;
    source.start(startTime);
    source.stop(startTime + duration + 0.05);
    return source;
  }
}
