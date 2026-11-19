/* =========================================================
   HOROLOGE — ui.js (мобільне меню, reveal-анімації, стан шапки)
   Без залежності. Підключається на всіх сторінках.
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;

  // 1) Прогресивне покращення: приховування reveal-блоків вмикається
  //    лише після того, як цей скрипт підтвердив, що JS працює.
  doc.documentElement.classList.add('js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 2) Мобільне меню ----------
  var toggle = doc.querySelector('.nav-toggle');
  var nav = doc.querySelector('.nav');

  function setMenu(open) {
    if (!toggle || !nav) return;
    body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(!body.classList.contains('menu-open'));
    });

    // Клік по будь-якому посиланню меню закриває панель
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });

    // Escape закриває меню
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false);
    });
  }

  // ---------- 3) Scroll reveal ----------
  var revealEls = doc.querySelectorAll('.reveal');

  function revealAll() {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  if (reduce) {
    revealAll();
  } else if ('IntersectionObserver' in window) {
    try {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      revealEls.forEach(function (el) { io.observe(el); });
    } catch (err) {
      revealAll(); // аварійний варіант: показуємо все одразу
    }
  } else {
    revealAll();
  }

  // ---------- 4) Стан шапки під час прокрутки ----------
  var header = doc.querySelector('.header');
  var ticking = false;

  function syncHeader() {
    if (header) header.classList.toggle('header--scrolled', window.scrollY > 8);
  }

  if (header && !reduce) {
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          syncHeader();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    syncHeader();
  }
})();