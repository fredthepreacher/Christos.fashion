// ============================================================
// Netlify Function: stripe-webhook
// POST /api/stripe-webhook  (registered in your Stripe dashboard)
//
// Stripe calls this after a payment succeeds. We verify the
// webhook signature, then create a Printify order with the
// line items and shipping address we stored in PaymentIntent metadata.
//
// Env vars required:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET   — from Stripe dashboard → Webhooks → signing secret
//   PRINTIFY_API_KEY
//   PRINTIFY_SHOP_ID
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PRINTIFY_BASE = 'https://api.printify.com/v1';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const { STRIPE_WEBHOOK_SECRET, PRINTIFY_API_KEY, PRINTIFY_SHOP_ID } = process.env;

  let stripeEvent;
  try {
    // Verify the event came from Stripe (prevents spoofed webhooks)
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,           // raw body — must be the raw string, not parsed JSON
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Only act on successful payments
  if (stripeEvent.type !== 'payment_intent.succeeded') {
    return { statusCode: 200, body: 'Event ignored' };
  }

  const intent = stripeEvent.data.object;
  const { line_items: lineItemsJSON, shipping: shippingJSON } = intent.metadata;

  if (!lineItemsJSON || !shippingJSON) {
    console.error('Missing metadata on PaymentIntent', intent.id);
    return { statusCode: 200, body: 'Missing metadata — order not created' };
  }

  let lineItems, shipping;
  try {
    lineItems = JSON.parse(lineItemsJSON);
    shipping  = JSON.parse(shippingJSON);
  } catch {
    return { statusCode: 200, body: 'Invalid metadata JSON' };
  }

  try {
    // Build the Printify order payload
    // Docs: https://developers.printify.com/#create-a-new-order
    const printifyOrder = {
      external_id: intent.id,          // links Stripe payment to Printify order
      label:       `CF-${intent.id.slice(-8).toUpperCase()}`,
      line_items:  lineItems.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity:   item.quantity,
      })),
      shipping_method: 1,              // standard shipping; see Printify docs for options
      send_shipping_notification: true,
      address_to: {
        first_name: (shipping.name ?? '').split(' ')[0] ?? '',
        last_name:  (shipping.name ?? '').split(' ').slice(1).join(' ') ?? '',
        email:      shipping.email ?? '',
        phone:      shipping.phone ?? '',
        country:    shipping.country ?? 'US',
        region:     shipping.state ?? '',
        address1:   shipping.address1 ?? '',
        address2:   shipping.address2 ?? '',
        city:       shipping.city ?? '',
        zip:        shipping.zip ?? '',
      },
    };

    const res = await fetch(
      `${PRINTIFY_BASE}/shops/${PRINTIFY_SHOP_ID}/orders.json`,
      {
        method:  'POST',
        headers: {
          Authorization: `Bearer ${PRINTIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(printifyOrder),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Printify order creation failed:', res.status, text);
      // Return 200 to Stripe so it doesn't retry — log and investigate manually
      return { statusCode: 200, body: 'Printify order failed — logged' };
    }

    const order = await res.json();
    console.log('Printify order created:', order.id, '| Stripe:', intent.id);

    return { statusCode: 200, body: JSON.stringify({ printifyOrderId: order.id }) };
  } catch (err) {
    console.error('stripe-webhook order creation error:', err);
    return { statusCode: 200, body: 'Error creating order — logged' };
  }
};
