// ============================================================
// Christos.Fashion — PaymentIntent fulfillment metadata
//
// Stripe caps every metadata VALUE at 500 characters. The original code
// stored the cart as `JSON.stringify(lineItems)`, which costs ~80 characters
// per line item — so a cart with 7 or more distinct items produced a value
// over the limit and Stripe rejected the PaymentIntent outright. Checkout
// failed for exactly the largest orders. Checkout allows up to 10 distinct
// items, so this was reachable.
//
// The cart is now encoded compactly:
//
//   <product_id>~<variant_id>~<quantity>|<product_id>~<variant_id>~<quantity>
//
// ~40 characters per item, so a full 10-item cart lands near 400 characters
// with room to spare. Printify product ids are hex and variant ids/quantities
// are numeric, so neither delimiter can appear inside a field.
//
// Shipping is no longer duplicated into metadata at all: Stripe already
// stores it natively on the PaymentIntent (`intent.shipping` +
// `receipt_email`), so reading it back from there is both smaller and more
// reliable. `shippingFromIntent` still falls back to the old metadata blob so
// that PaymentIntents created before this change — including Stripe webhook
// retries for in-flight orders — keep fulfilling correctly.
// ============================================================

const STRIPE_METADATA_VALUE_LIMIT = 500;

// Written under a new key so a webhook retry for an older PaymentIntent still
// finds its original `line_items` value and fulfills from that.
const LINE_ITEMS_KEY = 'line_items_v2';
const LEGACY_LINE_ITEMS_KEY = 'line_items';

function encodeLineItems(lineItems) {
  const encoded = (lineItems || [])
    .map(item => [
      String(item.product_id || ''),
      String(item.variant_id != null ? item.variant_id : ''),
      String(Math.max(1, Number(item.quantity) || 1)),
    ].join('~'))
    .join('|');

  if (encoded.length > STRIPE_METADATA_VALUE_LIMIT) {
    const error = new Error(
      `Encoded cart is ${encoded.length} characters, over Stripe's ${STRIPE_METADATA_VALUE_LIMIT}-character metadata limit`
    );
    error.code = 'METADATA_TOO_LARGE';
    throw error;
  }
  return encoded;
}

function parseLineItems(metadata) {
  const meta = metadata || {};

  // Current compact format.
  const compact = String(meta[LINE_ITEMS_KEY] || '').trim();
  if (compact) {
    return compact
      .split('|')
      .filter(Boolean)
      .map(part => {
        const [productId, variantId, quantity] = part.split('~');
        return {
          product_id: String(productId || ''),
          // Printify expects the variant id as a number.
          variant_id: Number(variantId),
          quantity: Math.max(1, Number(quantity) || 1),
        };
      })
      .filter(item => item.product_id && Number.isFinite(item.variant_id));
  }

  // Legacy JSON format — kept so in-flight orders created before the compact
  // encoding shipped still fulfill on a webhook retry.
  try {
    const parsed = JSON.parse(meta[LEGACY_LINE_ITEMS_KEY] || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => ({
        product_id: String(item.product_id || ''),
        variant_id: Number(item.variant_id),
        quantity: Math.max(1, Number(item.quantity) || 1),
      }))
      .filter(item => item.product_id && Number.isFinite(item.variant_id));
  } catch (e) {
    return [];
  }
}

// Rebuild the shipping address from what Stripe itself recorded, falling back
// to the old metadata blob for PaymentIntents created before that blob was
// dropped. Field names match what Printify and the Meta CAPI helper expect.
function shippingFromIntent(intent) {
  const shipping = (intent && intent.shipping) || {};
  const address = shipping.address || {};
  let legacy = {};
  try { legacy = JSON.parse(((intent && intent.metadata) || {}).shipping || '{}') || {}; } catch (e) { legacy = {}; }

  return {
    name: shipping.name || legacy.name || '',
    email: (intent && intent.receipt_email) || legacy.email || '',
    phone: shipping.phone || legacy.phone || '',
    address1: address.line1 || legacy.address1 || '',
    address2: address.line2 || legacy.address2 || '',
    city: address.city || legacy.city || '',
    state: address.state || legacy.state || '',
    zip: address.postal_code || legacy.zip || '',
    country: address.country || legacy.country || 'US',
  };
}

module.exports = {
  STRIPE_METADATA_VALUE_LIMIT,
  LINE_ITEMS_KEY,
  LEGACY_LINE_ITEMS_KEY,
  encodeLineItems,
  parseLineItems,
  shippingFromIntent,
};
