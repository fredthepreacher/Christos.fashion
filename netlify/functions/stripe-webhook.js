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
const { isConfigured, buildUserData, sendServerEvent } = require('../lib/meta-capi');
const PRINTIFY_BASE = 'https://api.printify.com/v1';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const { STRIPE_WEBHOOK_SECRET, PRINTIFY_API_KEY, PRINTIFY_SHOP_ID } = process.env;
  if (!STRIPE_WEBHOOK_SECRET || !PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID || !process.env.STRIPE_SECRET_KEY) {
    console.error('stripe-webhook missing required environment variables');
    return { statusCode: 500, body: 'Server misconfiguration' };
  }

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
    return { statusCode: 500, body: 'Missing fulfillment metadata; retry requested' };
  }

  let lineItems, shipping;
  try {
    lineItems = JSON.parse(lineItemsJSON);
    shipping  = JSON.parse(shippingJSON);
  } catch {
    return { statusCode: 500, body: 'Invalid fulfillment metadata; retry requested' };
  }

  try {
    // Build the Printify order payload
    // Docs: https://developers.printify.com/#create-a-new-order
    const printifyOrder = {
      external_id: intent.id,          // links Stripe payment to Printify order
      label:       `CF-${intent.id.slice(-8).toUpperCase()}`,
      line_items:  lineItems.map((item, index) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity:   item.quantity,
        external_id: `${intent.id}-${index + 1}`,
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
      // A duplicate external_id can occur if Stripe retries after Printify accepted
      // the order but the previous function response was interrupted. Treat that
      // as fulfilled/idempotent; otherwise return non-2xx so Stripe retries.
      if ((res.status === 409 || res.status === 422) && /external|duplicate|already/i.test(text)) {
        return { statusCode: 200, body: 'Order already exists in Printify' };
      }
      return { statusCode: 500, body: 'Printify order creation failed; retry requested' };
    }

    const order = await res.json();
    console.log('Printify order created:', order.id, '| Stripe:', intent.id);

    // Report the Purchase to Meta only now — after Stripe confirmed the payment
    // AND Printify accepted the order. Deliberately awaited (the function dies
    // once we return) but wrapped so a Meta outage can never fail fulfillment.
    await reportPurchaseToMeta(intent, lineItems, shipping);

    return { statusCode: 200, body: JSON.stringify({ printifyOrderId: order.id }) };
  } catch (err) {
    console.error('stripe-webhook order creation error:', err);
    return { statusCode: 500, body: 'Temporary order creation error; retry requested' };
  }
};

// ============================================================
// Meta Conversions API — server-side Purchase
//
// This is the authoritative Purchase signal. It is fired from the Stripe
// webhook rather than an open HTTP endpoint precisely because the webhook is
// signature-verified: nobody can forge a conversion by POSTing to the site.
//
// event_id is derived from the PaymentIntent id, which the browser Pixel also
// uses on order-success.html. Meta therefore deduplicates the pair, and a
// Stripe webhook retry re-sends the same id rather than double-counting.
// ============================================================
async function reportPurchaseToMeta(intent, lineItems, shipping) {
  try {
    if (!isConfigured()) return;
    // Respect the visitor's choice on the consent bar. No consent, no server event.
    if (intent.metadata.mkt_consent !== '1') {
      console.log('Meta Purchase skipped for', intent.id, '- no marketing consent');
      return;
    }

    const contents = (lineItems || []).map(li => ({
      id: String(li.product_id),
      quantity: Number(li.quantity) || 1,
    }));

    const result = await sendServerEvent({
      eventName: 'Purchase',
      eventId: 'purchase_' + intent.id,
      eventTime: intent.created,
      eventSourceUrl: intent.metadata.src_url || 'https://christos.fashion/checkout.html',
      actionSource: 'website',
      userData: buildUserData({
        email: shipping.email,
        phone: shipping.phone,
        name: shipping.name,
        city: shipping.city,
        state: shipping.state,
        zip: shipping.zip,
        country: shipping.country || 'us',
        fbp: intent.metadata.fbp,
        fbc: intent.metadata.fbc,
        clientIp: intent.metadata.client_ip,
        clientUserAgent: intent.metadata.client_ua,
      }),
      customData: {
        currency: String(intent.currency || 'usd').toUpperCase(),
        value: Number(intent.amount || 0) / 100,
        content_type: 'product',
        content_ids: contents.map(c => c.id),
        contents,
        num_items: contents.reduce((n, c) => n + c.quantity, 0),
        order_id: intent.id,
      },
    });
    if (!result.sent && result.reason !== 'not_configured') {
      console.warn('Meta Purchase not recorded for', intent.id, '-', result.reason);
    }
  } catch (err) {
    console.error('reportPurchaseToMeta failed (order is unaffected):', err.message);
  }
}
