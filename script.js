// ============================================================
// CHRISTOS.FASHION — Shared Scripts v4
// Clean · Modern · Faith-Centered
// ============================================================

// ============================================================
// SCROLL REVEAL
// ============================================================
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

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

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
const tabBtns = document.querySelectorAll('.tab-btn');
if (tabBtns.length > 0) {
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
function initCountdown() {
  const days  = document.getElementById('cd-days');
  const hours = document.getElementById('cd-hours');
  const mins  = document.getElementById('cd-mins');
  const secs  = document.getElementById('cd-secs');

  if (!days || !hours || !mins || !secs) return;

  // Set your real drop date here: new Date('2025-MM-DDTHH:MM:SS')
  const dropDate = new Date();
  dropDate.setDate(dropDate.getDate() + 7);
  dropDate.setHours(dropDate.getHours() + 14);
  dropDate.setMinutes(dropDate.getMinutes() + 33);

  const pad = n => String(n).padStart(2, '0');
  let prevSecs = '';

  function tick() {
    const diff = dropDate - Date.now();
    if (diff <= 0) {
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
// EMAIL FORM — Basic UI Feedback
// ============================================================
document.querySelectorAll('.email-form, .footer-form').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = '✓ Subscribed!';
    btn.disabled = true;
    btn.style.background = '#27ae60';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
      btn.style.background = '';
      form.reset();
    }, 3000);
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
