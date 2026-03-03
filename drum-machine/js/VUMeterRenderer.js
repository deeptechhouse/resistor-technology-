/**
 * VUMeterRenderer.js — SVG Needle VU Meter
 * Dr_Fun Drum Machine · Resistor Technology
 *
 * Renders an analog-style VU meter driven by an AnalyserNode.
 * Matches the visual style of the site's dock VU meter.
 */

export class VUMeterRenderer {
  /** @type {HTMLElement} */
  #container;

  /** @type {HTMLElement|null} */
  #needleEl = null;

  /** @type {HTMLElement|null} */
  #meterEl = null;

  /** @type {number} — current displayed angle */
  #angle = -30;

  /** @type {number} — target angle from audio level */
  #targetAngle = -30;

  /** Needle angle range. */
  static ANGLE_REST = -30;
  static ANGLE_MAX = 20;

  /** Smoothing factor for needle movement. */
  static SMOOTH = 0.15;

  /** Decay rate when no signal. */
  static DECAY = 0.06;

  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.#container = container;
    this.#render();
  }

  /**
   * Build the VU meter DOM.
   */
  #render() {
    this.#container.innerHTML = `
      <div class="dm__vu-meter" role="meter" aria-label="Audio level meter"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="dm__vu-face">VU</span>
        <div class="dm__vu-scale" aria-hidden="true"></div>
        <div class="dm__vu-marks" aria-hidden="true">
          <span>-20</span><span>-10</span><span>-3</span><span>0</span><span>+3</span>
        </div>
        <div class="dm__vu-needle"></div>
      </div>
    `;
    this.#needleEl = this.#container.querySelector('.dm__vu-needle');
    this.#meterEl = this.#container.querySelector('.dm__vu-meter');
  }

  /**
   * Update the VU meter with a new audio level (0.0–1.0).
   * Call this from requestAnimationFrame.
   * @param {number} level — RMS level (0.0–1.0)
   */
  update(level) {
    // Map level to target angle
    const mapped = VUMeterRenderer.ANGLE_REST +
      level * (VUMeterRenderer.ANGLE_MAX - VUMeterRenderer.ANGLE_REST) * 3;
    this.#targetAngle = Math.min(VUMeterRenderer.ANGLE_MAX + 5, mapped);

    // Smooth interpolation
    this.#angle += (this.#targetAngle - this.#angle) * VUMeterRenderer.SMOOTH;

    // Decay target back to rest
    this.#targetAngle += (VUMeterRenderer.ANGLE_REST - this.#targetAngle) * VUMeterRenderer.DECAY;

    // Clamp final display
    const displayAngle = Math.max(VUMeterRenderer.ANGLE_REST, Math.min(VUMeterRenderer.ANGLE_MAX + 5, this.#angle));

    if (this.#needleEl) {
      this.#needleEl.style.transform = `rotate(${displayAngle.toFixed(1)}deg)`;
    }

    // Update ARIA
    if (this.#meterEl) {
      const pct = Math.max(0, Math.min(100,
        ((displayAngle - VUMeterRenderer.ANGLE_REST) /
          (VUMeterRenderer.ANGLE_MAX - VUMeterRenderer.ANGLE_REST)) * 100
      ));
      this.#meterEl.setAttribute('aria-valuenow', Math.round(pct));
    }
  }

  /**
   * Reset needle to rest position.
   */
  reset() {
    this.#angle = VUMeterRenderer.ANGLE_REST;
    this.#targetAngle = VUMeterRenderer.ANGLE_REST;
    if (this.#needleEl) {
      this.#needleEl.style.transform = `rotate(${VUMeterRenderer.ANGLE_REST}deg)`;
    }
    if (this.#meterEl) {
      this.#meterEl.setAttribute('aria-valuenow', '0');
    }
  }
}
