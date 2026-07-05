// ============================================================
// CHRISTOS.FASHION — Shared Variant Picker
// One implementation used by the homepage and the shop page.
//
// Guarantees:
//  • Only real, purchasable Printify options are shown
//    (the API already filters values to enabled variants).
//  • Color and Size are separate, clearly-labeled groups.
//  • Options that can't combine with the current selection
//    are disabled instead of failing at Add to Cart.
//  • Add to Cart stays disabled until every group is chosen,
//    then maps the exact combination to its Printify variant ID.
//  • Price updates live as the customer selects.
// ============================================================

var pickerEl = null;

export function openVariantPicker(product, onAdd) {
  if (!pickerEl) buildDOM();

  var titleEl  = pickerEl.querySelector('.variant-modal-title');
  var priceEl  = pickerEl.querySelector('.variant-modal-price');
  var groupsEl = pickerEl.querySelector('.variant-groups');
  var addBtn   = pickerEl.querySelector('.variant-add-btn');
  var hintEl   = pickerEl.querySelector('.variant-hint');

  titleEl.textContent = product.title.split(' | ')[0].trim();
  groupsEl.innerHTML  = '';
  groupsEl.scrollTop  = 0;

  // Sort groups: Color first, then Size, then anything else
  var groups = product.options.slice().sort(function (a, b) {
    return groupRank(a) - groupRank(b);
  });

  var selected = {}; // option group name -> selected value id

  // Pre-select any group that has only one real value
  groups.forEach(function (g) {
    if (g.values.length === 1) selected[g.name] = g.values[0].id;
  });

  // Build the group UI
  groups.forEach(function (g) {
    var wrap = document.createElement('div');
    wrap.className = 'variant-group';
    wrap.innerHTML =
      '<div class="variant-group-label">' + esc(g.name) +
      ' <span class="variant-group-choice"></span></div>' +
      '<div class="variant-btns"></div>';
    var btnsEl = wrap.querySelector('.variant-btns');

    g.values.forEach(function (val) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'variant-btn';
      btn.dataset.group = g.name;
      btn.dataset.valueId = val.id;

      // Show a color swatch when Printify provides hex values
      if (val.colors && val.colors.length) {
        btn.innerHTML =
          '<span class="variant-swatch" style="background:' + esc(val.colors[0]) + '"></span>' +
          esc(val.title);
      } else {
        btn.textContent = val.title;
      }

      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        if (selected[g.name] === val.id) {
          delete selected[g.name]; // tap again to deselect
        } else {
          selected[g.name] = val.id;
        }
        refresh();
      });

      btnsEl.appendChild(btn);
    });

    groupsEl.appendChild(wrap);
  });

  // A variant "matches" a partial selection if it contains every
  // selected value id (optionally ignoring one group).
  function matches(variant, ignoreGroup) {
    return Object.keys(selected).every(function (gName) {
      if (gName === ignoreGroup) return true;
      return variant.options.indexOf(selected[gName]) !== -1;
    });
  }

  function findExactVariant() {
    if (Object.keys(selected).length !== groups.length) return null;
    return product.variants.find(function (v) {
      return Object.keys(selected).every(function (gName) {
        return v.options.indexOf(selected[gName]) !== -1;
      });
    }) || null;
  }

  function refresh() {
    // 1. Enable/disable each value button based on whether some enabled
    //    variant combines it with the rest of the selection.
    groupsEl.querySelectorAll('.variant-btn').forEach(function (btn) {
      var gName = btn.dataset.group;
      var valId = parseInt(btn.dataset.valueId, 10);

      var possible = product.variants.some(function (v) {
        return v.options.indexOf(valId) !== -1 && matches(v, gName);
      });

      btn.disabled = !possible;
      btn.classList.toggle('selected', selected[gName] === valId);
    });

    // 2. Show the chosen value next to each group label
    groups.forEach(function (g, i) {
      var choiceEl = groupsEl.querySelectorAll('.variant-group-choice')[i];
      var val = g.values.find(function (v) { return v.id === selected[g.name]; });
      choiceEl.textContent = val ? '— ' + val.title : '';
    });

    // 3. Update price + Add to Cart state
    var variant = findExactVariant();
    var missing = groups.filter(function (g) { return !(g.name in selected); })
                        .map(function (g) { return singular(g.name); });

    if (variant) {
      priceEl.textContent = fmt(variant.price);
      if (variant.inStock === false) {
        addBtn.disabled = true;
        addBtn.textContent = 'Out of Stock';
        hintEl.textContent = 'This combination is currently unavailable.';
      } else {
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Cart — ' + fmt(variant.price);
        hintEl.textContent = '';
      }
    } else {
      var prices = product.variants.map(function (v) { return v.price; });
      var lo = Math.min.apply(null, prices);
      var hi = Math.max.apply(null, prices);
      priceEl.textContent = lo === hi ? fmt(lo) : fmt(lo) + ' – ' + fmt(hi);
      addBtn.disabled = true;
      addBtn.textContent = 'Add to Cart';
      hintEl.textContent = missing.length
        ? 'Please choose a ' + missing.join(' and a ')
        : 'That combination isn’t available — try another.';
    }
  }

  addBtn.onclick = function () {
    var variant = findExactVariant();
    if (!variant || variant.inStock === false) return;
    onAdd(product, variant);
    closeVariantPicker();
  };

  refresh();
  pickerEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeVariantPicker() {
  if (pickerEl) pickerEl.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Internal ─────────────────────────────────────────────────

function buildDOM() {
  var el = document.createElement('div');
  el.className = 'variant-modal-overlay';
  el.innerHTML =
    '<div class="variant-modal" role="dialog" aria-modal="true" aria-label="Choose options">' +
      '<div class="variant-modal-header">' +
        '<div>' +
          '<h3 class="variant-modal-title"></h3>' +
          '<p class="variant-modal-price"></p>' +
        '</div>' +
        '<button type="button" class="variant-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="variant-groups"></div>' +
      '<div class="variant-modal-footer">' +
        '<p class="variant-hint" role="status"></p>' +
        '<button type="button" class="btn btn-primary variant-add-btn" disabled>Add to Cart</button>' +
      '</div>' +
    '</div>';

  el.querySelector('.variant-close').addEventListener('click', closeVariantPicker);
  el.addEventListener('click', function (e) { if (e.target === el) closeVariantPicker(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && el.classList.contains('open')) closeVariantPicker();
  });

  document.body.appendChild(el);
  pickerEl = el;
}

function groupRank(g) {
  var n = (g.type || g.name || '').toLowerCase();
  if (n.indexOf('color') !== -1 || n.indexOf('colour') !== -1) return 0;
  if (n.indexOf('size') !== -1) return 1;
  return 2;
}

function singular(name) {
  var n = name.toLowerCase();
  if (n.indexOf('colo') !== -1) return 'color';
  if (n.indexOf('size') !== -1) return 'size';
  return n.replace(/s$/, '');
}

function fmt(cents) { return '$' + (cents / 100).toFixed(2); }

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
