/**
 * synth-hero.js — Synth Dock Controls
 * Resistor Technology · resistor.technology
 *
 * Handles: rotary knobs (dock), VU meter needle, product switches
 *
 * GRAIN knob — Scroll speed/direction controller
 *   Center (0°) = stopped. Clockwise = scroll down. Counter-clockwise = scroll up.
 *   Quadratic speed scaling for fine control near center.
 *
 * GLOW knob — Color inversion (photo negative) controller
 *   Full left = normal colors. Full right = fully inverted.
 *   Drives --color-invert CSS property (0..1) for mix-blend-mode overlay.
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Utility: Clamp value between min and max ---
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  // --- Utility: Map value from one range to another ---
  function mapRange(val, inMin, inMax, outMin, outMax) {
    return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
  }

  // ============================================================
  // GRAIN SCROLL STATE (module-level)
  // ============================================================

  var grainScrollSpeed = 0;
  var isGrainScrolling = false;
  var SCROLL_MAX_SPEED = 12;   // max pixels per frame at ±140°
  var SCROLL_DEAD_ZONE = 5;    // degrees around center with no scroll

  function grainScrollLoop() {
    if (Math.abs(grainScrollSpeed) > 0.05) {
      window.scrollBy(0, grainScrollSpeed);
      requestAnimationFrame(grainScrollLoop);
    } else {
      isGrainScrolling = false;
    }
  }

  // ============================================================
  // ROTARY KNOBS (in dock)
  // ============================================================

  var knobs = document.querySelectorAll('.synth-dock .knob-wrap[data-control]');

  knobs.forEach(function (wrap) {
    var knobEl = wrap.querySelector('.knob');
    var control = wrap.dataset.control;

    // State: angle in degrees (-140 to +140, 0 = noon)
    // GRAIN starts at center (0°, no scroll)
    // GLOW starts at full left (-140°, no inversion)
    var angle = control === 'grain' ? 0 : -140;
    var isDragging = false;
    var startY = 0;
    var startAngle = 0;

    function updateKnob() {
      knobEl.style.transform = 'rotate(' + angle + 'deg)';

      if (control === 'grain') {
        // --- Scroll Speed Controller ---
        // Dead zone around center
        if (Math.abs(angle) < SCROLL_DEAD_ZONE) {
          grainScrollSpeed = 0;
        } else {
          // Quadratic scaling: fine control near center, fast at extremes
          var norm = angle / 140; // -1 to 1
          grainScrollSpeed = norm * Math.abs(norm) * SCROLL_MAX_SPEED;
        }

        wrap.setAttribute('aria-valuenow', Math.round(mapRange(angle, -140, 140, 0, 100)));

        // Start scroll loop if not already running
        if (!prefersReducedMotion && !isGrainScrolling && Math.abs(grainScrollSpeed) > 0.05) {
          isGrainScrolling = true;
          requestAnimationFrame(grainScrollLoop);
        }

      } else if (control === 'glow') {
        // --- Color Inversion Controller ---
        var normalized = mapRange(angle, -140, 140, 0, 1);
        document.documentElement.style.setProperty('--color-invert', normalized.toFixed(3));
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

    wrap.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);

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

    updateKnob();
  });

  // ============================================================
  // VU METER — Scroll Velocity Needle
  // ============================================================

  var needle = document.querySelector('.vu-meter__needle');
  var vuMeter = document.querySelector('.vu-meter');

  if (needle && !prefersReducedMotion) {
    var lastScrollY = window.scrollY;
    var lastTime = performance.now();
    var vuAngle = -30; // resting position
    var targetAngle = -30;

    function updateVU() {
      // Smooth interpolation toward target
      vuAngle += (targetAngle - vuAngle) * 0.12;
      needle.style.transform = 'rotate(' + vuAngle.toFixed(1) + 'deg)';

      // Update ARIA
      if (vuMeter) {
        var pct = clamp(mapRange(vuAngle, -30, 20, 0, 100), 0, 100);
        vuMeter.setAttribute('aria-valuenow', Math.round(pct));
      }

      // Decay target back to rest
      targetAngle += (-30 - targetAngle) * 0.05;

      requestAnimationFrame(updateVU);
    }

    window.addEventListener('scroll', function () {
      var now = performance.now();
      var dt = now - lastTime;
      if (dt < 10) return;

      var dy = Math.abs(window.scrollY - lastScrollY);
      var velocity = dy / dt; // px per ms

      // Map velocity to angle: -30 (rest) to +20 (max)
      targetAngle = clamp(mapRange(velocity, 0, 3, -30, 20), -30, 20);

      lastScrollY = window.scrollY;
      lastTime = now;
    }, { passive: true });

    requestAnimationFrame(updateVU);
  }

  // ============================================================
  // PRODUCT SWITCHES — Scroll to section + active state
  // ============================================================

  var dockSwitches = document.querySelectorAll('.dock-switch[data-target]');
  var navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;

  dockSwitches.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.dataset.target;
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        var top = targetEl.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  // Observe product sections to update active switch state
  var switchSections = [];
  dockSwitches.forEach(function (btn) {
    var sectionId = btn.dataset.target;
    var sectionEl = document.getElementById(sectionId);
    if (sectionEl) {
      switchSections.push({ btn: btn, section: sectionEl });
    }
  });

  if (switchSections.length > 0) {
    var switchObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var match = switchSections.find(function (s) {
            return s.section === entry.target;
          });
          if (!match) return;

          if (entry.isIntersecting) {
            match.btn.classList.add('is-active');
          } else {
            match.btn.classList.remove('is-active');
          }
        });
      },
      { threshold: 0.3 }
    );

    switchSections.forEach(function (s) {
      switchObserver.observe(s.section);
    });
  }

})();
