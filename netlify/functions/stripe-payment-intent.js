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
      const variant = product.variants.find(v => v.id === item.variantId && v.is_enabled);

      if (!variant) {
        return cors(400, JSON.stringify({ error: `Variant ${item.variantId} unavailable` }));
      }

      const qty = Math.max(1, Math.floor(item.quantity ?? 1));
      subtotalCents += variant.price * qty;

      lineItems.push({
        product_id:      product.id,
        variant_id:      variant.id,
        quantity:        qty,
        price_cents:     variant.price,
        title:           `${product.title} — ${variant.title}`,
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
