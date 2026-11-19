// Рендер добірки «Вибір покупців» на головній сторінці.
// Потребує: products.js (PRODUCTS, CATEGORIES, GENDERS) і cart.js (window.Cart).

(() => {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  const formatPrice = (n) => n.toLocaleString('uk-UA') + ' ₴';

  // 6 відмічених моделей (3 чоловічних + 3 жіночих), сторінка зі статтю — це html з каталогом
  const featured = PRODUCTS.filter((p) => p.featured);

  if (featured.length === 0) return;

  grid.innerHTML = featured.map((p) => {
    return `
      <article class="card gender-tag" data-id="${p.id}">
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

  // Швидке додавання в кошик прямо з головної
  grid.addEventListener('click', (e) => {
    // Клік по сердечку вже опрацював fav.js — не вважаємо його за «+»
    if (e.target.closest('[data-fav]')) return;
    const addEl = e.target.closest('[data-add]');
    if (!addEl) return;
    window.Cart.add(addEl.dataset.add, 1);

    // Короткий зворотний зв'язок кнопкою
    const btn = addEl;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = '+'; }, 700);
  });
})();