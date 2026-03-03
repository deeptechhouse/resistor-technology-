/**
 * KnobController.js — Reusable Rotary Knob
 * Dr_Fun Drum Machine · Resistor Technology
 *
 * Drag (mouse + touch) and keyboard-driven rotary knob with ARIA support.
 * Matches the knob interaction from the site's synth dock (synth-hero.js).
 *
 * Usage:
 *   const knob = new KnobController(container, {
 *     label: 'Volume', min: 0, max: 1, value: 0.8, onChange: (v) => {}
 *   });
 */

export class KnobController {
  /** @type {HTMLElement} */
  #container;

  /** @type {HTMLElement} */
  #knobEl;

  /** @type {number} */
  #value;

  /** @type {number} */
  #min;

  /** @type {number} */
  #max;

  /** @type {Function|null} */
  #onChange;

  /** @type {number} — current angle in degrees (-140 to +140) */
  #angle;

  /** @type {boolean} */
  #isDragging = false;

  /** @type {number} */
  #startY = 0;

  /** @type {number} */
  #startAngle = 0;

  /** @type {number} — drag sensitivity (px to degrees) */
  static SENSITIVITY = 1.2;

  /** @type {number} — keyboard step in degrees */
  static KEY_STEP = 10;

  /** @type {number} */
  static ANGLE_MIN = -140;

  /** @type {number} */
  static ANGLE_MAX = 140;

  /**
   * @param {HTMLElement} container — parent element to build into
   * @param {object} opts
   * @param {string} opts.label — knob label text
   * @param {number} [opts.min=0]
   * @param {number} [opts.max=1]
   * @param {number} [opts.value=0.5]
   * @param {string} [opts.size='normal'] — 'normal' or 'small'
   * @param {Function} [opts.onChange]
   */
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

  get value() {
    return this.#value;
  }

  /**
   * Set the knob value programmatically.
   * @param {number} v
   */
  setValue(v) {
    this.#value = Math.max(this.#min, Math.min(this.#max, v));
    this.#angle = this.#valueToAngle(this.#value);
    this.#updateVisual();
  }

  /**
   * Map a value to knob angle.
   * @param {number} v
   * @returns {number}
   */
  #valueToAngle(v) {
    const norm = (v - this.#min) / (this.#max - this.#min);
    return KnobController.ANGLE_MIN + norm * (KnobController.ANGLE_MAX - KnobController.ANGLE_MIN);
  }

  /**
   * Map a knob angle to a value.
   * @param {number} a
   * @returns {number}
   */
  #angleToValue(a) {
    const norm = (a - KnobController.ANGLE_MIN) / (KnobController.ANGLE_MAX - KnobController.ANGLE_MIN);
    return this.#min + norm * (this.#max - this.#min);
  }

  /**
   * Build the DOM for the knob.
   * @param {string} label
   * @param {string} size
   */
  #render(label, size) {
    const sizeClass = size === 'small' ? ' dm__knob--small' : '';
    this.#container.innerHTML = `
      <div class="dm__knob-wrap${sizeClass}"
           role="slider"
           aria-label="${label}"
           aria-valuemin="${this.#min}"
           aria-valuemax="${this.#max}"
           aria-valuenow="${this.#value.toFixed(2)}"
           tabindex="0">
        <span class="dm__knob-label">${label}</span>
        <div class="dm__knob">
          <div class="dm__knob-cap"></div>
        </div>
      </div>
    `;
    this.#knobEl = this.#container.querySelector('.dm__knob');
  }

  /**
   * Bind mouse, touch, and keyboard events.
   */
  #bindEvents() {
    const wrap = this.#container.querySelector('.dm__knob-wrap');

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

  /**
   * Update the knob visual and ARIA attributes.
   */
  #updateVisual() {
    if (this.#knobEl) {
      this.#knobEl.style.transform = `rotate(${this.#angle}deg)`;
    }
    const wrap = this.#container.querySelector('.dm__knob-wrap');
    if (wrap) {
      wrap.setAttribute('aria-valuenow', this.#value.toFixed(2));
    }
  }

  /**
   * Fire the onChange callback.
   */
  #emitChange() {
    if (this.#onChange) {
      this.#onChange(this.#value);
    }
  }

  /**
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  #clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }
}
