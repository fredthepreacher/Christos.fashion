import { Cart, CartUI } from './cart.js';
import { openVariantPicker } from './variant-picker.js';

CartUI.init();

var grid      = document.getElementById('product-grid');
var countEl   = document.getElementById('product-count');
var noResults = document.getElementById('no-results');
var tabBtns   = document.querySelectorAll('.tab-btn');

var allProducts  = [];
var loaded       = false;
var activeFilter = 'all';

function loadProducts() {
  fetch('/api/get-products')
    .then(function(res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function(products) {
      if (!Array.isArray(products)) throw new Error('Bad products payload');
      allProducts = products;
      loaded = true;
      renderGrid(allProducts);
      injectProductSchema(products);
    })
    .catch(function(err) {
      console.error('Failed to load products:', err);
      if (noResults) noResults.style.display = 'none';
      if (countEl) countEl.textContent = '';
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px"><p class="eyebrow">Oops</p><h3 style="font-size:1.1rem;margin-block:12px;color:var(--cream)">Couldn\'t load products right now.</h3><p style="color:var(--cream-35)">Please refresh or try again in a moment.</p><button onclick="location.reload()" class="btn btn-outline" style="margin-top:20px">Retry</button></div>';
    });
}

function renderGrid(products) {
  var filtered = activeFilter === 'all' ? products : products.filter(function(p) { return p.category === activeFilter; });

  if (countEl) countEl.textContent = filtered.length + ' product' + (filtered.length !== 1 ? 's' : '');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }
  if (noResults) noResults.style.display = 'none';

  grid.innerHTML = filtered.map(function(p, idx) {
    var title       = cleanTitle(p.title);
    var subtitle    = buildSubtitle(p);
    var lowestPrice = p.variants.length ? Math.min.apply(null, p.variants.map(function(v){ return v.price; })) : 0;
    var hasMultiple = p.variants.length > 1;
    var delay       = idx > 0 ? ' style="--reveal-delay:' + (idx * 0.05).toFixed(2) + 's"' : '';

    return '<article class="product-card reveal" data-category="' + p.category + '" data-product-id="' + p.id + '"' + delay + ' itemscope itemtype="https://schema.org/Product">' +
      '<div class="product-img-wrap">' +
        (p.image
          ? '<img src="' + p.image + '" alt="' + esc(title) + ' — Christian apparel by Christos.Fashion" loading="lazy" decoding="async" width="600" height="600" itemprop="image"/>'
          : '<div class="product-img-placeholder"><span class="design-text">' + esc(title) + '</span><svg class="design-cross" viewBox="0 0 20 28" fill="currentColor"><rect x="8" y="0" width="4" height="28"/><rect x="0" y="8" width="20" height="4"/></svg></div>') +
        '<div class="product-quick-add" aria-hidden="true">' + (hasMultiple ? 'Choose Options' : 'Add to Cart') + '</div>' +
      '</div>' +
      '<div class="product-info">' +
        '<h2 class="product-name" itemprop="name">' + esc(title) + '</h2>' +
        (subtitle ? '<p class="product-variant">' + esc(subtitle) + '</p>' : '') +
        '<div class="product-price-row">' +
          '<strong class="product-price">' + (hasMultiple ? 'From ' : '') + fmt(lowestPrice) + '</strong>' +
          '<button class="btn btn-primary btn-sm product-add-btn" data-product-id="' + p.id + '">' + (hasMultiple ? 'Options' : 'Add to Cart') + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');

  grid.querySelectorAll('.reveal').forEach(function(el) { revealObs.observe(el); });

  grid.querySelectorAll('.product-add-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openFor(btn.dataset.productId);
    });
  });

  grid.querySelectorAll('.product-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('button,a')) return;
      openFor(card.dataset.productId);
    });
  });
}

function openFor(productId) {
  var p = allProducts.find(function(x) { return x.id === productId; });
  if (!p) return;
  p.variants.length === 1
    ? addVariant(p, p.variants[0])
    : openVariantPicker(p, addVariant);
}

function addVariant(product, variant) {
  Cart.add({ productId: product.id, variantId: variant.id, title: cleanTitle(product.title), variantTitle: variant.title, price: variant.price, image: product.image, quantity: 1 });
}

function cleanTitle(raw) { return raw.split(' | ')[0].trim(); }

// Inject Product/Offer structured data generated from the live catalog,
// so search engines always see accurate names, prices, and availability.
function injectProductSchema(products) {
  if (document.getElementById('product-schema')) return;
  var el = document.createElement('script');
  el.type = 'application/ld+json';
  el.id = 'product-schema';
  el.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Christos.Fashion — Christian Apparel Collection',
    'numberOfItems': products.length,
    'itemListElement': products.map(function (p, i) {
      var prices = p.variants.map(function (v) { return v.price; });
      var inStock = p.variants.some(function (v) { return v.inStock !== false; });
      return {
        '@type': 'ListItem',
        'position': i + 1,
        'item': {
          '@type': 'Product',
          'name': cleanTitle(p.title),
          'image': p.image,
          'description': String(p.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
          'brand': { '@type': 'Brand', 'name': 'Christos.Fashion' },
          'category': p.category === 'hats' ? 'Christian Hats' : 'Christian T-Shirts',
          'url': 'https://christos.fashion/shop.html',
          'offers': {
            '@type': 'AggregateOffer',
            'priceCurrency': 'USD',
            'lowPrice': (Math.min.apply(null, prices) / 100).toFixed(2),
            'highPrice': (Math.max.apply(null, prices) / 100).toFixed(2),
            'offerCount': p.variants.length,
            'availability': inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        },
      };
    }),
  });
  document.head.appendChild(el);
}

function buildSubtitle(p) {
  var colorOpt = p.options.find(function(o) { return (o.type || '').toLowerCase() === 'color' || o.name.toLowerCase().includes('color'); });
  var sizeOpt  = p.options.find(function(o) { return (o.type || '').toLowerCase() === 'size'  || o.name.toLowerCase().includes('size'); });
  var parts = [];
  if (colorOpt && colorOpt.values.length) {
    var c = colorOpt.values.map(function(v){ return v.title; });
    parts.push(c.length <= 3 ? c.join(' · ') : c.slice(0,3).join(' · ') + ' +' + (c.length-3) + ' more');
  }
  if (sizeOpt && sizeOpt.values.length) {
    var s = sizeOpt.values.map(function(v){ return v.title; });
    parts.push(s.length <= 2 ? s.join(' · ') : s[0] + '–' + s[s.length-1]);
  }
  return parts.join(' · ');
}

// ── Filter tabs (single owner — legacy handler in script.js is skipped) ──
tabBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    tabBtns.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
    activeFilter = btn.dataset.filter;
    if (loaded) renderGrid(allProducts);
  });
});

var urlFilter = new URLSearchParams(window.location.search).get('filter');
if (urlFilter) {
  var mb = document.querySelector('.tab-btn[data-filter="' + urlFilter + '"]');
  if (mb) {
    tabBtns.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    mb.classList.add('active'); mb.setAttribute('aria-pressed','true');
    activeFilter = urlFilter;
  }
}

var revealObs = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = entry.target.style.getPropertyValue('--reveal-delay') || '0s';
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

function fmt(cents) { return '$' + (cents/100).toFixed(2); }
function esc(s) { return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

loadProducts();
