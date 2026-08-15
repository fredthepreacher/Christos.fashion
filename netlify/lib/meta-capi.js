// ============================================================
// Meta Conversions API — server-side event sender.
//
// Env vars (all optional; the module is a no-op until they exist):
//   META_PIXEL_ID          — the dataset / pixel ID, same value the browser uses
//   META_CAPI_TOKEN        — system-user access token. SERVER-SIDE ONLY.
//                            Never add this to public-config.js.
//   META_TEST_EVENT_CODE   — optional; set while validating in Events Manager,
//                            then remove so live traffic is not flagged as test
//   META_GRAPH_VERSION     — optional override, e.g. "v25.0"
//
// Deduplication: every call must pass an eventId that the browser Pixel also
// emits for the same action. For Purchase both sides use
// `purchase_<stripe_payment_intent_id>`, so Meta counts one conversion no
// matter which arrives first — or if Stripe retries the webhook.
//
// This module never throws and never blocks fulfillment. A failed or slow
// Meta call is logged and swallowed: losing an ad event must never cost a
// customer their order.
// ============================================================

const crypto = require('crypto');

const DEFAULT_GRAPH_VERSION = 'v25.0';
const TIMEOUT_MS = 3000;

function isConfigured(env = process.env) {
  return !!(env.META_PIXEL_ID && env.META_CAPI_TOKEN);
}

// Meta requires SHA-256 of the normalized value: trimmed, lowercased,
// no punctuation for phone numbers. Empty values must be omitted entirely
// rather than sent as a hash of "".
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hashText(value) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  return normalized ? sha256(normalized) : undefined;
}

function hashPhone(value) {
  const digits = String(value == null ? '' : value).replace(/\D/g, '');
  return digits ? sha256(digits) : undefined;
}

function hashZip(value) {
  // US ZIP: first five digits only, per Meta's normalization guidance.
  const digits = String(value == null ? '' : value).replace(/\D/g, '').slice(0, 5);
  return digits ? sha256(digits) : undefined;
}

/**
 * Build the hashed user_data block from a shipping address plus whatever
 * browser identifiers we captured at checkout. Every field is optional —
 * more fields simply raise Event Match Quality.
 */
function buildUserData({ email, phone, name, city, state, zip, country, fbp, fbc, clientIp, clientUserAgent } = {}) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

  const data = {
    em: hashText(email),
    ph: hashPhone(phone),
    fn: hashText(firstName),
    ln: hashText(lastName),
    ct: hashText(String(city || '').replace(/\s/g, '')),
    st: hashText(state),
    zp: hashZip(zip),
    country: hashText(country || 'us'),
    // fbp / fbc are already opaque browser identifiers — Meta requires them UNhashed.
    fbp: fbp || undefined,
    fbc: fbc || undefined,
    client_ip_address: clientIp || undefined,
    client_user_agent: clientUserAgent || undefined,
  };

  Object.keys(data).forEach(k => { if (data[k] === undefined || data[k] === '') delete data[k]; });
  return data;
}

/**
 * Send one server event. Resolves to a small status object; never rejects.
 */
async function sendServerEvent({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  actionSource = 'website',
  userData = {},
  customData = {},
}, env = process.env) {
  if (!isConfigured(env)) return { sent: false, reason: 'not_configured' };
  if (!eventName || !eventId) return { sent: false, reason: 'missing_event_identity' };

  const version = env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
  const url = `https://graph.facebook.com/${version}/${env.META_PIXEL_ID}/events`;

  const payload = {
    data: [{
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Number(eventTime) || Date.now() / 1000),
      action_source: actionSource,
      event_source_url: eventSourceUrl || undefined,
      user_data: userData,
      custom_data: customData,
    }],
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${url}?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Meta CAPI rejected event', eventName, res.status, text.slice(0, 300));
      return { sent: false, reason: 'http_' + res.status };
    }
    console.log('Meta CAPI accepted', eventName, eventId);
    return { sent: true, response: text.slice(0, 200) };
  } catch (err) {
    console.error('Meta CAPI request failed', eventName, err.name === 'AbortError' ? 'timeout' : err.message);
    return { sent: false, reason: err.name === 'AbortError' ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  isConfigured,
  buildUserData,
  sendServerEvent,
  // exported for tests
  hashText,
  hashPhone,
  hashZip,
  DEFAULT_GRAPH_VERSION,
};
