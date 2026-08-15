// ============================================================
// Christos.Fashion — measurement bootstrap (GA4 + Google Ads + Meta Pixel)
//
// Public IDs come from /api/public-config, which reads Netlify environment
// variables. No secret credentials are exposed here — the Meta Conversions API
// token is server-side only and is never sent to the browser.
//
// Nothing loads until the visitor accepts on the consent bar. If no IDs are
// configured, no consent bar is shown and no third-party script is requested,
// so the integration is completely inert until the owner supplies real IDs.
//
// One shared queue feeds every destination: call window.cfTrack(name, params)
// with GA4-shaped event names/params and the Meta equivalent is derived here.
// ============================================================
(function () {
  const CONSENT_KEY = 'cf_analytics_consent_v1';

  let config = null;
  let started = false;      // consent granted and loaders invoked
  let declined = false;
  let googleReady = false;
  let metaReady = false;
  let queue = [];

  // ---- public API ------------------------------------------------------
  window.cfTrack = function (name, params) {
    if (!name || declined) return;
    if (!started) { queue.push([name, params || {}]); return; }
    dispatch(name, params || {});
  };

  fetch('/api/public-config', { credentials: 'same-origin' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('config unavailable')))
    .then(cfg => {
      config = cfg || {};
      if (!hasAnyDestination()) return;          // nothing configured → stay silent
      const consent = localStorage.getItem(CONSENT_KEY);
      if (consent === 'accepted') start();
      else if (consent === 'declined') declined = true;
      else showConsent();
    })
    .catch(() => {});

  function hasAnyDestination() {
    return !!(config.ga4MeasurementId || config.googleAdsId || config.metaPixelId);
  }

  function start() {
    if (started) return;
    loadGoogle();
    loadMeta();
    started = true;
    queue.splice(0).forEach(([name, params]) => dispatch(name, params));
    window.dispatchEvent(new CustomEvent('cf-analytics-ready'));
  }

  function dispatch(name, params) {
    try { sendGoogle(name, params); } catch (e) { /* never break the page for analytics */ }
    try { sendMeta(name, params); } catch (e) { /* ditto */ }
  }

  // ---- Google (GA4 + Ads) ---------------------------------------------
  function loadGoogle() {
    if (googleReady) return;
    const primaryId = config.ga4MeasurementId || config.googleAdsId;
    if (!primaryId) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    window.gtag('js', new Date());
    if (config.ga4MeasurementId) window.gtag('config', config.ga4MeasurementId, { anonymize_ip: true });
    if (config.googleAdsId) window.gtag('config', config.googleAdsId);
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(primaryId);
    document.head.appendChild(s);
    googleReady = true;
  }

  function sendGoogle(name, params) {
    if (!googleReady || typeof window.gtag !== 'function') return;
    window.gtag('event', name, params);
    if (name === 'purchase' && config.googleAdsId && config.googleAdsPurchaseLabel) {
      window.gtag('event', 'conversion', {
        send_to: config.googleAdsId + '/' + config.googleAdsPurchaseLabel,
        value: params.value,
        currency: params.currency || 'USD',
        transaction_id: params.transaction_id || '',
      });
    }
  }

  // ---- Meta Pixel ------------------------------------------------------
  function loadMeta() {
    if (metaReady || !config.metaPixelId) return;

    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq('init', config.metaPixelId);
    window.fbq('track', 'PageView', {}, { eventID: randomEventId('PageView') });
    metaReady = true;
  }

  // GA4 event name -> Meta standard event + custom_data builder.
  const META_EVENTS = {
    view_item: p => ['ViewContent', {
      content_type: 'product',
      content_ids: contentIds(p.items),
      content_name: firstItem(p.items).item_name,
      content_category: firstItem(p.items).item_category,
      value: num(p.value),
      currency: p.currency || 'USD',
    }],
    add_to_cart: p => ['AddToCart', {
      content_type: 'product',
      content_ids: contentIds(p.items),
      contents: contents(p.items),
      value: num(p.value),
      currency: p.currency || 'USD',
    }],
    begin_checkout: p => ['InitiateCheckout', {
      content_type: 'product',
      content_ids: contentIds(p.items),
      contents: contents(p.items),
      num_items: itemCount(p.items),
      value: num(p.value),
      currency: p.currency || 'USD',
    }],
    purchase: p => ['Purchase', {
      content_type: 'product',
      content_ids: contentIds(p.items),
      contents: contents(p.items),
      num_items: itemCount(p.items),
      value: num(p.value),
      currency: p.currency || 'USD',
      order_id: p.transaction_id || '',
    }],
    generate_lead: p => ['Lead', {
      content_name: p.content_name || 'Newsletter',
      value: num(p.value),
      currency: p.currency || 'USD',
    }],
    search: p => ['Search', {
      search_string: p.search_term || '',
      content_type: 'product',
      content_ids: contentIds(p.items),
    }],
  };

  function sendMeta(name, params) {
    if (!metaReady || typeof window.fbq !== 'function') return;
    const build = META_EVENTS[name];
    if (!build) return;
    const [eventName, customData] = build(params);
    window.fbq('track', eventName, customData, { eventID: metaEventId(name, params) });
  }

  // Purchase must use a DETERMINISTIC id so the browser event and the
  // Conversions API event sent from stripe-webhook.js carry the same
  // event_id and Meta collapses them into one conversion. The Stripe
  // PaymentIntent id is the shared key. Everything else is one-way
  // (browser only), so a random id is correct there.
  function metaEventId(name, params) {
    if (name === 'purchase' && params.transaction_id) return 'purchase_' + params.transaction_id;
    return randomEventId(name);
  }

  function randomEventId(name) {
    const rand = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return name + '_' + rand;
  }

  // ---- shared helpers --------------------------------------------------
  function firstItem(items) { return (Array.isArray(items) && items[0]) || {}; }
  function contentIds(items) { return (items || []).map(i => String(i.item_id || '')).filter(Boolean); }
  function contents(items) {
    return (items || []).map(i => ({
      id: String(i.item_id || ''),
      quantity: Number(i.quantity) || 1,
      item_price: num(i.price),
    }));
  }
  function itemCount(items) { return (items || []).reduce((n, i) => n + (Number(i.quantity) || 1), 0); }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

  // ---- consent ---------------------------------------------------------
  function showConsent() {
    if (document.getElementById('cf-consent')) return;
    const el = document.createElement('div');
    el.id = 'cf-consent';
    el.className = 'cf-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Analytics and advertising preference');
    el.innerHTML = '<p>We use analytics and advertising measurement tools, including Google Analytics and the Meta Pixel, to understand site performance and measure ads. You can accept or decline non-essential tracking.</p><div><button type="button" class="btn btn-primary btn-sm" data-consent="accept">Accept</button><button type="button" class="btn btn-outline btn-sm" data-consent="decline">Decline</button><a href="/privacy.html">Privacy</a></div>';
    document.body.appendChild(el);
    el.querySelector('[data-consent="accept"]').addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      el.remove();
      start();
    });
    el.querySelector('[data-consent="decline"]').addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'declined');
      declined = true;
      queue = [];
      el.remove();
    });
  }
})();
