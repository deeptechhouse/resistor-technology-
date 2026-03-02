/**
 * synth-hero.js — Interactive Synth Panel Controls
 * Resistor Technology · resistor.technology
 *
 * Handles: rotary knobs, vertical fader, VU meter, patch jack
 * All controls map to CSS custom properties on :root
 */

(function () {
  'use strict';

  // Bail if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Utility: Clamp value between min and max ---
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  // --- Utility: Map value from one range to another ---
  function mapRange(val, inMin, inMax, outMin, outMax) {
    return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
  }

  // ============================================================
  // ROTARY KNOBS
  // ============================================================

  const knobs = document.querySelectorAll('.knob-wrap[data-control]');

  knobs.forEach(function (wrap) {
    const knobEl = wrap.querySelector('.knob');
    const control = wrap.dataset.control;

    // State: angle in degrees (-140 to +140, 0 = noon)
    let angle = control === 'grain' ? -100 : -60;
    let isDragging = false;
    let startY = 0;
    let startAngle = 0;

    function updateKnob() {
      knobEl.style.transform = 'rotate(' + angle + 'deg)';

      // Map angle (-140..+140) to 0..1
      var normalized = mapRange(angle, -140, 140, 0, 1);

      if (control === 'grain') {
        // Grain: 0.00 to 0.10
        document.documentElement.style.setProperty('--grain-opacity', (normalized * 0.10).toFixed(3));
        wrap.setAttribute('aria-valuenow', Math.round(normalized * 100));
      } else if (control === 'glow') {
        // Glow: 0.0 to 1.0
        document.documentElement.style.setProperty('--glow-intensity', normalized.toFixed(2));
        wrap.setAttribute('aria-valuenow', Math.round(normalized * 100));
      }
    }

    function onPointerDown(e) {
      isDragging = true;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      startAngle = angle;
      wrap.classList.add('is-active');
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      var clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      var delta = startY - clientY;
      angle = clamp(startAngle + delta * 1.2, -140, 140);
      updateKnob();
    }

    function onPointerUp() {
      isDragging = false;
      wrap.classList.remove('is-active');
    }

    // Mouse events
    wrap.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);

    // Touch events
    wrap.addEventListener('touchstart', onPointerDown, { passive: false });
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);

    // Keyboard: Arrow Up/Down to adjust
    wrap.addEventListener('keydown', function (e) {
      var step = 10;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        angle = clamp(angle + step, -140, 140);
        updateKnob();
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        angle = clamp(angle - step, -140, 140);
        updateKnob();
        e.preventDefault();
      }
    });

    // Initialize
    updateKnob();
  });

  // ============================================================
  // VERTICAL FADER
  // ============================================================

  var faderWrap = document.querySelector('.fader-wrap[data-control="depth"]');
  if (faderWrap) {
    var fader = faderWrap.querySelector('.fader');
    var cap = faderWrap.querySelector('.fader__cap');
    var faderHeight = 140;
    var capHeight = 18;
    var maxTravel = faderHeight - capHeight;

    // Position as fraction 0 (top) to 1 (bottom)
    var faderPos = 0.5;
    var isDraggingFader = false;
    var faderStartY = 0;
    var faderStartPos = 0;

    function updateFader() {
      var topPx = faderPos * maxTravel;
      cap.style.top = topPx + 'px';

      // Map position: top=1 (max depth), bottom=0 (no depth)
      var depth = 1 - faderPos;
      document.documentElement.style.setProperty('--parallax-depth', depth.toFixed(2));
      faderWrap.setAttribute('aria-valuenow', Math.round(depth * 100));
    }

    function onFaderDown(e) {
      isDraggingFader = true;
      faderStartY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      faderStartPos = faderPos;
      faderWrap.classList.add('is-active');
      e.preventDefault();
    }

    function onFaderMove(e) {
      if (!isDraggingFader) return;
      var clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      var delta = clientY - faderStartY;
      faderPos = clamp(faderStartPos + delta / maxTravel, 0, 1);
      updateFader();
    }

    function onFaderUp() {
      isDraggingFader = false;
      faderWrap.classList.remove('is-active');
    }

    fader.addEventListener('mousedown', onFaderDown);
    document.addEventListener('mousemove', onFaderMove);
    document.addEventListener('mouseup', onFaderUp);

    fader.addEventListener('touchstart', onFaderDown, { passive: false });
    document.addEventListener('touchmove', onFaderMove, { passive: false });
    document.addEventListener('touchend', onFaderUp);

    // Keyboard
    faderWrap.addEventListener('keydown', function (e) {
      var step = 0.05;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        faderPos = clamp(faderPos - step, 0, 1);
        updateFader();
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        faderPos = clamp(faderPos + step, 0, 1);
        updateFader();
        e.preventDefault();
      }
    });

    updateFader();
  }

  // ============================================================
  // VU METER — Scroll Velocity Driven
  // ============================================================

  var needle = document.querySelector('.vu-meter__needle');
  if (needle && !prefersReducedMotion) {
    var lastScrollY = window.scrollY;
    var lastTime = performance.now();
    var vuAngle = -30; // resting position
    var targetAngle = -30;
    var animFrameId = null;

    function updateVU() {
      // Smooth interpolation toward target
      vuAngle += (targetAngle - vuAngle) * 0.12;
      needle.style.setProperty('--vu-angle', vuAngle.toFixed(1) + 'deg');
      needle.style.transform = 'rotate(' + vuAngle.toFixed(1) + 'deg)';

      // Decay target back to rest
      targetAngle += (-30 - targetAngle) * 0.05;

      animFrameId = requestAnimationFrame(updateVU);
    }

    window.addEventListener('scroll', function () {
      var now = performance.now();
      var dt = now - lastTime;
      if (dt < 10) return; // throttle

      var dy = Math.abs(window.scrollY - lastScrollY);
      var velocity = dy / dt; // px per ms

      // Map velocity to angle: -30 (rest) to +20 (max)
      targetAngle = clamp(mapRange(velocity, 0, 3, -30, 20), -30, 20);

      lastScrollY = window.scrollY;
      lastTime = now;
    }, { passive: true });

    animFrameId = requestAnimationFrame(updateVU);
  }

  // ============================================================
  // PATCH JACK — Scroll to Contact
  // ============================================================

  var patchJack = document.querySelector('.patch-jack[data-target]');
  if (patchJack) {
    function activateJack() {
      var targetId = patchJack.dataset.target;
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    }

    patchJack.addEventListener('click', activateJack);
    patchJack.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        activateJack();
        e.preventDefault();
      }
    });
  }

})();
