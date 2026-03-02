/**
 * main.js — Navigation, Smooth Scroll, Mobile Menu
 * Resistor Technology · resistor.technology
 */

(function () {
  'use strict';

  // ============================================================
  // NAVIGATION — Scroll blur effect
  // ============================================================

  var nav = document.querySelector('.nav');

  if (nav) {
    var scrollThreshold = 50;

    function updateNav() {
      if (window.scrollY > scrollThreshold) {
        nav.classList.add('is-scrolled');
      } else {
        nav.classList.remove('is-scrolled');
      }
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  // ============================================================
  // MOBILE MENU — Hamburger toggle
  // ============================================================

  var toggle = document.querySelector('.nav__toggle');
  var overlay = document.querySelector('.nav__mobile-overlay');
  var mobileLinks = document.querySelectorAll('.nav__mobile-link');

  if (toggle && overlay) {
    function openMenu() {
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      if (overlay.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close menu when a link is clicked
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Close menu on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  // ============================================================
  // SMOOTH SCROLL — For anchor links
  // ============================================================

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href').substring(1);
      var target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        var offset = nav ? nav.offsetHeight : 0;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

})();
