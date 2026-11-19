// Обране (віліст) на localStorage. Підключається на всіх сторінках:
// на будь-якій сторінці оновлює лічильник сердечка у шапці та стан кнопок «♥»,
// на favorites.html рендерить сітку обраного з повною інтерактивністю.
// Потребує: products.js (PRODUCTS, CATEGORIES, GENDERS, STOCK) і cart.js (window.Cart).

// Іконка серця — спільна для всіх карток і кнопки в модалці.
window.HEART_SVG = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`;

(() => {
  const KEY = 'horologe_fav';
  const formatPrice = (n) => n.toLocaleString('uk-UA') + ' ₴';

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // ---------- Робота з localStorage ----------
  function getFav() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveFav(fav) {
    localStorage.setItem(KEY, JSON.stringify(fav));
  }

  const has = (id) => getFav().includes(Number(id));
  const count = () => getFav().length;

  // ---------- Лічильник у шапці ----------
  function updateHeader() {
    const el = document.getElementById('likes-count');
    if (!el) return;
    const n = count();
    el.textContent = n;
    el.classList.toggle('hidden', n === 0);
  }

  // Синхронізувати стан усіх кнопок «♥» на сторінці
  function syncLikes() {
    document.querySelectorAll('[data-fav]').forEach((btn) => {
      const active = has(btn.dataset.fav);
      btn.classList.toggle('is-fav', active);
      btn.setAttribute('aria-label', active ? 'Прибрати з обраного' : 'В обране');
      btn.setAttribute('title', active ? 'Прибрати з обраного' : 'В обране');
      if (btn.id === 'm-fav') btn.setAttribute('aria-pressed', active);
    });
  }

  // ---------- Публічне API ----------
  window.Fav = {
    toggle(id) {
      const fav = getFav();
      const n = Number(id);
      const i = fav.indexOf(n);
      if (i === -1) fav.push(n);
      else fav.splice(i, 1);
      saveFav(fav);
      updateHeader();
      syncLikes();
      renderFavPage();
      return has(n);
    },

    has,
    count,

    items() {
      return getFav()
        .map((id) => PRODUCTS.find((p) => p.id === id))
        .filter(Boolean);
    },

    remove(id) {
      saveFav(getFav().filter((i) => i !== Number(id)));
      updateHeader();
      syncLikes();
      renderFavPage();
    },

    updateHeader,
    syncLikes,
  };

  // ---------- Кліки по сердечках ----------
  // Ловимо у фазі перехоплення, щоб клік по «♥» не відкрив модалку
  // і не повів за посиланням картки на головній.
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('[data-fav]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      window.Fav.toggle(btn.dataset.fav);
    },
    true
  );

  // ---------- Рендер на favorites.html ----------
  const favGrid = document.getElementById('fav-grid');
  const favEmpty = document.getElementById('fav-empty');
  const favCountLabel = document.getElementById('fav-count');

  function cardHtml(p) {
    return `
      <article class="card" data-id="${p.id}">
        <button class="card__like is-fav" data-fav="${p.id}"
                aria-label="Прибрати з обраного" title="Прибрати з обраного">
          ${window.HEART_SVG}
        </button>
        <div class="card__media" data-open="${p.id}">
          <img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy"
               onerror="this.onerror=null;this.src='images/watch.svg';">
          <span class="card__category">${GENDERS[p.gender]}</span>
          <span class="card__stock card__stock--${p.stock || 'in'}">${STOCK[p.stock] || STOCK.in}</span>
        </div>
        <div class="card__body">
          <p class="card__brand">${p.brand}</p>
          <h3 class="card__name" data-open="${p.id}">${p.name}</h3>
          <div class="card__row">
            <span class="card__price">${formatPrice(p.price)}</span>
            <button class="card__add" data-add="${p.id}" aria-label="Додати в кошик" title="У кошик">+</button>
          </div>
        </div>
      </article>`;
  }

  function renderFavPage() {
    updateHeader();
    if (!favGrid) return;

    const items = window.Fav.items();

    favEmpty.classList.toggle('hidden', items.length > 0);
    favGrid.classList.toggle('hidden', items.length === 0);

    if (favCountLabel) {
      favCountLabel.textContent = items.length
        ? 'В обраному ' + items.length + ' ' + plural(items.length, 'модель', 'моделі', 'моделей')
        : '';
    }

    favGrid.innerHTML = items.map(cardHtml).join('');
  }

  // Кліки по лівій частині картки (фото, назва) — перехід у каталог статі,
  // по кнопці «+» — додавання в кошик.
  if (favGrid) {
    favGrid.addEventListener('click', (e) => {
      const openEl = e.target.closest('[data-open]');
      if (openEl) {
        const p = PRODUCTS.find((pr) => pr.id === Number(openEl.dataset.open));
        if (p) location.href = p.gender === 'men' ? 'men.html' : 'women.html';
        return;
      }

      const addEl = e.target.closest('[data-add]');
      if (!addEl) return;
      window.Cart.add(addEl.dataset.add, 1);

      // Короткий зворотний зв'язок кнопкою
      const btn = addEl;
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '+'; }, 700);
    });
  }

  // ---------- Старт ----------
  updateHeader();
  syncLikes();
  renderFavPage();
})();
