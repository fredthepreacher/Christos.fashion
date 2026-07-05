import { Cart, CartUI } from './cart.js';
import { openVariantPicker } from './variant-picker.js';

CartUI.init();

var allProducts = [];

document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('featured-grid');
  if (!grid) return;

  fetch('/api/get-products')
    .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
    .then(function (products) {
      if (!Array.isArray(products)) throw new Error('Bad products payload');
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

      // Wire up buttons + cards
      grid.querySelectorAll('.home-add-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          openFor(btn.dataset.productId);
        });
      });
      grid.querySelectorAll('.product-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('button, a')) return;
          openFor(card.dataset.productId);
        });
      });
    })
    .catch(function (err) {
      console.warn('Home featured products failed to load:', err);
    });
});

function openFor(productId) {
  var p = allProducts.find(function (x) { return x.id === productId; });
  if (!p) return;
  p.variants.length === 1
    ? addVariant(p, p.variants[0])
    : openVariantPicker(p, addVariant);
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
  var colorOpt = p.options.find(function (o) { return (o.type || '').toLowerCase() === 'color' || o.name.toLowerCase().includes('color'); });
  var sizeOpt  = p.options.find(function (o) { return (o.type || '').toLowerCase() === 'size'  || o.name.toLowerCase().includes('size'); });
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
