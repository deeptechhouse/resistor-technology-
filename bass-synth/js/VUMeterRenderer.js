/**
 * VUMeterRenderer.js — SVG Needle VU Meter
 * LakeShoreDr Bass Synth · Resistor Technology
 */

export class VUMeterRenderer {
  #container;
  #needleEl = null;
  #meterEl = null;
  #angle = -30;
  #targetAngle = -30;

  static ANGLE_REST = -30;
  static ANGLE_MAX = 20;
  static SMOOTH = 0.15;
  static DECAY = 0.06;

  constructor(container) {
    this.#container = container;
    this.#render();
  }

  #render() {
    this.#container.innerHTML = `
      <div class="bs__vu-meter" role="meter" aria-label="Audio level meter"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="bs__vu-face">VU</span>
        <div class="bs__vu-scale" aria-hidden="true"></div>
        <div class="bs__vu-marks" aria-hidden="true">
          <span>-20</span><span>-10</span><span>-3</span><span>0</span><span>+3</span>
        </div>
        <div class="bs__vu-needle"></div>
      </div>
    `;
    this.#needleEl = this.#container.querySelector('.bs__vu-needle');
    this.#meterEl = this.#container.querySelector('.bs__vu-meter');
  }

  update(level) {
    const mapped = VUMeterRenderer.ANGLE_REST +
      level * (VUMeterRenderer.ANGLE_MAX - VUMeterRenderer.ANGLE_REST) * 3;
    this.#targetAngle = Math.min(VUMeterRenderer.ANGLE_MAX + 5, mapped);
    this.#angle += (this.#targetAngle - this.#angle) * VUMeterRenderer.SMOOTH;
    this.#targetAngle += (VUMeterRenderer.ANGLE_REST - this.#targetAngle) * VUMeterRenderer.DECAY;
    const displayAngle = Math.max(VUMeterRenderer.ANGLE_REST, Math.min(VUMeterRenderer.ANGLE_MAX + 5, this.#angle));
    if (this.#needleEl) {
      this.#needleEl.style.transform = `rotate(${displayAngle.toFixed(1)}deg)`;
    }
    if (this.#meterEl) {
      const pct = Math.max(0, Math.min(100,
        ((displayAngle - VUMeterRenderer.ANGLE_REST) /
          (VUMeterRenderer.ANGLE_MAX - VUMeterRenderer.ANGLE_REST)) * 100
      ));
      this.#meterEl.setAttribute('aria-valuenow', Math.round(pct));
    }
  }

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
