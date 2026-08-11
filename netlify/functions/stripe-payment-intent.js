// ============================================================
// Netlify Function: stripe-payment-intent
// POST /api/stripe-payment-intent
//
// Receives the cart (items + quantities + variant prices) and
// a shipping address, calculates the total server-side (so the
// client can't manipulate prices), then creates a Stripe
// PaymentIntent and returns the client_secret.
//
// Env vars required:
//   STRIPE_SECRET_KEY        — your Stripe secret key (sk_live_... or sk_test_...)
//   PRINTIFY_API_KEY         — used to verify variant prices from Printify
//   PRINTIFY_SHOP_ID
//
// Body JSON shape:
// {
//   items: [{ productId, variantId, quantity }],
//   shipping: { name, address1, city, state, zip, country }
// }
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PRINTIFY_BASE = 'https://api.printify.com/v1';

// Flat shipping cost in cents. Adjust or add logic for free-shipping threshold.
const SHIPPING_COST_CENTS = 599; // $5.99
const FREE_SHIPPING_THRESHOLD_CENTS = 5000; // $50.00

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(204, '');
  if (event.httpMethod !== 'POST') return cors(405, JSON.stringify({ error: 'Method not allowed' }));

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return cors(400, JSON.stringify({ error: 'Invalid JSON body' }));
  }

  const { items, shipping } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return cors(400, JSON.stringify({ error: 'Cart is empty' }));
  }
  if (items.length > 10) {
    return cors(400, JSON.stringify({ error: 'Too many distinct items in one order' }));
  }

  // Validate shipping server-side before accepting payment. Client-side validation
  // improves UX, but it cannot be trusted for fulfillment-critical data.
  const shippingError = validateUSShipping(shipping);
  if (shippingError) {
    return cors(400, JSON.stringify({ error: shippingError }));
  }

  const { PRINTIFY_API_KEY, PRINTIFY_SHOP_ID, STRIPE_SECRET_KEY } = process.env;
  if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID || !STRIPE_SECRET_KEY) {
    return cors(500, JSON.stringify({ error: 'Server misconfiguration' }));
  }

  try {
    // Verify prices server-side by fetching each product from Printify
    let subtotalCents = 0;
    const lineItems = [];

    for (const item of items) {
      const res = await fetch(
        `${PRINTIFY_BASE}/shops/${PRINTIFY_SHOP_ID}/products/${item.productId}.json`,
        { headers: { Authorization: `Bearer ${PRINTIFY_API_KEY}` } }
      );

      if (!res.ok) {
        return cors(400, JSON.stringify({ error: `Product ${item.productId} not found` }));
      }

      const product = await res.json();
      const variant = product.variants.find(v => v.id === item.variantId && v.is_enabled && v.is_available !== false);

      if (!variant) {
        return cors(400, JSON.stringify({ error: `Variant ${item.variantId} unavailable` }));
      }

      const qty = Math.min(10, Math.max(1, Math.floor(Number(item.quantity) || 1)));
      subtotalCents += variant.price * qty;

      // Keep metadata intentionally compact; the webhook only needs these
      // fulfillment identifiers. Pricing is already locked into the PI amount.
      lineItems.push({
        product_id: product.id,
        variant_id: variant.id,
        quantity: qty,
      });
    }

    const shippingCents =
      subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_COST_CENTS;
    const totalCents = subtotalCents + shippingCents;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   totalCents,
      currency: 'usd',
      // Store everything we need to create the Printify order in the webhook
      metadata: {
        line_items: JSON.stringify(lineItems),
        shipping:   JSON.stringify(shipping ?? {}),
        subtotal:   subtotalCents,
        shipping_cost: shippingCents,
      },
      receipt_email: shipping.email,
      shipping: {
        name: shipping.name,
        phone: shipping.phone || undefined,
        address: {
          line1: shipping.address1,
          line2: shipping.address2 || undefined,
          city: shipping.city,
          state: shipping.state,
          postal_code: shipping.zip,
          country: 'US',
        },
      },
      automatic_payment_methods: { enabled: true },
    });

    return cors(200, JSON.stringify({
      clientSecret:   paymentIntent.client_secret,
      subtotalCents,
      shippingCents,
      totalCents,
    }));
  } catch (err) {
    console.error('stripe-payment-intent error:', err);
    return cors(500, JSON.stringify({ error: err.message }));
  }
};

function validateUSShipping(shipping) {
  if (!shipping || typeof shipping !== 'object') return 'Shipping address is required';
  const required = ['name', 'email', 'address1', 'city', 'state', 'zip'];
  for (const key of required) {
    if (!String(shipping[key] || '').trim()) return `Missing shipping field: ${key}`;
  }
  if (String(shipping.country || 'US').toUpperCase() !== 'US') return 'Checkout is currently available for U.S. delivery only';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(shipping.email).trim())) return 'Enter a valid email address';
  if (!/^[A-Za-z]{2}$/.test(String(shipping.state).trim())) return 'Enter a valid two-letter U.S. state code';
  if (!/^\d{5}(-\d{4})?$/.test(String(shipping.zip).trim())) return 'Enter a valid U.S. ZIP code';
  return '';
}

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body,
  };
}
