import { Cart, CartUI } from './cart.js';

CartUI.init();

var allProducts = [];
var pickerModal = null;

document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('featured-grid');
  if (!grid) return;

  fetch('/api/get-products')
    .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
    .then(function (products) {
      allProducts = products;
      var featured = products.slice(0, 4);

      grid.innerHTML = featured.map(function (p, idx) {
        var title       = cleanTitle(p.title);
        var subtitle    = buildSubtitle(p);
        var lowestPrice = p.variants.length
          ? Math.min.apply(null, p.variants.map(function (v) { return v.price; }))
          : 0;
        var hasMultiple = p.variants.length > 1;
        var delay       = idx > 0 ? ' style="--reveal-delay:' + (idx * 0.08).toFixed(2) + 's"' : '';

        return (
          '<article class="product-card reveal" data-product-id="' + p.id + '" data-category="' + p.category + '"' + delay + ' itemscope itemtype="https://schema.org/Product">' +
            '<div class="product-img-wrap">' +
              (p.image
                ? '<img src="' + p.image + '" alt="' + esc(title) + ' — Christos.Fashion" loading="lazy" itemprop="image"/>'
                : '<div class="product-img-placeholder"><span class="design-text">' + esc(title) + '</span><svg class="design-cross" viewBox="0 0 20 28" fill="currentColor"><rect x="8" y="0" width="4" height="28"/><rect x="0" y="8" width="20" height="4"/></svg></div>') +
              '<div class="product-quick-add" aria-hidden="true">' + (hasMultiple ? 'Choose Options' : 'Add to Cart') + '</div>' +
            '</div>' +
            '<div class="product-info">' +
              '<h3 class="product-name" itemprop="name">' + esc(title) + '</h3>' +
              (subtitle ? '<p class="product-variant">' + esc(subtitle) + '</p>' : '') +
              '<div class="product-price-row">' +
                '<strong class="product-price">' + (hasMultiple ? 'From ' : '') + fmt(lowestPrice) + '</strong>' +
                '<button class="btn btn-primary btn-sm home-add-btn" data-product-id="' + p.id + '">' + (hasMultiple ? 'Options' : 'Add to Cart') + '</button>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }).join('');

      // Reveal animations
      grid.querySelectorAll('.reveal').forEach(function (el) {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.style.transitionDelay = entry.target.style.getPropertyValue('--reveal-delay') || '0s';
              entry.target.classList.add('visible');
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08 });
        obs.observe(el);
      });

      // Wire up buttons
      grid.querySelectorAll('.home-add-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var p = allProducts.find(function (x) { return x.id === btn.dataset.productId; });
          if (!p) return;
          p.variants.length === 1 ? addVariant(p, p.variants[0]) : openPicker(p);
        });
      });

      // Clicking the card itself also opens the picker
      grid.querySelectorAll('.product-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('button, a')) return;
          var p = allProducts.find(function (x) { return x.id === card.dataset.productId; });
          if (!p) return;
          p.variants.length === 1 ? addVariant(p, p.variants[0]) : openPicker(p);
        });
      });
    })
    .catch(function (err) {
      console.warn('Home featured products failed to load:', err);
    });
});

// ── Variant picker ────────────────────────────────────────────

function openPicker(product) {
  if (!pickerModal) buildPickerDOM();

  pickerModal.querySelector('.variant-modal-title').textContent = cleanTitle(product.title);

  var groups   = pickerModal.querySelector('.variant-groups');
  groups.innerHTML = '';
  var selected = {};

  product.options.forEach(function (opt) {
    var groupEl = document.createElement('div');
    groupEl.innerHTML =
      '<div class="variant-group-label">' + esc(opt.name) + '</div>' +
      '<div class="variant-btns"></div>';
    var btnsEl = groupEl.querySelector('.variant-btns');

    opt.values.forEach(function (val) {
      var btn = document.createElement('button');
      btn.className   = 'variant-btn';
      btn.textContent = val.title;
      btn.addEventListener('click', function () {
        btnsEl.querySelectorAll('.variant-btn').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selected[opt.name] = val.id;
      });
      btnsEl.appendChild(btn);
    });
    groups.appendChild(groupEl);
  });

  var addBtn = pickerModal.querySelector('.variant-add-btn');
  addBtn.textContent = 'Add to Cart';
  addBtn.onclick = function () {
    var variant = product.variants.find(function (v) {
      return Object.values(selected).every(function (id) { return v.options.includes(id); });
    });
    if (!variant) {
      addBtn.textContent = 'Select all options first';
      setTimeout(function () { addBtn.textContent = 'Add to Cart'; }, 1800);
      return;
    }
    addVariant(product, variant);
    closePicker();
  };

  pickerModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePicker() {
  if (pickerModal) pickerModal.classList.remove('open');
  document.body.style.overflow = '';
}

function buildPickerDOM() {
  var el = document.createElement('div');
  el.className = 'variant-modal-overlay';
  el.innerHTML =
    '<div class="variant-modal" role="dialog" aria-modal="true">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">' +
        '<h3 class="variant-modal-title"></h3>' +
        '<button class="variant-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="variant-groups"></div>' +
      '<button class="btn btn-primary variant-add-btn">Add to Cart</button>' +
    '</div>';
  el.querySelector('.variant-close').addEventListener('click', closePicker);
  el.addEventListener('click', function (e) { if (e.target === el) closePicker(); });
  document.body.appendChild(el);
  pickerModal = el;
}

function addVariant(product, variant) {
  Cart.add({
    productId:    product.id,
    variantId:    variant.id,
    title:        cleanTitle(product.title),
    variantTitle: variant.title,
    price:        variant.price,
    image:        product.image,
    quantity:     1,
  });
}

// ── Helpers ───────────────────────────────────────────────────

function cleanTitle(raw) { return raw.split(' | ')[0].trim(); }

function buildSubtitle(p) {
  var colorOpt = p.options.find(function (o) { return o.type === 'color' || o.name.toLowerCase().includes('color'); });
  var sizeOpt  = p.options.find(function (o) { return o.type === 'size'  || o.name.toLowerCase().includes('size'); });
  var parts = [];
  if (colorOpt && colorOpt.values.length) {
    var c = colorOpt.values.map(function (v) { return v.title; });
    parts.push(c.length <= 3 ? c.join(' · ') : c.slice(0, 3).join(' · ') + ' +' + (c.length - 3) + ' more');
  }
  if (sizeOpt && sizeOpt.values.length) {
    var s = sizeOpt.values.map(function (v) { return v.title; });
    parts.push(s.length <= 2 ? s.join(' · ') : s[0] + '–' + s[s.length - 1]);
  }
  return parts.join(' · ');
}

function fmt(cents) { return '$' + (cents / 100).toFixed(2); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
