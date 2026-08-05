// ============================================================
// CHRISTOS.FASHION — Shared Scripts v5 "2.0"
// Reverent · Hopeful · Bold · Premium · Peaceful
// ============================================================

const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================
// SCROLL REVEAL
// Covers the v4 `.reveal` fade-up plus the 2.0 directional,
// scale, stagger, and word-rise primitives. One observer, so
// adding a motion class to markup is all that's ever needed.
// ============================================================
const REVEAL_SELECTOR =
  '.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger, .rise-words';

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = entry.target.style.getPropertyValue('--reveal-delay') || '0s';
      entry.target.style.transitionDelay = delay;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll(REVEAL_SELECTOR).forEach(el => revealObserver.observe(el));

// Expose it so dynamically rendered content (product grids) can
// opt into the same choreography instead of rolling its own.
window.CFReveal = {
  observe(root) {
    (root || document).querySelectorAll(REVEAL_SELECTOR).forEach(el => {
      if (!el.classList.contains('visible')) revealObserver.observe(el);
    });
  }
};

// ============================================================
// WORD RISE — wrap headline words so each can rise on cue
// ============================================================
document.querySelectorAll('.rise-words').forEach(el => {
  if (el.dataset.riseReady) return;
  el.innerHTML = el.textContent
    .trim()
    .split(/\s+/)
    .map(word => `<span class="word"><span>${word}</span></span>`)
    .join(' ');
  el.dataset.riseReady = 'true';
});

// ============================================================
// GENTLE PARALLAX
// Range is deliberately small (max ±--parallax-range, default
// 40px) so the page still feels calm and nothing reflows.
// ============================================================
(function initParallax() {
  const layers = Array.from(document.querySelectorAll('.parallax'));
  if (!layers.length || prefersReducedMotion) return;

  let ticking = false;

  function update() {
    const vh = window.innerHeight;
    layers.forEach(layer => {
      const rect = layer.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const range = parseFloat(layer.dataset.parallaxRange || '40');
      // -1 (below fold) → 1 (above fold)
      const progress = (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2 + rect.height / 2);
      layer.style.setProperty('--parallax-y', (progress * range).toFixed(2) + 'px');
    });
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();

// ============================================================
// PHOTO SLOTS
// Marks a slot empty when its file isn't there yet, so the
// designed placeholder shows instead of a broken-image icon.
// ============================================================
document.querySelectorAll('.photo-slot img').forEach(img => {
  const markEmpty = () => img.closest('.photo-slot')?.classList.add('is-empty');
  if (img.complete && img.naturalWidth === 0) markEmpty();
  img.addEventListener('error', markEmpty);
});

// ============================================================
// NAVIGATION — Scroll State
// ============================================================
const nav = document.getElementById('nav');
if (nav) {
  const handleScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 48);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

// ============================================================
// NAVIGATION — Mobile Hamburger
// ============================================================
const hamburger = document.getElementById('hamburger');
const drawer    = document.getElementById('nav-drawer');

if (hamburger && drawer) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    drawer.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on drawer link click
  drawer.querySelectorAll('.nav-drawer-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      drawer.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (
      hamburger.classList.contains('open') &&
      !hamburger.contains(e.target) &&
      !drawer.contains(e.target)
    ) {
      hamburger.classList.remove('open');
      drawer.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}

// ============================================================
// PRODUCT FILTER TABS (Shop page)
// ============================================================
// NOTE: When the shop grid is rendered dynamically (js/shop-loader.js owns
// #product-grid), that module also owns the filter tabs. This legacy block
// only runs for static product grids, so the two never double-handle clicks
// or show the "Coming Soon" state while products are still loading.
const tabBtns = document.querySelectorAll('.tab-btn');
if (tabBtns.length > 0 && !document.getElementById('product-grid')) {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const filter = btn.dataset.filter;
      const cards  = document.querySelectorAll('.product-card');
      let visible  = 0;

      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.style.transition    = 'opacity .3s ease, transform .3s ease';
        card.style.opacity       = match ? '1' : '0';
        card.style.pointerEvents = match ? 'auto' : 'none';
        card.style.transform     = match ? ''       : 'scale(.97)';
        if (match) visible++;
      });

      // Update product count
      const countEl = document.getElementById('product-count');
      if (countEl) {
        countEl.textContent = visible === 1 ? '1 product' : `${visible} products`;
      }

      // Show no-results message
      const noResults = document.getElementById('no-results');
      if (noResults) {
        noResults.style.display = visible === 0 ? 'block' : 'none';
      }
    });
  });

  // Handle ?filter= query param on page load
  const params = new URLSearchParams(window.location.search);
  const filterParam = params.get('filter');
  if (filterParam) {
    const matchBtn = document.querySelector(`.tab-btn[data-filter="${filterParam}"]`);
    if (matchBtn) matchBtn.click();
  }
}

// ============================================================
// FAQ ACCORDION
// ============================================================
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item   = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-a');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item.open').forEach(openItem => {
      const a = openItem.querySelector('.faq-a');
      openItem.classList.remove('open');
      openItem.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      a.style.maxHeight = '0';
    });

    // Open clicked (if it was closed)
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// ============================================================
// COUNTDOWN TIMER (Drop Banner)
// ============================================================
// ─────────────────────────────────────────────────────────────
// SET YOUR REAL DROP DATE HERE (ISO 8601, local time).
// This used to be "now + 7 days", which meant the timer reset on
// every page load — a countdown that never actually ends reads as
// a trick once a returning visitor notices, and trust is the whole
// asset for this brand. A fixed date is honest and still urgent.
// When the date passes, the banner swaps to a "live now" state
// instead of sitting at 00:00:00:00.
// ─────────────────────────────────────────────────────────────
const DROP_DATE = '2026-09-12T10:00:00';

function initCountdown() {
  const days  = document.getElementById('cd-days');
  const hours = document.getElementById('cd-hours');
  const mins  = document.getElementById('cd-mins');
  const secs  = document.getElementById('cd-secs');

  if (!days || !hours || !mins || !secs) return;

  const dropDate = new Date(DROP_DATE);
  if (isNaN(dropDate)) return;

  const banner = days.closest('.drop-banner');

  const pad = n => String(n).padStart(2, '0');
  let prevSecs = '';

  function tick() {
    const diff = dropDate - Date.now();
    if (diff <= 0) {
      // The drop has landed — show it, don't show a dead clock.
      if (banner) {
        const countdown = banner.querySelector('.countdown');
        const lede      = banner.querySelector('p:not(.eyebrow)');
        const cta       = banner.querySelector('.btn');
        if (countdown) countdown.style.display = 'none';
        if (lede) lede.textContent = 'The capsule is live. Faith-rooted designs for the bold believer.';
        if (cta) { cta.textContent = 'Shop the Drop'; cta.setAttribute('href', 'shop.html'); }
      }
      days.textContent = hours.textContent = mins.textContent = secs.textContent = '00';
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    days.textContent  = pad(d);
    hours.textContent = pad(h);
    mins.textContent  = pad(m);
    secs.textContent  = pad(s);

    if (pad(s) !== prevSecs) {
      secs.classList.add('tick');
      setTimeout(() => secs.classList.remove('tick'), 150);
      prevSecs = pad(s);
    }
  }

  tick();
  setInterval(tick, 1000);
}

initCountdown();

// ============================================================
// SMOOTH SCROLL (internal links)
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const id     = anchor.getAttribute('href');
    const target = id === '#' ? null : document.querySelector(id);
    if (target) {
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      const top    = target.getBoundingClientRect().top + window.scrollY - offset - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ============================================================
// EMAIL FORM — Netlify Forms (AJAX submit + inline success)
// Submits to the Netlify form named "newsletter" and shows
// feedback without leaving the page. Falls back to a native
// POST (handled by Netlify) if JavaScript is disabled.
// ============================================================
document.querySelectorAll('.email-form, .footer-form').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      btn.textContent = '✓ Subscribed!';
      btn.style.background = '#27ae60';
      form.reset();
    } catch (err) {
      console.error('Newsletter signup failed:', err);
      btn.textContent = 'Try again';
      btn.style.background = '#c0392b';
      btn.disabled = false;
    }

    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
      btn.style.background = '';
    }, 4000);
  });
});

// ============================================================
// PRAYER REQUEST FORM — Netlify Forms (AJAX + inline status)
// Same pattern as the newsletter: posts to the Netlify form
// named "prayer-request", with a honeypot and a no-JS fallback
// to a native POST. Nothing is ever shown publicly.
// ============================================================
document.querySelectorAll('.prayer-form').forEach(form => {
  const status = form.querySelector('.form-status');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Sending…';
    if (status) status.classList.remove('is-visible', 'is-success', 'is-error');

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      form.reset();
      if (status) {
        status.textContent =
          'Received. Our team is praying over this today — you are not carrying it alone.';
        status.classList.add('is-visible', 'is-success');
      }
      btn.textContent = '✓ Sent';
    } catch (err) {
      console.error('Prayer request failed:', err);
      if (status) {
        status.textContent =
          "That didn't send. Please try again, or email hello@christos.fashion and we'll pray with you.";
        status.classList.add('is-visible', 'is-error');
      }
      btn.textContent = 'Try again';
    }

    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 4000);
  });
});

// ============================================================
// FOOTER YEAR
// ============================================================
const yearEls = document.querySelectorAll('#year');
yearEls.forEach(el => { el.textContent = new Date().getFullYear(); });

// ============================================================
// PRODUCT CARD — Click to Product
// ============================================================
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('click', e => {
    // Only if not clicking a link/button directly
    if (!e.target.closest('a, button')) {
      const link = card.querySelector('a.btn');
      if (link) link.click();
    }
  });
});

// ============================================================
// NAV — Active page highlighting (auto-detect)
// ============================================================
(function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .nav-drawer-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    const match = href.split('/').pop().split('?')[0];
    if (match === path || (path === '' && match === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
})();
