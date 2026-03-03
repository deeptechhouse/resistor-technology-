/**
 * KnobController.js — Reusable Rotary Knob
 * LakeShoreDr Bass Synth · Resistor Technology
 */

export class KnobController {
  #container;
  #knobEl;
  #value;
  #min;
  #max;
  #onChange;
  #angle;
  #isDragging = false;
  #startY = 0;
  #startAngle = 0;

  static SENSITIVITY = 1.2;
  static KEY_STEP = 10;
  static ANGLE_MIN = -140;
  static ANGLE_MAX = 140;

  constructor(container, opts = {}) {
    this.#container = container;
    this.#min = opts.min ?? 0;
    this.#max = opts.max ?? 1;
    this.#value = opts.value ?? 0.5;
    this.#onChange = opts.onChange ?? null;
    this.#angle = this.#valueToAngle(this.#value);
    this.#render(opts.label || '', opts.size || 'normal');
    this.#bindEvents();
    this.#updateVisual();
  }

  get value() { return this.#value; }

  setValue(v) {
    this.#value = Math.max(this.#min, Math.min(this.#max, v));
    this.#angle = this.#valueToAngle(this.#value);
    this.#updateVisual();
  }

  #valueToAngle(v) {
    const norm = (v - this.#min) / (this.#max - this.#min);
    return KnobController.ANGLE_MIN + norm * (KnobController.ANGLE_MAX - KnobController.ANGLE_MIN);
  }

  #angleToValue(a) {
    const norm = (a - KnobController.ANGLE_MIN) / (KnobController.ANGLE_MAX - KnobController.ANGLE_MIN);
    return this.#min + norm * (this.#max - this.#min);
  }

  #render(label, size) {
    const sizeClass = size === 'small' ? ' bs__knob--small' : '';
    this.#container.innerHTML = `
      <div class="bs__knob-wrap${sizeClass}"
           role="slider"
           aria-label="${label}"
           aria-valuemin="${this.#min}"
           aria-valuemax="${this.#max}"
           aria-valuenow="${this.#value.toFixed(2)}"
           tabindex="0">
        <span class="bs__knob-label">${label}</span>
        <div class="bs__knob">
          <div class="bs__knob-cap"></div>
        </div>
      </div>
    `;
    this.#knobEl = this.#container.querySelector('.bs__knob');
  }

  #bindEvents() {
    const wrap = this.#container.querySelector('.bs__knob-wrap');

    const onDown = (e) => {
      this.#isDragging = true;
      this.#startY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      this.#startAngle = this.#angle;
      wrap.classList.add('is-active');
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!this.#isDragging) return;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      const delta = this.#startY - clientY;
      this.#angle = this.#clamp(
        this.#startAngle + delta * KnobController.SENSITIVITY,
        KnobController.ANGLE_MIN,
        KnobController.ANGLE_MAX
      );
      this.#value = this.#angleToValue(this.#angle);
      this.#updateVisual();
      this.#emitChange();
    };

    const onUp = () => {
      this.#isDragging = false;
      wrap.classList.remove('is-active');
    };

    wrap.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    wrap.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);

    wrap.addEventListener('keydown', (e) => {
      let changed = false;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        this.#angle = this.#clamp(this.#angle + KnobController.KEY_STEP, KnobController.ANGLE_MIN, KnobController.ANGLE_MAX);
        changed = true;
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        this.#angle = this.#clamp(this.#angle - KnobController.KEY_STEP, KnobController.ANGLE_MIN, KnobController.ANGLE_MAX);
        changed = true;
      }
      if (changed) {
        this.#value = this.#angleToValue(this.#angle);
        this.#updateVisual();
        this.#emitChange();
        e.preventDefault();
      }
    });
  }

  #updateVisual() {
    if (this.#knobEl) {
      this.#knobEl.style.transform = `rotate(${this.#angle}deg)`;
    }
    const wrap = this.#container.querySelector('.bs__knob-wrap');
    if (wrap) {
      wrap.setAttribute('aria-valuenow', this.#value.toFixed(2));
    }
  }

  #emitChange() {
    if (this.#onChange) {
      this.#onChange(this.#value);
    }
  }

  #clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }
}
