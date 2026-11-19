// Product Detail Page Logic
// Handles: image gallery, variants, quantity, add to cart/favorites, related products

(() => {
  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = Number(urlParams.get('id'));

  if (!productId) {
    window.location.href = 'index.html';
    return;
  }

  // Find product and its group
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) {
    window.location.href = 'index.html';
    return;
  }

  // Get all products in the same group (for variants)
  const groupProducts = PRODUCTS.filter(p => p.groupId === product.groupId);
  const hasVariants = groupProducts.length > 1 || (product.variants && product.variants.length > 0);

  // State
  let currentProduct = product;
  let currentQty = 1;

  // DOM Elements
  const els = {
    mainImage: document.getElementById('main-image'),
    mainImageWrapper: document.getElementById('main-image-wrapper'),
    thumbsWrapper: document.getElementById('thumbs-wrapper'),
    videoBtn: document.getElementById('video-btn'),
    brand: document.getElementById('product-brand'),
    name: document.getElementById('product-name'),
    model: document.getElementById('product-model'),
    stock: document.getElementById('product-stock'),
    price: document.getElementById('product-price'),
    desc: document.getElementById('product-desc'),
    variantsSection: document.getElementById('variants-section'),
    variantsList: document.getElementById('variants-list'),
    qtyInput: document.getElementById('qty-input'),
    qtyMinus: document.querySelector('.qty__btn--minus'),
    qtyPlus: document.querySelector('.qty__btn--plus'),
    favBtn: document.getElementById('fav-btn'),
    cartBtn: document.getElementById('cart-btn'),
    specsList: document.getElementById('specs-list'),
    relatedGrid: document.getElementById('related-grid'),
    bcCategory: document.getElementById('bc-category'),
    bcBrand: document.getElementById('bc-brand'),
    bcName: document.getElementById('bc-name'),
  };

  // Format price
  const formatPrice = (n) => n.toLocaleString('uk-UA') + ' ₴';

  // Stock labels
  const STOCK_LABELS = {
    in: { text: 'В наявності', class: 'stock--in' },
    low: { text: 'Закінчується', class: 'stock--low' },
    pre: { text: 'Під замовлення', class: 'stock--pre' },
  };

  // Category labels
  const CATEGORIES = {
    auto: 'Автоматичні',
    quartz: 'Кварцові',
    chrono: 'Хронографи',
    luxury: 'Люкс',
  };

  const GENDERS = {
    men: 'Чоловічі годинники',
    women: 'Жіночі годинники',
  };

  // Initialize page
  function init() {
    renderBreadcrumbs();
    renderProduct();
    renderVariants();
    renderSpecs();
    renderRelated();
    bindEvents();
    updateFavButton();
  }

  function renderBreadcrumbs() {
    const genderUrl = currentProduct.gender === 'men' ? 'men.html' : 'women.html';
    const categoryName = CATEGORIES[currentProduct.category] || currentProduct.category;

    if (els.bcCategory) {
      els.bcCategory.href = genderUrl;
      els.bcCategory.textContent = GENDERS[currentProduct.gender];
    }
    if (els.bcBrand) {
      els.bcBrand.href = `${genderUrl}?brand=${encodeURIComponent(currentProduct.brand)}`;
      els.bcBrand.textContent = currentProduct.brand;
    }
    if (els.bcName) {
      els.bcName.textContent = currentProduct.name;
    }
    document.title = `${currentProduct.brand} ${currentProduct.name} — HOROLOGE`;
  }

  function renderProduct() {
    // Main image
    const images = currentProduct.images || [currentProduct.image];
    if (els.mainImage) {
      els.mainImage.src = images[0];
      els.mainImage.alt = `${currentProduct.brand} ${currentProduct.name}`;
      els.mainImage.onerror = () => {
        els.mainImage.onerror = null;
        els.mainImage.src = 'images/watch.svg';
      };
    }

    // Thumbnails
    if (els.thumbsWrapper) {
      const thumbs = images.map((img, idx) => `
        <button class="product-gallery__thumb ${idx === 0 ? 'is-active' : ''}"
                data-index="${idx}"
                aria-label="Фото ${idx + 1}"
                aria-current="${idx === 0 ? 'true' : 'false'}"
                type="button">
          <img src="${img}" alt="" loading="lazy" width="80" height="80">
        </button>
      `).join('');
      els.thumbsWrapper.innerHTML = thumbs;
    }

    // Info
    if (els.brand) els.brand.textContent = currentProduct.brand;
    if (els.name) els.name.textContent = currentProduct.name;
    if (els.model) els.model.textContent = `Модель: ${currentProduct.groupId || '—'}`;
    if (els.stock) {
      const stockInfo = STOCK_LABELS[currentProduct.stock] || STOCK_LABELS.in;
      els.stock.innerHTML = `<span class="product-detail__stock-dot ${stockInfo.class}"></span>${stockInfo.text}`;
      els.stock.className = `product-detail__stock ${stockInfo.class}`;
    }
    if (els.price) els.price.innerHTML = `<span class="product-detail__price-value">${formatPrice(currentProduct.price)}</span>`;
    if (els.desc) els.desc.textContent = currentProduct.description;

    // Video button - hide for now (no video URLs in data)
    if (els.videoBtn) els.videoBtn.classList.add('hidden');
  }

  function renderVariants() {
    if (!hasVariants || !els.variantsSection) {
      if (els.variantsSection) els.variantsSection.style.display = 'none';
      return;
    }

    // Combine group products and variants
    const allVariants = [];

    // Add group products as variants (different colors/versions)
    groupProducts.forEach((p, idx) => {
      const variantImages = p.images || [p.image];
      allVariants.push({
        id: p.id,
        color: p.name, // Use product name as color identifier
        colorCode: getColorCode(p.id), // Generate or extract color code
        price: p.price,
        images: variantImages,
        isGroupProduct: true,
        product: p,
      });
    });

    // Add explicit variants if they exist
    if (currentProduct.variants) {
      currentProduct.variants.forEach(v => {
        // Avoid duplicates
        if (!allVariants.some(av => av.id === v.id)) {
          allVariants.push({
            ...v,
            isGroupProduct: false,
            product: { ...currentProduct, ...v }, // merge for reference
          });
        }
      });
    }

    // Render variant buttons
    if (els.variantsList) {
      els.variantsList.innerHTML = allVariants.map((v, idx) => {
        const isActive = v.id === currentProduct.id;
        return `
          <button type="button"
                  class="variant-btn ${isActive ? 'is-active' : ''}"
                  data-variant-id="${v.id}"
                  data-price="${v.price}"
                  data-images='${JSON.stringify(v.images)}'
                  aria-label="${v.color}"
                  aria-pressed="${isActive}"
                  role="radio"
                  aria-checked="${isActive}"
                  style="--variant-color: ${v.colorCode}">
            <span class="variant-btn__dot" style="background: ${v.colorCode}"></span>
            <span class="variant-btn__name">${v.color}</span>
            ${v.price !== currentProduct.price ? `<span class="variant-btn__price">${formatPrice(v.price)}</span>` : ''}
          </button>
        `;
      }).join('');
    }
  }

  // Helper to generate color codes for group products
  const colorCodeMap = {
    'heritage-42': ['#C0C0C0', '#D4A843', '#1a1a1a'],
    'orbis': ['#C0C0C0', '#1E3A8A'],
    'raiden': ['#71797E', '#1a1a1a'],
    'nightfall': ['#2D2D2D', '#C9A86A'],
    'elanee': ['#F5F5F0', '#E8B4B8', '#C0C0C0'],
    'riviere': ['#B8A08A', '#C9A86A', '#71797E'],
    'essence': ['#F7E7CE', '#F5F5F0', '#E8B4B8'],
    'rose': ['#E8B4B8', '#C0C0C0', '#C9A86A'],
    'breeze-34': ['#1E3A8A', '#C0C0C0', '#C9A86A'],
    'aria': ['#E8B4B8', '#C0C0C0', '#C9A86A'],
    'lumen': ['#71797E', '#E8B4B8', '#C9A86A'],
    'misty': ['#C0C0C0', '#C9A86A', '#E8B4B8'],
    'nova': ['#C0C0C0', '#C9A86A', '#1a1a1a'],
    'zenith': ['#C0C0C0', '#C9A86A', '#1a1a1a'],
  };

  function getColorCode(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (product?.variants) {
      const variant = product.variants.find(v => v.id === productId);
      if (variant) return variant.colorCode;
    }
    if (product?.groupId && colorCodeMap[product.groupId]) {
      const idx = groupProducts.findIndex(p => p.id === productId);
      return colorCodeMap[product.groupId][idx % colorCodeMap[product.groupId].length];
    }
    return '#C0C0C0';
  }

  function renderSpecs() {
    if (!els.specsList) return;
    const specs = currentProduct.specs || {};
    els.specsList.innerHTML = Object.entries(specs).map(([k, v]) =>
      `<dt>${k}</dt><dd>${v}</dd>`
    ).join('');
  }

  function renderRelated() {
    if (!els.relatedGrid) return;

    // Show 4 related products from same gender, excluding current group
    const related = PRODUCTS
      .filter(p => p.gender === currentProduct.gender && p.groupId !== currentProduct.groupId)
      .slice(0, 4);

    if (related.length === 0) {
      document.getElementById('related-section')?.classList.add('hidden');
      return;
    }

    els.relatedGrid.innerHTML = related.map(p => `
      <article class="card" data-id="${p.id}">
        <button class="card__like" data-fav="${p.id}" aria-label="В обране" title="В обране">${window.HEART_SVG}</button>
        <a class="card__media" href="product.html?id=${p.id}">
          <img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy"
               onerror="this.onerror=null;this.src='images/watch.svg';">
          <span class="card__category">${CATEGORIES[p.category]}</span>
          <span class="card__stock card__stock--${p.stock || 'in'}">${STOCK_LABELS[p.stock]?.text || 'В наявності'}</span>
        </a>
        <div class="card__body">
          <p class="card__brand">${p.brand}</p>
          <h3 class="card__name"><a href="product.html?id=${p.id}">${p.name}</a></h3>
          <div class="card__row">
            <span class="card__price">${formatPrice(p.price)}</span>
            <button class="card__add" data-add="${p.id}" aria-label="Додати в кошик" title="У кошик">+</button>
          </div>
        </div>
      </article>
    `).join('');

    window.Fav?.syncLikes();
  }

  function bindEvents() {
    // Thumbnail clicks
    els.thumbsWrapper?.addEventListener('click', (e) => {
      const thumb = e.target.closest('.product-gallery__thumb');
      if (!thumb) return;
      const idx = Number(thumb.dataset.index);
      switchMainImage(idx);
    });

    // Variant selection
    els.variantsList?.addEventListener('click', (e) => {
      const btn = e.target.closest('.variant-btn');
      if (!btn) return;
      const variantId = Number(btn.dataset.variantId);
      switchVariant(variantId);
    });

    // Quantity
    els.qtyMinus?.addEventListener('click', () => updateQty(-1));
    els.qtyPlus?.addEventListener('click', () => updateQty(1));
    els.qtyInput?.addEventListener('change', () => {
      currentQty = Math.min(99, Math.max(1, Number(els.qtyInput.value) || 1));
      els.qtyInput.value = currentQty;
    });

    // Favorite
    els.favBtn?.addEventListener('click', () => {
      window.Fav.toggle(currentProduct.id);
      updateFavButton();
    });

    // Add to cart
    els.cartBtn?.addEventListener('click', () => {
      window.Cart.add(currentProduct.id, currentQty);
      const btn = els.cartBtn;
      const originalText = btn.textContent;
      btn.textContent = 'Додано ✓';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 900);
    });

    // Related grid clicks (delegate to cart.js/fav.js)
    els.relatedGrid?.addEventListener('click', (e) => {
      const addEl = e.target.closest('[data-add]');
      if (addEl) {
        window.Cart.add(addEl.dataset.add, 1);
      }
    });
  }

  function switchMainImage(index) {
    const images = currentProduct.images || [currentProduct.image];
    if (images[index] && els.mainImage) {
      els.mainImage.src = images[index];
      els.mainImage.alt = `${currentProduct.brand} ${currentProduct.name} — фото ${index + 1}`;

      // Update active thumb
      els.thumbsWrapper?.querySelectorAll('.product-gallery__thumb').forEach((t, i) => {
        t.classList.toggle('is-active', i === index);
        t.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
    }
  }

  function switchVariant(variantId) {
    if (variantId === currentProduct.id) return;

    // Find the variant product
    const variantProduct = PRODUCTS.find(p => p.id === variantId);
    if (!variantProduct) return;

    currentProduct = variantProduct;
    currentQty = 1;
    if (els.qtyInput) els.qtyInput.value = 1;

    // Update URL without reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('id', variantId);
    window.history.replaceState({}, '', newUrl);

    // Re-render
    renderBreadcrumbs();
    renderProduct();
    renderVariants();
    renderSpecs();
    updateFavButton();
  }

  function updateQty(delta) {
    currentQty = Math.min(99, Math.max(1, currentQty + delta));
    if (els.qtyInput) els.qtyInput.value = currentQty;
  }

  function updateFavButton() {
    if (!els.favBtn) return;
    const isFav = window.Fav?.has(currentProduct.id);
    els.favBtn.classList.toggle('is-fav', isFav);
    els.favBtn.setAttribute('aria-pressed', isFav);
    const span = els.favBtn.querySelector('span');
    if (span) span.textContent = isFav ? 'В обраному' : 'В обране';
  }

  // Start
  init();
})();