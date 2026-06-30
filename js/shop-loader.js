// ============================================================
// CHRISTOS.FASHION — Shop Product Loader
// Fetches products from /api/get-products (Netlify Function),
// renders the product grid, and wires up the variant picker.
// ============================================================

import { Cart, CartUI } from './cart.js';

CartUI.init();

const grid       = document.getElementById('product-grid');
const countEl    = document.getElementById('product-count');
const noResults  = document.getElementById('no-results');
const tabBtns    = document.querySelectorAll('.tab-btn');

let allProducts  = [];
let activeFilter = 'all';

// ── 1. Fetch products ────────────────────────────────────────
async function loadProducts() {
  try {
    const res = await fetch('/api/get-products');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allProducts = await res.json();
    renderGrid(allProducts);
  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px">
        <p class="eyebrow">Oops</p>
        <h3 style="font-size:1.1rem; margin-block:12px; color:var(--cream)">Couldn't load products right now.</h3>
        <p style="color:var(--cream-35)">Please refresh the page or try again in a moment.</p>
        <button onclick="location.reload()" class="btn btn-outline" style="margin-top:20px">Retry</button>
      </div>`;
  }
}

// ── 2. Render cards ──────────────────────────────────────────
function renderGrid(products) {
  const filtered = activeFilter === 'all'
    ? products
    : products.filter(p => p.category === activeFilter);

  if (countEl) {
    countEl.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }
  if (noResults) noResults.style.display = 'none';

  grid.innerHTML = filtered.map((p, idx) => {
    const lowestPrice = Math.min(...p.variants.map(v => v.price));
    const hasMultiple = p.variants.length > 1;

    // Build unique sizes + colors from option values
    const sizeOpt  = p.options.find(o => o.type === 'size');
    const colorOpt = p.options.find(o => o.type === 'color');
    const sizeList = sizeOpt  ? sizeOpt.values.map(v => v.title).join(' · ') : '';
    const colorList = colorOpt ? colorOpt.values.map(v => v.title).join(' · ') : '';

    const variantSummary = [colorList, sizeList].filter(Boolean).join(' · ');
    const delayStyle = idx > 0 ? `style="--reveal-delay:${(idx * 0.06).toFixed(2)}s"` : '';

    return `
    <article class="product-card reveal" data-category="${p.category}" data-product-id="${p.id}" ${delayStyle}
             itemscope itemtype="https://schema.org/Product">
      <div class="product-img-wrap">
        ${p.image
          ? `<img src="${p.image}" alt="${escHtml(p.title)} — Christos.Fashion" loading="lazy" itemprop="image"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>`
          : ''}
        <div class="product-img-placeholder" style="${p.image ? 'display:none' : ''}">
          <span class="design-text">${escHtml(p.title)}</span>
          <svg class="design-cross" viewBox="0 0 20 28" fill="currentColor" aria-hidden="true">
            <rect x="8" y="0" width="4" height="28"/><rect x="0" y="8" width="20" height="4"/>
          </svg>
        </div>
        <div class="product-quick-add" aria-hidden="true">${hasMultiple ? 'Choose Options' : 'Add to Cart'}</div>
      </div>
      <div class="product-info">
        <h2 class="product-name" itemprop="name">${escHtml(p.title)}</h2>
        ${variantSummary ? `<p class="product-variant">${escHtml(variantSummary)}</p>` : ''}
        <div class="product-price-row">
          <strong class="product-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <span itemprop="price" content="${(lowestPrice / 100).toFixed(2)}">
              ${lowestPrice !== Math.max(...p.variants.map(v => v.price)) ? 'From ' : ''}${fmt(lowestPrice)}
            </span>
            <meta itemprop="priceCurrency" content="USD"/>
            <meta itemprop="availability" content="https://schema.org/InStock"/>
          </strong>
          <button class="btn btn-primary btn-sm product-add-btn"
                  data-product-id="${p.id}"
                  aria-label="Add ${escHtml(p.title)} to cart">
            ${hasMultiple ? 'Options' : 'Add to Cart'}
          </button>
        </div>
        ${p.description
          ? `<p itemprop="description" style="font-size:.82rem;color:var(--cream-35);line-height:1.6;margin-top:8px">
              ${escHtml(stripHtml(p.description)).slice(0, 160)}${p.description.length > 160 ? '…' : ''}
             </p>`
          : ''}
      </div>
    </article>`;
  }).join('');

  // Re-run reveal observer on new cards
  grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Wire up Add to Cart / Options buttons
  grid.querySelectorAll('.product-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const product = allProducts.find(p => p.id === btn.dataset.productId);
      if (!product) return;
      if (product.variants.length === 1) {
        addSingleVariant(product, product.variants[0]);
      } else {
        openVariantPicker(product);
      }
    });
  });

  // Card click → open variant picker (same UX as the button)
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button, a')) return;
      const product = allProducts.find(p => p.id === card.dataset.productId);
      if (!product) return;
      if (product.variants.length === 1) {
        addSingleVariant(product, product.variants[0]);
      } else {
        openVariantPicker(product);
      }
    });
  });
}

// ── 3. Variant picker modal ──────────────────────────────────
let pickerModal = null;

function openVariantPicker(product) {
  if (!pickerModal) buildPickerDOM();

  const modal = pickerModal;
  modal.querySelector('.variant-modal-title').textContent = product.title;

  const groups = modal.querySelector('.variant-groups');
  groups.innerHTML = '';

  // Track selected option IDs per option type
  const selected = {};

  product.options.forEach(opt => {
    const groupEl = document.createElement('div');
    groupEl.innerHTML = `
      <div class="variant-group-label">${escHtml(opt.name)}</div>
      <div class="variant-btns" data-option-name="${escHtml(opt.name)}"></div>`;
    const btnsEl = groupEl.querySelector('.variant-btns');

    opt.values.forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'variant-btn';
      btn.textContent = val.title;
      btn.dataset.optId = val.id;
      btn.addEventListener('click', () => {
        btnsEl.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selected[opt.name] = val.id;
      });
      btnsEl.appendChild(btn);
    });

    groups.appendChild(groupEl);
  });

  const addBtn = modal.querySelector('.variant-add-btn');
  addBtn.onclick = () => {
    // Find variant that matches all selected options
    const variant = product.variants.find(v => {
      return Object.values(selected).every(id => v.options.includes(id));
    });

    if (!variant) {
      addBtn.textContent = 'Please select all options';
      setTimeout(() => { addBtn.textContent = 'Add to Cart'; }, 1800);
      return;
    }

    addSingleVariant(product, variant);
    closeVariantPicker();
  };

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeVariantPicker() {
  pickerModal?.classList.remove('open');
  document.body.style.overflow = '';
}

function buildPickerDOM() {
  const el = document.createElement('div');
  el.className = 'variant-modal-overlay';
  el.innerHTML = `
    <div class="variant-modal" role="dialog" aria-modal="true" aria-label="Choose product options">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <h3 class="variant-modal-title"></h3>
        <button class="variant-close" aria-label="Close">×</button>
      </div>
      <div class="variant-groups"></div>
      <button class="btn btn-primary variant-add-btn">Add to Cart</button>
    </div>`;
  el.querySelector('.variant-close').addEventListener('click', closeVariantPicker);
  el.addEventListener('click', e => { if (e.target === el) closeVariantPicker(); });
  document.body.appendChild(el);
  pickerModal = el;
}

// ── 4. Add to cart helper ────────────────────────────────────
function addSingleVariant(product, variant) {
  Cart.add({
    productId:    product.id,
    variantId:    variant.id,
    title:        product.title,
    variantTitle: variant.title,
    price:        variant.price,
    image:        product.image,
    quantity:     1,
  });
}

// ── 5. Filter tabs ───────────────────────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    activeFilter = btn.dataset.filter;
    renderGrid(allProducts);
  });
});

// Handle ?filter= query param
const urlFilter = new URLSearchParams(window.location.search).get('filter');
if (urlFilter) {
  const matchBtn = document.querySelector(`.tab-btn[data-filter="${urlFilter}"]`);
  if (matchBtn) matchBtn.click();
}

// ── 6. Reveal observer (re-used from script.js pattern) ──────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = entry.target.style.getPropertyValue('--reveal-delay') || '0s';
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

// ── Helpers ──────────────────────────────────────────────────
function fmt(cents) { return `$${(cents / 100).toFixed(2)}`; }
function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function stripHtml(s) { return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

// ── Boot ─────────────────────────────────────────────────────
loadProducts();
