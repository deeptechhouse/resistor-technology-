/**
 * TransportSync.js — Beat/Tempo Sync Coordinator
 * Resistor Technology
 *
 * Shares a single AudioContext across Dr_Fun and LakeShoreDr so both
 * instruments use the same clock. Propagates start/stop/BPM changes
 * with a reentrant guard to prevent infinite callback loops.
 *
 * Usage:
 *   const sync = new TransportSync();
 *   const dm = new DrumMachine(el, { getAudioContext: () => sync.init(), onStart: () => sync.startAll(), ... });
 *   sync.register('drums', dm);
 */

export class TransportSync {
  /** @type {Array<{name: string, instance: object}>} */
  #instruments = [];

  /** @type {AudioContext|null} */
  #sharedCtx = null;

  /** @type {boolean} Reentrant guard — prevents callback loops */
  #dispatching = false;

  /** @returns {AudioContext|null} */
  get audioContext() {
    return this.#sharedCtx;
  }

  /**
   * Create or resume the shared AudioContext.
   * Must be called from a user gesture on first invocation.
   * @returns {AudioContext}
   */
  init() {
    if (!this.#sharedCtx) {
      this.#sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.#sharedCtx.state === 'suspended') {
      this.#sharedCtx.resume();
    }
    return this.#sharedCtx;
  }

  /**
   * Register an instrument for coordinated transport.
   * @param {string} name — identifier (e.g. 'drums', 'bass')
   * @param {object} instance — must implement start(), stop(), setBPM(n)
   */
  register(name, instance) {
    this.#instruments.push({ name, instance });
  }

  /**
   * Start all registered instruments (reentrant-safe).
   * When instrument A's onStart callback calls startAll(), the guard
   * prevents instrument A from being started again.
   */
  startAll() {
    if (this.#dispatching) return;
    this.#dispatching = true;
    this.init();
    for (const { instance } of this.#instruments) {
      instance.start();
    }
    this.#dispatching = false;
  }

  /**
   * Stop all registered instruments (reentrant-safe).
   */
  stopAll() {
    if (this.#dispatching) return;
    this.#dispatching = true;
    for (const { instance } of this.#instruments) {
      instance.stop();
    }
    this.#dispatching = false;
  }

  /**
   * Sync BPM across all registered instruments (reentrant-safe).
   * @param {number} bpm
   */
  syncBPM(bpm) {
    if (this.#dispatching) return;
    this.#dispatching = true;
    for (const { instance } of this.#instruments) {
      instance.setBPM(bpm);
    }
    this.#dispatching = false;
  }

  /**
   * Tear down the shared AudioContext and clear registrations.
   */
  destroy() {
    if (this.#sharedCtx) {
      this.#sharedCtx.close();
      this.#sharedCtx = null;
    }
    this.#instruments = [];
  }
}
