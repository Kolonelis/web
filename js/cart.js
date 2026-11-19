// Логіка кошика на localStorage. Підключається на всіх сторінках:
// на index.html оновлює лічильник у шапці; на cart.html рендерить список
// і обробляє оформлення замовлення з підтвердженням.
// Потребує: products.js (PRODUCTS, CATEGORIES).

(() => {
  const KEY = 'horologe_cart';
  const PROMO_KEY = 'horologe_promo';
  const ORDERS_KEY = 'horologe_orders';

  // Промокоди: код → знижка в частках (10% = 0.1, 15% = 0.15, 20% = 0.2)
  const PROMOS = { WELCOME10: 0.1, VIP15: 0.15, GOLD20: 0.2 };

  // ---------- Робота з localStorage ----------
  function getCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
  }

  function getOrders() {
    try {
      const raw = JSON.parse(localStorage.getItem(ORDERS_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  const count = () => getCart().reduce((sum, item) => sum + item.qty, 0);
  const totalSum = () => {
    const cart = getCart();
    return cart.reduce((sum, item) => {
      const p = PRODUCTS.find((prod) => prod.id === item.id);
      return p ? sum + p.price * item.qty : sum;
    }, 0);
  };

  // ---------- Публічне API ----------
  window.Cart = {
    add(id, qty = 1) {
      const cart = getCart();
      const item = cart.find((i) => i.id === Number(id));
      if (item) item.qty = Math.min(99, item.qty + qty);
      else cart.push({ id: Number(id), qty });
      saveCart(cart);
      updateHeader();
    },

    updateQty(id, qty) {
      const cart = getCart();
      const item = cart.find((i) => i.id === Number(id));
      if (!item) return;
      item.qty = Math.min(99, Math.max(1, qty));
      saveCart(cart);
      renderCartPage();
    },

    remove(id) {
      saveCart(getCart().filter((i) => i.id !== Number(id)));
      renderCartPage();
    },

    clear() {
      saveCart([]);
      savePromo(null);
      renderCartPage();
    },
  };

  // ---------- Лічильник у шапці (обидві сторінки) ----------
  function updateHeader() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const n = count();
    el.textContent = n;
    el.classList.toggle('hidden', n === 0);
  }

  // ---------- Рендер на cart.html ----------
  const isCartPage = !!document.getElementById('cart-list');

  function renderCartPage() {
    updateHeader();
    if (!isCartPage) return;

    const cart = getCart();
    const cartList = document.getElementById('cart-list');
    const cartEmpty = document.getElementById('cart-empty');
    const cartContent = document.getElementById('cart-content');
    const checkout = document.getElementById('checkout');
    const countLabel = document.getElementById('cart-count-label');

    if (cart.length === 0) {
      cartContent.classList.add('hidden');
      checkout.classList.add('hidden');
      cartEmpty.classList.remove('hidden');
      countLabel.textContent = '';
      return;
    }

    cartEmpty.classList.add('hidden');
    cartContent.classList.remove('hidden');
    checkout.classList.remove('hidden');

    // Рядки кошика
    cartList.innerHTML = cart.flatMap((item) => {
      const p = PRODUCTS.find((prod) => prod.id === item.id);
      if (!p) return [];
      return `
        <article class="cart-item" data-id="${p.id}">
          <div class="cart-item__img">
            <img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy"
                 onerror="this.onerror=null;this.src='images/watch.svg';">
          </div>
          <div class="cart-item__info">
            <p class="cart-item__brand">${p.brand}</p>
            <h3 class="cart-item__name">${p.name}</h3>
            <p class="cart-item__unit">${formatPrice(p.price)} / шт.</p>
          </div>
          <div class="cart-item__right">
            <div class="stepper">
              <button type="button" data-step="-1" aria-label="Менше">−</button>
              <span>${item.qty}</span>
              <button type="button" data-step="1" aria-label="Більше">+</button>
            </div>
            <span class="cart-item__line">${formatPrice(p.price * item.qty)}</span>
            <button class="cart-item__remove" data-remove="${p.id}">Прибрати</button>
          </div>
        </article>`;
    }).join('');

    // Зведення (підрахунок із урахуванням промокоду)
    const totalQty = count();
    const subtotal = totalSum();
    const promo = getPromo();
    const discount = promo ? Math.round(subtotal * PROMOS[promo]) : 0;
    const total = subtotal - discount;

    document.getElementById('cart-total-qty').textContent =
      totalQty + ' ' + plural(totalQty, 'товар', 'товари', 'товарів');
    renderPromo(promo, subtotal);
    document.getElementById('cart-total').textContent = formatPrice(total);

    countLabel.textContent =
      'У кошику ' + totalQty + ' ' + plural(totalQty, 'модель', 'моделі', 'моделей');
  }

  const formatPrice = (n) => n.toLocaleString('uk-UA') + ' ₴';

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // ---------- Промокод ----------
  function getPromo() {
    const code = localStorage.getItem(PROMO_KEY);
    return code && PROMOS[code] ? code : null;
  }

  function savePromo(code) {
    if (code) localStorage.setItem(PROMO_KEY, code);
    else localStorage.removeItem(PROMO_KEY);
  }

  function renderPromo(promo, subtotal) {
    const box = document.getElementById('promo');
    if (!box) return;

    const discount = promo ? Math.round(subtotal * PROMOS[promo]) : 0;

    const promoForm = box.querySelector('.promo__box');
    if (promoForm) promoForm.classList.toggle('hidden', !!promo);
    box.querySelector('.promo__applied').classList.toggle('hidden', !promo);

    const discountRow = document.getElementById('promo-discount');
    if (discountRow) {
      discountRow.classList.toggle('hidden', !promo);
      if (promo) {
        document.getElementById('promo-code-label').textContent = promo;
        document.getElementById('promo-percent').textContent =
          '−' + Math.round(PROMOS[promo] * 100) + '%';
        document.getElementById('promo-discount-value').textContent = '−' + formatPrice(discount);
      }
    }

    const msg = document.getElementById('promo-msg');
    if (msg) {
      msg.textContent = '';
      msg.className = 'promo__msg';
    }
  }

  // Кліки по блоку промокоду (застосувати / прибрати)
  const promoBox = document.getElementById('promo');
  if (promoBox) {
    promoBox.addEventListener('click', (e) => {
      if (e.target.closest('#promo-remove')) {
        savePromo(null);
        renderCartPage();
        return;
      }

      if (e.target.closest('#promo-apply')) {
        const input = document.getElementById('promo-input');
        const msg = document.getElementById('promo-msg');
        const code = input.value.trim().toUpperCase();
        if (!code) return;

        if (PROMOS[code]) {
          savePromo(code);
          input.value = '';
          renderCartPage();
        } else {
          msg.textContent = 'Невірний промокод';
          msg.className = 'promo__msg is-error';
        }
      }
    });
  }

  // ---------- Кліки по рядках кошика ----------
  const cartList = document.getElementById('cart-list');
  if (cartList) {
    cartList.addEventListener('click', (e) => {
      const item = e.target.closest('.cart-item');
      if (!item) return;
      const id = Number(item.dataset.id);

      const stepEl = e.target.closest('[data-step]');
      if (stepEl) {
        const cur = getCart().find((i) => i.id === id)?.qty || 1;
        window.Cart.updateQty(id, cur + Number(stepEl.dataset.step));
        return;
      }

      const removeEl = e.target.closest('[data-remove]');
      if (removeEl) window.Cart.remove(id);
    });
  }

  // ---------- Форма замовлення ----------
  const form = document.getElementById('order-form');

  function setError(field, message) {
    const span = form.querySelector(`[data-err="${field}"]`);
    if (span) span.textContent = message;
  }

  function clearErrors() {
    form.querySelectorAll('.form__error').forEach((el) => (el.textContent = ''));
  }

  function validate() {
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    let ok = true;

    if (name.length < 2) {
      setError('name', 'Вкажіть ваше ім\'я');
      ok = false;
    }

    const phoneDigits = phone.replace(/[^\d+]/g, '');
    if (phoneDigits.length < 10) {
      setError('phone', 'Введіть коректний номер телефону');
      ok = false;
    }

    if (email && !/^[\w.+-]+@[\w-]+\.[\w]{2,}$/.test(email)) {
      setError('email', 'Введіть коректний email');
      ok = false;
    }

    return ok;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      if (!validate()) return;

      const cart = getCart();
      const promo = getPromo();
      const subtotal = totalSum();
      const discount = promo ? Math.round(subtotal * PROMOS[promo]) : 0;
      const total = subtotal - discount;

      const order = {
        number: 'H-' + Date.now().toString(36).toUpperCase(),
        items: cart.map((item) => {
          const p = PRODUCTS.find((prod) => prod.id === item.id);
          return { name: p ? `${p.brand} ${p.name}` : item.id, qty: item.qty, price: p ? p.price : 0 };
        }),
        total,
        discount,
        promo,
        customer: {
          name: form.name.value.trim(),
          phone: form.phone.value.trim(),
          email: form.email.value.trim(),
          comment: form.comment.value.trim(),
        },
        date: new Date().toISOString(),
      };

      // Зберігаємо замовлення в localStorage
      const orders = getOrders();
      orders.unshift(order);
      saveOrders(orders);

      // Успіх: очищаємо кошик і промокод
      savePromo(null);
      window.Cart.clear();
      form.classList.add('hidden');

      // Показуємо сторінку підтвердження
      const success = document.getElementById('order-success');
      success.classList.remove('hidden');
      const titleEl = success.querySelector('.success__title');
      if (titleEl) titleEl.textContent = 'Замовлення оформлено!';
      const msgEl = success.querySelector('.success__msg');
      if (msgEl) {
        msgEl.textContent =
          `Замовлення ${order.number}. Ми надішлемо підтвердження на ${order.customer.email || 'ваш email'}.`;
      }
      const numberEl = document.getElementById('order-number');
      if (numberEl) numberEl.textContent = 'Номер: ' + order.number;

      // Скрол до підтвердження
      success.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ---------- Старт ----------
  updateHeader();
  renderCartPage();
})();
