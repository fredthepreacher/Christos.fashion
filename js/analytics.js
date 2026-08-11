// Christos.Fashion — Google Analytics / Ads bootstrap.
// Public IDs are supplied by /api/public-config from Netlify environment variables.
// No secret credentials are exposed here.
(function () {
  const CONSENT_KEY = 'cf_analytics_consent_v1';
  let config = null;
  let ready = false;
  let queue = [];

  window.cfTrack = function (name, params) {
    if (!name) return;
    if (!ready || typeof window.gtag !== 'function') {
      queue.push([name, params || {}]);
      return;
    }
    send(name, params || {});
  };

  fetch('/api/public-config', { credentials: 'same-origin' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('config unavailable')))
    .then(cfg => {
      config = cfg || {};
      if (!config.ga4MeasurementId && !config.googleAdsId) return;
      const consent = localStorage.getItem(CONSENT_KEY);
      if (consent === 'accepted') loadGoogle();
      else if (consent !== 'declined') showConsent();
    })
    .catch(() => {});

  function loadGoogle() {
    if (ready) return;
    const primaryId = config.ga4MeasurementId || config.googleAdsId;
    if (!primaryId) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    window.gtag('js', new Date());
    if (config.ga4MeasurementId) window.gtag('config', config.ga4MeasurementId, { anonymize_ip: true });
    if (config.googleAdsId) window.gtag('config', config.googleAdsId);
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(primaryId);
    document.head.appendChild(s);
    ready = true;
    queue.splice(0).forEach(([name, params]) => send(name, params));
    window.dispatchEvent(new CustomEvent('cf-analytics-ready'));
  }

  function send(name, params) {
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

  function showConsent() {
    if (document.getElementById('cf-consent')) return;
    const el = document.createElement('div');
    el.id = 'cf-consent';
    el.className = 'cf-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Analytics preference');
    el.innerHTML = '<p>We use analytics to understand site performance and measure advertising. You can accept or decline non-essential tracking.</p><div><button type="button" class="btn btn-primary btn-sm" data-consent="accept">Accept</button><button type="button" class="btn btn-outline btn-sm" data-consent="decline">Decline</button><a href="/privacy.html">Privacy</a></div>';
    document.body.appendChild(el);
    el.querySelector('[data-consent="accept"]').addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      el.remove();
      loadGoogle();
    });
    el.querySelector('[data-consent="decline"]').addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'declined');
      queue = [];
      el.remove();
    });
  }
})();
