// Логіка каталогу: рендер сітки, фільтри, пошук, сортування, модалка товару.
// Стать каталогу задається атрибутом <body data-gender="men|women">.
// Підтримує #grid (каталог) та #about-grid (головна сторінка).
// Потребує: products.js (PRODUCTS, CATEGORIES, GENDERS) і cart.js (window.Cart).

(() => {
  const gender = document.body.dataset.gender || null;
  const isAboutPage = !!document.getElementById('about-grid');
  const isCatalogPage = !!document.getElementById('grid');

  // Не рендеримо нічого, якщо сторінка не є каталогом або about-секцією
  if (!gender && !isAboutPage && !isCatalogPage) return;

  const state = { category: 'all', query: '', sort: 'default' };

  // ---------- Утиліти ----------
  const formatPrice = (n) => n.toLocaleString('uk-UA') + ' ₴';

  function findProduct(id) {
    return PRODUCTS.find((p) => p.id === Number(id));
  }

  // ---------- Рендер ----------
  function getFilteredList() {
    let list = gender ? PRODUCTS.filter((p) => p.gender === gender) : [...PRODUCTS];

    if (state.category !== 'all') {
      list = list.filter((p) => p.category === state.category);
    }

    const q = state.query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      );
    }

    if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);

    return list;
  }

  function render() {
    const list = getFilteredList();

    // Рендер на каталог сторінці (#grid)
    if (isCatalogPage) {
      const grid = document.getElementById('grid');
      const emptyState = document.getElementById('empty-state');
      const countEl = document.getElementById('catalog-count');

      if (list.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        countEl.textContent = '';
      } else {
        emptyState.classList.add('hidden');
        grid.innerHTML = list.map(cardHtml).join('');
        window.Fav.syncLikes();
        const found = new Intl.NumberFormat('uk-UA').format(list.length);
        countEl.textContent = 'Показано моделей: ' + found;
      }
    }

    // Рендер на about-секції (#about-grid) — тільки 4 featured
    if (isAboutPage) {
      const aboutGrid = document.getElementById('about-grid');
      if (!aboutGrid) return;

      const featured = PRODUCTS.filter((p) => p.featured).slice(0, 4);
      aboutGrid.innerHTML = featured.map((p) => `
          <article class="card" data-id="${p.id}">
            <button class="card__like" data-fav="${p.id}"
                    aria-label="В обране" title="В обране">
              ${window.HEART_SVG}
            </button>
            <a class="card__media" href="product.html?id=${p.id}">
              <img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy"
                   onerror="this.onerror=null;this.src='images/watch.svg';">
              <span class="card__category">${GENDERS[p.gender]}</span>
              <span class="card__stock card__stock--${p.stock || 'in'}">${STOCK[p.stock] || STOCK.in}</span>
            </a>
            <div class="card__body">
              <p class="card__brand">${p.brand}</p>
              <h3 class="card__name"><a href="product.html?id=${p.id}">${p.name}</a></h3>
              <div class="card__row">
                <span class="card__price">${formatPrice(p.price)}</span>
                <button class="card__add" data-add="${p.id}" aria-label="Додати в кошик" title="У кошик">+</button>
              </div>
            </div>
          </article>`;
      }).join('');
      window.Fav.syncLikes();
    }
  }

  function cardHtml(p) {
    return `
      <article class="card" data-id="${p.id}">
        <button class="card__like" data-fav="${p.id}"
                aria-label="В обране" title="В обране">
          ${window.HEART_SVG}
        </button>
        <a class="card__media" href="product.html?id=${p.id}">
          <img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy"
               onerror="this.onerror=null;this.src='images/watch.svg';">
          <span class="card__category">${CATEGORIES[p.category]}</span>
          <span class="card__stock card__stock--${p.stock || 'in'}">${STOCK[p.stock] || STOCK.in}</span>
        </a>
        <div class="card__body">
          <p class="card__brand">${p.brand}</p>
          <h3 class="card__name"><a href="product.html?id=${p.id}">${p.name}</a></h3>
          <div class="card__row">
            <span class="card__price">${formatPrice(p.price)}</span>
            <button class="card__add" data-add="${p.id}" aria-label="Додати в кошик" title="У кошик">+</button>
          </div>
          <p class="card__desc">${p.description}</p>
        </div>
      </article>`;
  }

  // Підсвітка активного фільтра-категорії
  function setActiveChip(cat) {
    const filters = document.getElementById('category-filters');
    if (!filters) return;
    filters.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.cat === cat);
    });
  }

  // ---------- Модалка ----------
  const modal = document.getElementById('modal');
  if (modal) {
    const mImage = document.getElementById('m-image');
    const mBrand = document.getElementById('m-brand');
    const mName = document.getElementById('m-name');
    const mCategory = document.getElementById('m-category');
    const mDescription = document.getElementById('m-description');
    const mSpecs = document.getElementById('m-specs');
    const mPrice = document.getElementById('m-price');
    const mStock = document.getElementById('m-stock');
    const mFav = document.getElementById('m-fav');
    const qtyValue = document.getElementById('qty-value');

    let currentId = null;
    let currentQty = 1;

    function openModal(id) {
      const p = findProduct(id);
      if (!p) return;

      currentId = p.id;
      currentQty = 1;
      if (qtyValue) qtyValue.textContent = '1';

      if (mImage) {
        mImage.src = p.image;
        mImage.onerror = () => { mImage.onerror = null; mImage.src = 'images/watch.svg'; };
        mImage.alt = `${p.brand} ${p.name}`;
      }
      if (mBrand) mBrand.textContent = p.brand;
      if (mName) mName.textContent = p.name;
      if (mCategory) mCategory.textContent = CATEGORIES[p.category];
      if (mDescription) mDescription.textContent = p.description;
      if (mPrice) mPrice.textContent = formatPrice(p.price);

      if (mStock) {
        mStock.textContent = STOCK[p.stock] || STOCK.in;
        mStock.className = 'modal__stock modal__stock--' + (p.stock || 'in');
      }
      if (mFav) {
        mFav.dataset.fav = p.id;
        mFav.classList.toggle('is-fav', window.Fav.has(p.id));
      }

      if (mSpecs) {
        mSpecs.innerHTML = Object.entries(p.specs)
          .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
          .join('');
      }

      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      currentId = null;
    }

    function updateQty(delta) {
      currentQty = Math.min(99, Math.max(1, currentQty + delta));
      if (qtyValue) qtyValue.textContent = currentQty;
    }

    // Кліки по карточках каталогу
    const grid = document.getElementById('grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const openEl = e.target.closest('[data-open]');
        if (openEl) {
          openModal(openEl.dataset.open);
          return;
        }
        const addEl = e.target.closest('[data-add]');
        if (addEl) {
          window.Cart.add(addEl.dataset.add, 1);
        }
      });
    }

    // Кліки по about-grid на index.html
    const aboutGrid = document.getElementById('about-grid');
    if (aboutGrid) {
      aboutGrid.addEventListener('click', (e) => {
        const openEl = e.target.closest('[data-open]');
        if (openEl) {
          openModal(openEl.dataset.open);
          return;
        }
        const addEl = e.target.closest('[data-add]');
        if (addEl) {
          window.Cart.add(addEl.dataset.add, 1);
        }
      });
    }

    // Фільтри
    const filters = document.getElementById('category-filters');
    if (filters) {
      filters.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        state.category = chip.dataset.cat;
        setActiveChip(state.category);
        render();
      });
    }

    // Пошук
    const search = document.getElementById('search');
    if (search) {
      search.addEventListener('input', () => {
        state.query = search.value;
        render();
      });
    }

    // Сортування
    const sort = document.getElementById('sort');
    if (sort) {
      sort.addEventListener('change', () => {
        state.sort = sort.value;
        render();
      });
    }

    // Кількість в модалці
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');
    if (qtyMinus) qtyMinus.addEventListener('click', () => updateQty(-1));
    if (qtyPlus) qtyPlus.addEventListener('click', () => updateQty(1));

    // Додати в кошик з модалки
    const addToCartBtn = document.getElementById('add-to-cart');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        window.Cart.add(currentId, currentQty);
        const btn = addToCartBtn;
        btn.textContent = 'Додано ✓';
        setTimeout(() => { btn.textContent = 'У кошик'; }, 900);
      });
    }

    // Закриття модалки
    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
  }

  // ---------- Старт ----------
  render();
})();
