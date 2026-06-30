import { Cart, CartUI } from './cart.js';

CartUI.init();

var grid      = document.getElementById('product-grid');
var countEl   = document.getElementById('product-count');
var noResults = document.getElementById('no-results');
var tabBtns   = document.querySelectorAll('.tab-btn');

var allProducts  = [];
var activeFilter = 'all';

function loadProducts() {
  fetch('/api/get-products')
    .then(function(res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function(products) { allProducts = products; renderGrid(allProducts); })
    .catch(function(err) {
      console.error('Failed to load products:', err);
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
          ? '<img src="' + p.image + '" alt="' + esc(title) + ' — Christos.Fashion" loading="lazy" itemprop="image"/>'
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
      var p = allProducts.find(function(x) { return x.id === btn.dataset.productId; });
      if (p) p.variants.length === 1 ? addVariant(p, p.variants[0]) : openPicker(p);
    });
  });

  grid.querySelectorAll('.product-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('button,a')) return;
      var p = allProducts.find(function(x) { return x.id === card.dataset.productId; });
      if (p) p.variants.length === 1 ? addVariant(p, p.variants[0]) : openPicker(p);
    });
  });
}

function cleanTitle(raw) { return raw.split(' | ')[0].trim(); }

function buildSubtitle(p) {
  var colorOpt = p.options.find(function(o) { return o.type === 'color' || o.name.toLowerCase().includes('color'); });
  var sizeOpt  = p.options.find(function(o) { return o.type === 'size'  || o.name.toLowerCase().includes('size'); });
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

var pickerModal = null;

function openPicker(product) {
  if (!pickerModal) {
    var el = document.createElement('div');
    el.className = 'variant-modal-overlay';
    el.innerHTML = '<div class="variant-modal" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px"><h3 class="variant-modal-title"></h3><button class="variant-close" aria-label="Close">&times;</button></div><div class="variant-groups"></div><button class="btn btn-primary variant-add-btn">Add to Cart</button></div>';
    el.querySelector('.variant-close').addEventListener('click', closePicker);
    el.addEventListener('click', function(e) { if (e.target === el) closePicker(); });
    document.body.appendChild(el);
    pickerModal = el;
  }

  pickerModal.querySelector('.variant-modal-title').textContent = cleanTitle(product.title);
  var groups = pickerModal.querySelector('.variant-groups');
  groups.innerHTML = '';
  var selected = {};

  product.options.forEach(function(opt) {
    var g = document.createElement('div');
    g.innerHTML = '<div class="variant-group-label">' + esc(opt.name) + '</div><div class="variant-btns"></div>';
    var btns = g.querySelector('.variant-btns');
    opt.values.forEach(function(val) {
      var b = document.createElement('button');
      b.className = 'variant-btn';
      b.textContent = val.title;
      b.addEventListener('click', function() {
        btns.querySelectorAll('.variant-btn').forEach(function(x){ x.classList.remove('selected'); });
        b.classList.add('selected');
        selected[opt.name] = val.id;
      });
      btns.appendChild(b);
    });
    groups.appendChild(g);
  });

  var addBtn = pickerModal.querySelector('.variant-add-btn');
  addBtn.textContent = 'Add to Cart';
  addBtn.onclick = function() {
    var v = product.variants.find(function(v) {
      return Object.values(selected).every(function(id){ return v.options.includes(id); });
    });
    if (!v) { addBtn.textContent = 'Select all options'; setTimeout(function(){ addBtn.textContent = 'Add to Cart'; }, 1800); return; }
    addVariant(product, v);
    closePicker();
  };

  pickerModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePicker() { if (pickerModal) pickerModal.classList.remove('open'); document.body.style.overflow = ''; }

function addVariant(product, variant) {
  Cart.add({ productId: product.id, variantId: variant.id, title: cleanTitle(product.title), variantTitle: variant.title, price: variant.price, image: product.image, quantity: 1 });
}

tabBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    tabBtns.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
    activeFilter = btn.dataset.filter;
    renderGrid(allProducts);
  });
});

var urlFilter = new URLSearchParams(window.location.search).get('filter');
if (urlFilter) { var mb = document.querySelector('.tab-btn[data-filter="' + urlFilter + '"]'); if (mb) mb.click(); }

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
