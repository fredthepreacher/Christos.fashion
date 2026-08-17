// ============================================================
// Christos.Fashion — server-side payment verification
//
// order-success.html must never fire a conversion just because someone loaded
// the page, or because they hand-edited `?value=` in the URL. This endpoint is
// the single source of truth for "did this payment actually succeed, and for
// how much" — the browser asks Stripe (via us) instead of trusting itself.
//
// Only the buyer's own PaymentIntent id (which they already have, it is in
// their URL) unlocks a response, and the response carries no personal data:
// amount, currency, and the product/variant ids already visible in their cart.
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, '');
  if (event.httpMethod !== 'GET') return response(405, JSON.stringify({ error: 'Method not allowed' }));
  if (!process.env.STRIPE_SECRET_KEY) return response(500, JSON.stringify({ error: 'Server misconfiguration' }));

  const orderId = String((event.queryStringParameters || {}).order || '').trim();
  // Shape-check before spending a Stripe API call on obvious junk.
  if (orderId.length > 255 || !/^pi_[A-Za-z0-9_]+$/.test(orderId)) {
    return response(400, JSON.stringify({ error: 'Invalid order reference' }));
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(orderId);
    // Anything that is not a completed payment is reported as "not found" so
    // this endpoint cannot be used to probe the state of pending intents.
    if (!intent || intent.status !== 'succeeded') {
      return response(404, JSON.stringify({ error: 'Confirmed payment not found' }));
    }

    let lineItems = [];
    try { lineItems = JSON.parse((intent.metadata && intent.metadata.line_items) || '[]'); } catch (e) { lineItems = []; }
    if (!Array.isArray(lineItems)) lineItems = [];

    return response(200, JSON.stringify({
      orderId: intent.id,
      value: Number(intent.amount_received || intent.amount || 0) / 100,
      currency: String(intent.currency || 'usd').toUpperCase(),
      items: lineItems.map(item => ({
        item_id: String(item.product_id || ''),
        item_variant_id: String(item.variant_id || ''),
        quantity: Number(item.quantity || 1),
      })).filter(item => item.item_id),
    }));
  } catch (err) {
    // Never echo the Stripe error text back to the browser — it can name
    // internal objects. Log it server-side, return the generic answer.
    console.error('payment-status error:', err.message);
    return response(404, JSON.stringify({ error: 'Confirmed payment not found' }));
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
    body,
  };
}
