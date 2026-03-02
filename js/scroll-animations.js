/**
 * scroll-animations.js — Scroll-Driven Reveals & Parallax
 * Resistor Technology · resistor.technology
 *
 * Uses IntersectionObserver for performant scroll-triggered animations.
 * No scroll event listeners for reveal animations.
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ============================================================
  // SCROLL REVEAL — Fade-in elements as they enter viewport
  // ============================================================

  var revealElements = document.querySelectorAll('.reveal');

  if (prefersReducedMotion) {
    // If reduced motion, make everything visible immediately
    revealElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Unobserve after revealing (one-time animation)
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  // ============================================================
  // PARALLAX (CSS custom property driven, minimal)
  // ============================================================

  if (!prefersReducedMotion) {
    var parallaxElements = document.querySelectorAll('[data-parallax]');

    if (parallaxElements.length > 0) {
      var parallaxObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.dataset.parallaxActive = 'true';
            } else {
              entry.target.dataset.parallaxActive = 'false';
            }
          });
        },
        { threshold: 0 }
      );

      parallaxElements.forEach(function (el) {
        parallaxObserver.observe(el);
      });

      // Only use scroll listener for active parallax elements
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (!ticking) {
          requestAnimationFrame(function () {
            var depth = parseFloat(
              getComputedStyle(document.documentElement)
                .getPropertyValue('--parallax-depth')
            ) || 0.5;

            parallaxElements.forEach(function (el) {
              if (el.dataset.parallaxActive !== 'true') return;
              var rect = el.getBoundingClientRect();
              var center = rect.top + rect.height / 2;
              var viewCenter = window.innerHeight / 2;
              var offset = (center - viewCenter) * depth * 0.1;
              el.style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
            });

            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }
  }

})();
