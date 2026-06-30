// ============================================================
// CHRISTOS.FASHION — Cart Module
// Persists to localStorage. Renders a slide-out drawer.
// Import on every page: <script src="js/cart.js"></script>
// ============================================================

const CART_KEY = 'cf_cart_v1';

// ── State ────────────────────────────────────────────────────
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

// Each cart item: { productId, variantId, title, variantTitle, price, image, quantity }

export const Cart = {
  items() { return loadCart(); },

  count() {
    return loadCart().reduce((n, i) => n + i.quantity, 0);
  },

  add(item) {
    const items = loadCart();
    const idx = items.findIndex(
      i => i.productId === item.productId && i.variantId === item.variantId
    );
    if (idx >= 0) {
      items[idx].quantity += item.quantity ?? 1;
    } else {
      items.push({ ...item, quantity: item.quantity ?? 1 });
    }
    saveCart(items);
    CartUI.sync();
    CartUI.open();
  },

  remove(productId, variantId) {
    const items = loadCart().filter(
      i => !(i.productId === productId && i.variantId === variantId)
    );
    saveCart(items);
    CartUI.sync();
  },

  updateQty(productId, variantId, qty) {
    const items = loadCart().map(i =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, quantity: Math.max(0, qty) }
        : i
    ).filter(i => i.quantity > 0);
    saveCart(items);
    CartUI.sync();
  },

  clear() {
    saveCart([]);
    CartUI.sync();
  },

  subtotalCents() {
    return loadCart().reduce((n, i) => n + i.price * i.quantity, 0);
  },
};

// ── UI ───────────────────────────────────────────────────────
export const CartUI = {
  init() {
    // Inject drawer + overlay HTML into the page once
    if (document.getElementById('cart-drawer')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="cart-overlay" class="cart-overlay" aria-hidden="true"></div>
      <aside id="cart-drawer" class="cart-drawer" aria-label="Shopping cart" role="dialog" aria-modal="true">
        <div class="cart-drawer-header">
          <h2 class="cart-drawer-title">Your Cart</h2>
          <button id="cart-close" class="cart-close" aria-label="Close cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div id="cart-items" class="cart-items"></div>
        <div id="cart-footer" class="cart-footer" style="display:none">
          <div class="cart-subtotal">
            <span>Subtotal</span>
            <strong id="cart-subtotal-amount"></strong>
          </div>
          <p class="cart-shipping-note">Shipping calculated at checkout. Free on orders $50+.</p>
          <a href="checkout.html" class="btn btn-primary cart-checkout-btn">Proceed to Checkout</a>
        </div>
      </aside>
    `);

    document.getElementById('cart-close').addEventListener('click', () => CartUI.close());
    document.getElementById('cart-overlay').addEventListener('click', () => CartUI.close());

    // Wire up the nav cart button (if present)
    document.querySelectorAll('[data-cart-toggle]').forEach(btn => {
      btn.addEventListener('click', () => CartUI.toggle());
    });

    this.sync();
  },

  open() {
    document.getElementById('cart-drawer')?.classList.add('open');
    document.getElementById('cart-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  },

  toggle() {
    document.getElementById('cart-drawer')?.classList.contains('open')
      ? this.close()
      : this.open();
  },

  sync() {
    // Update badge count
    const count = Cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });

    // Render items list
    const itemsEl  = document.getElementById('cart-items');
    const footerEl = document.getElementById('cart-footer');
    if (!itemsEl) return;

    const items = Cart.items();

    if (items.length === 0) {
      itemsEl.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="48" height="48" style="opacity:.3">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.99-1.74L23 6H6"/>
          </svg>
          <p>Your cart is empty.</p>
          <a href="shop.html" class="btn btn-outline btn-sm" style="margin-top:12px">Browse Products</a>
        </div>`;
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    itemsEl.innerHTML = items.map(item => `
      <div class="cart-item" data-pid="${item.productId}" data-vid="${item.variantId}">
        <div class="cart-item-img">
          ${item.image
            ? `<img src="${item.image}" alt="${item.title}" loading="lazy"/>`
            : `<div class="cart-item-img-placeholder"></div>`}
        </div>
        <div class="cart-item-details">
          <p class="cart-item-name">${item.title}</p>
          <p class="cart-item-variant">${item.variantTitle}</p>
          <div class="cart-item-row">
            <div class="cart-qty-control">
              <button class="cart-qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
              <span class="cart-qty-value">${item.quantity}</span>
              <button class="cart-qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
            </div>
            <span class="cart-item-price">${formatPrice(item.price * item.quantity)}</span>
          </div>
        </div>
        <button class="cart-remove-btn" aria-label="Remove ${item.title}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Bind qty/remove controls
    itemsEl.querySelectorAll('.cart-item').forEach(el => {
      const pid = el.dataset.pid;
      const vid = parseInt(el.dataset.vid, 10);

      el.querySelector('.cart-remove-btn')?.addEventListener('click', () => {
        Cart.remove(pid, vid);
      });

      el.querySelectorAll('.cart-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = Cart.items().find(i => i.productId === pid && i.variantId === vid);
          if (!item) return;
          const delta = btn.dataset.action === 'inc' ? 1 : -1;
          Cart.updateQty(pid, vid, item.quantity + delta);
        });
      });
    });

    // Update subtotal
    if (footerEl) {
      footerEl.style.display = 'block';
      const subtotalEl = document.getElementById('cart-subtotal-amount');
      if (subtotalEl) subtotalEl.textContent = formatPrice(Cart.subtotalCents());
    }
  },
};

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CartUI.init());
} else {
  CartUI.init();
}
