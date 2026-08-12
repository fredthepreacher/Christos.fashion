const { fetchCatalog, findProduct, stripHtml } = require('../lib/catalog');

// Resolve the slug from the query string OR the request path.
//
// The netlify.toml rewrite (/products/* -> product-page?slug=:splat) does not
// reliably populate queryStringParameters.slug in production — verified live:
// /.netlify/functions/product-page?slug=X returned 200 while /products/X
// returned 404, which meant every product URL in the sitemap and the Merchant
// Center feed was dead. Reading the path as a fallback makes the function
// correct regardless of how the rewrite behaves.
function resolveSlug(event, prefix) {
  const q = event.queryStringParameters && event.queryStringParameters.slug;
  if (q) return decodeURIComponent(q);
  const path = event.path || (event.rawUrl ? new URL(event.rawUrl).pathname : '');
  const m = path.match(new RegExp('/' + prefix + '/([^?]+?)/?$'));
  return m ? decodeURIComponent(m[1]) : '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return { statusCode: 405, headers: { Allow: 'GET, HEAD' }, body: 'Method not allowed' };
  }

  const slug = resolveSlug(event, 'products');
  try {
    const products = await fetchCatalog(process.env);
    const product = findProduct(products, slug);
    if (!product) return htmlResponse(404, notFoundPage(), 'noindex, nofollow');
    const variantId = Number((event.queryStringParameters && event.queryStringParameters.variant) || 0);
    return htmlResponse(200, renderProductPage(product, variantId), 'index, follow, max-image-preview:large');
  } catch (err) {
    console.error('product-page error:', err.message);
    return htmlResponse(503, errorPage(), 'noindex, nofollow');
  }
};

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function money(cents) { return '$' + (Number(cents || 0) / 100).toFixed(2); }
function jsonSafe(value) { return JSON.stringify(value).replace(/</g, '\\u003c').replace(/-->/g, '--\\>'); }
function cleanDescription(text) {
  const plain = stripHtml(text);
  return plain || 'Premium Christian apparel designed to help believers wear their faith boldly and carry a meaningful message into everyday life.';
}
function productStory(title) {
  const t = String(title || '').toLowerCase();
  if (t.includes('faith over fear')) return 'A reminder for the moment anxiety gets loud: faith does not require the absence of fear — it chooses who gets the final word.';
  if (t.includes('jesus saves')) return 'Two words. The center of the Gospel. A simple message that can turn an ordinary moment into a conversation about hope.';
  if (t.includes('scripture is my therapy')) return 'A wearable reminder to return to God’s Word for truth, perspective, correction, comfort, and hope when life feels heavy.';
  if (t.includes('jesus is my therapy')) return 'A statement of dependence on Jesus — not as a replacement for appropriate care, but as the center of faith, hope, prayer, and identity.';
  if (t.includes('god is my therapy')) return 'A declaration about bringing the weight of life to God in prayer, trust, worship, and daily dependence.';
  if (t.includes('prayer is my therapy')) return 'A reminder to bring the conversation to God: the pressure, the gratitude, the questions, the fear, and the next step.';
  if (t.includes('christ is my therapy')) return 'A Christ-centered declaration of where faith, identity, hope, and spiritual strength are rooted.';
  if (t.includes('built by faith')) return 'A statement for people whose story was shaped by trust in God one step, setback, prayer, and breakthrough at a time.';
  if (t.includes('pray') && t.includes('work')) return 'Prayer before the pressure. Work with purpose. Repeat. A simple rhythm for believers who want faith and discipline in the same sentence.';
  if (t.includes('thought it was over')) return 'For the chapters that looked finished until God opened another door. Wear the testimony before you know who needs to read it.';
  return 'More than decoration, this design is built to carry a message — a visible reminder of faith that can travel wherever you do.';
}
function audienceGender(title) {
  const t = String(title || '').toLowerCase();
  return /women|woman|female|ladies/.test(t) ? 'female' : /men|male/.test(t) ? 'male' : 'unisex';
}
function optionValues(product, kind) {
  const group = (product.options || []).find(o => String(o.type || o.name || '').toLowerCase().includes(kind));
  return group ? group.values.map(v => v.title) : [];
}

function renderProductPage(p, selectedVariantId) {
  const prices = p.variants.map(v => v.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const selectedVariant = p.variants.find(v => Number(v.id) === Number(selectedVariantId)) || null;
  const inStock = p.variants.some(v => v.inStock !== false);
  const canonical = `https://christos.fashion${p.productUrl}`;
  const desc = p.seoDescription;
  const plainDescription = cleanDescription(p.description);
  const colors = optionValues(p, 'color');
  const sizes = optionValues(p, 'size');
  const gender = audienceGender(p.cleanTitle);
  const schema = {
    '@context':'https://schema.org',
    '@type':'Product',
    name:p.cleanTitle,
    description:desc,
    image:p.images && p.images.length ? p.images : (p.image ? [p.image] : []),
    url:canonical,
    sku:p.variants[0] && p.variants[0].sku ? p.variants[0].sku : p.id,
    brand:{ '@type':'Brand', name:'Christos.Fashion' },
    category:p.category === 'hats' ? 'Christian Hats' : p.category === 'hoodies' ? 'Christian Hoodies' : 'Christian T-Shirts',
    audience:{ '@type':'PeopleAudience', suggestedGender:gender, suggestedMinAge:13 },
    ...(colors.length ? { color: colors } : {}),
    ...(sizes.length ? { size: sizes } : {}),
    offers:selectedVariant ? {
      '@type':'Offer', priceCurrency:'USD', price:(selectedVariant.price/100).toFixed(2),
      availability:selectedVariant.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url:canonical + '?variant=' + selectedVariant.id,
      sku:selectedVariant.sku || String(selectedVariant.id),
      seller:{ '@type':'Organization', name:'Christos.Fashion' },
      hasMerchantReturnPolicy:{ '@type':'MerchantReturnPolicy', applicableCountry:'US', returnPolicyCategory:'https://schema.org/MerchantReturnNotPermitted', merchantReturnLink:'https://christos.fashion/returns.html' }
    } : {
      '@type':'AggregateOffer',
      priceCurrency:'USD',
      lowPrice:(lo/100).toFixed(2),
      highPrice:(hi/100).toFixed(2),
      offerCount:p.variants.length,
      availability:inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url:canonical,
      seller:{ '@type':'Organization', name:'Christos.Fashion' },
      hasMerchantReturnPolicy:{ '@type':'MerchantReturnPolicy', applicableCountry:'US', returnPolicyCategory:'https://schema.org/MerchantReturnNotPermitted', merchantReturnLink:'https://christos.fashion/returns.html' }
    }
  };
  const breadcrumbSchema = {
    '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:'https://christos.fashion/'},
      {'@type':'ListItem',position:2,name:'Shop',item:'https://christos.fashion/shop.html'},
      {'@type':'ListItem',position:3,name:p.cleanTitle,item:canonical}
    ]
  };
  const imageList = (p.images && p.images.length ? p.images : [p.image]).filter(Boolean);
  const gallery = imageList.slice(0,4).map((src,i) => `<button class="product-thumb${i===0?' active':''}" type="button" data-image="${esc(src)}" aria-label="View product image ${i+1}"><img src="${esc(src)}" alt="${esc(p.cleanTitle)} product view ${i+1}" loading="${i===0?'eager':'lazy'}" decoding="async"></button>`).join('');
  const optionSummary = selectedVariant ? `Selected: ${selectedVariant.title}` : [colors.length ? `${colors.length} color${colors.length===1?'':'s'}` : '', sizes.length ? `${sizes.length} size${sizes.length===1?'':'s'}` : ''].filter(Boolean).join(' · ');
  const therapyLink = p.collections.includes('therapy') ? '<a href="/collections/therapy" class="product-context-link">Explore The Therapy Collection →</a>' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.cleanTitle)} | Christian ${p.category === 'hats' ? 'Hat' : 'Apparel'} | Christos.Fashion</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="product"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${esc(p.cleanTitle)} — Christos.Fashion"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(p.image || 'https://christos.fashion/assets/og-image.jpg')}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.cleanTitle)} — Christos.Fashion"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(p.image || 'https://christos.fashion/assets/og-image.jpg')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${jsonSafe(schema)}</script><script type="application/ld+json">${jsonSafe(breadcrumbSchema)}</script>
<script src="/js/analytics.js" defer></script>
</head>
<body>
<header class="nav" id="nav" role="banner"><div class="nav-inner"><nav class="nav-links" aria-label="Primary navigation left"><a href="/" class="nav-link">Home</a><a href="/shop.html" class="nav-link active">Shop</a><a href="/about.html" class="nav-link">About</a></nav><a href="/" aria-label="Christos.Fashion — Home"><img src="/assets/christos-logo-gold.png" alt="Christos.Fashion" class="nav-logo"></a><div class="nav-right"><nav class="nav-links" aria-label="Primary navigation right"><a href="/faq.html" class="nav-link">FAQ</a><a href="/contact.html" class="nav-link">Contact</a></nav><button class="nav-cart-btn" data-cart-toggle aria-label="Open cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.99-1.74L23 6H6"/></svg><span data-cart-count class="cart-badge" style="display:none">0</span></button></div></div></header>
<main id="main-content">
<section class="product-detail-section"><div class="container"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span class="breadcrumb-sep">/</span><a href="/shop.html">Shop</a><span class="breadcrumb-sep">/</span><span aria-current="page">${esc(p.cleanTitle)}</span></nav>
<div class="product-detail-grid">
<div class="product-detail-media"><div class="product-main-image"><img id="product-main-image" src="${esc(p.image)}" alt="${esc(p.cleanTitle)} by Christos.Fashion" fetchpriority="high" decoding="async"></div>${imageList.length>1?`<div class="product-thumbs">${gallery}</div>`:''}</div>
<div class="product-detail-copy"><p class="eyebrow">${p.collections.includes('therapy') ? 'The Therapy Collection' : p.category === 'hats' ? 'Christian Hats' : 'Christian Apparel'}</p><h1>${esc(p.cleanTitle)}</h1><p class="product-detail-price">${selectedVariant?money(selectedVariant.price):(lo===hi?money(lo):`From ${money(lo)}`)}</p>${optionSummary?`<p class="product-detail-options">${esc(optionSummary)}</p>`:''}
<p class="product-detail-lede">${esc(productStory(p.cleanTitle))}</p>
<div class="product-description-copy"><p>${esc(plainDescription)}</p></div>
<button id="product-add" class="btn btn-primary product-detail-add" ${(selectedVariant ? selectedVariant.inStock !== false : inStock)?'':'disabled'}>${selectedVariant ? 'Add Selected Variant to Cart' : (inStock?'Choose Options & Add to Cart':'Currently Unavailable')} <span aria-hidden="true">→</span></button>${selectedVariant?'<button id="product-change-options" class="btn btn-outline product-detail-add" style="margin-top:10px">Change Options</button>':''}
<div class="product-trust-list"><span>✓ Secure Stripe checkout</span><span>✓ Free US shipping on orders $50+</span><span>✓ Made to order via Printify</span><span>✓ 30-day defect & misprint support</span></div>
<div class="product-policy-links"><a href="/shipping.html">Shipping details</a><a href="/returns.html">Replacement policy</a><a href="/faq.html">Sizing & FAQ</a></div>${therapyLink}
</div></div></div></section>
<section class="scripture-band scripture-band-burgundy" aria-label="Brand message"><div class="container"><blockquote>“Let your light shine before others.”</blockquote><cite>Matthew 5:16</cite></div></section>
<section class="section section-editorial surface-ivory"><div class="container"><div class="section-header" style="text-align:center"><p class="eyebrow">Wear the Message</p><h2>More Than Something<br><span class="title-italic">You Put On.</span></h2><p class="section-lede">Christos.Fashion creates modern Christian apparel for everyday moments — church, work, the gym, the coffee shop, and every conversation in between.</p><a href="/shop.html" class="btn btn-primary">Explore the Full Collection →</a></div></div></section>
</main>
<footer class="footer" role="contentinfo"><div class="container"><div class="footer-grid"><div class="footer-brand"><img src="/assets/christos-logo-gold.png" alt="Christos.Fashion"><p>Modern Christian apparel for believers who wear their faith boldly.</p></div><div class="footer-col"><h2 class="footer-heading">Shop</h2><ul><li><a href="/shop.html">All Products</a></li><li><a href="/collections/christian-shirts">Christian Shirts</a></li><li><a href="/collections/christian-hats">Christian Hats</a></li><li><a href="/collections/therapy">Therapy Collection</a></li></ul></div><div class="footer-col"><h2 class="footer-heading">Help</h2><ul><li><a href="/shipping.html">Shipping</a></li><li><a href="/returns.html">Returns & Replacements</a></li><li><a href="/faq.html">FAQ</a></li><li><a href="/contact.html">Contact</a></li></ul></div><div class="footer-col"><h2 class="footer-heading">Legal</h2><ul><li><a href="/privacy.html">Privacy</a></li><li><a href="/terms.html">Terms</a></li></ul></div></div></div></footer>
<script id="product-data" type="application/json">${jsonSafe(p)}</script>
<script type="module">
import { Cart, CartUI } from '/js/cart.js';
import { openVariantPicker } from '/js/variant-picker.js';
CartUI.init();
const product = JSON.parse(document.getElementById('product-data').textContent);
const btn = document.getElementById('product-add');
function addVariant(product, variant) {
  Cart.add({ productId:product.id, variantId:variant.id, title:product.cleanTitle || product.title.split(' | ')[0].trim(), variantTitle:variant.title, price:variant.price, image:product.image, quantity:1 });
  window.cfTrack?.('add_to_cart', {currency:'USD', value:variant.price/100, items:[{item_id:product.id,item_name:product.cleanTitle || product.title, item_variant:variant.title, price:variant.price/100, quantity:1}]});
}
const selectedVariantId = ${selectedVariant ? selectedVariant.id : 0};
const selectedVariant = product.variants.find(v => Number(v.id) === Number(selectedVariantId));
btn?.addEventListener('click', () => { if (selectedVariant) addVariant(product, selectedVariant); else if (product.variants.length === 1) addVariant(product, product.variants[0]); else openVariantPicker(product, addVariant); });
document.getElementById('product-change-options')?.addEventListener('click', () => openVariantPicker(product, addVariant));
document.querySelectorAll('.product-thumb').forEach(t => t.addEventListener('click', () => { document.getElementById('product-main-image').src=t.dataset.image; document.querySelectorAll('.product-thumb').forEach(x=>x.classList.remove('active')); t.classList.add('active'); }));
window.addEventListener('cf-analytics-ready', () => window.cfTrack?.('view_item', {currency:'USD', value:${(lo/100).toFixed(2)}, items:[{item_id:product.id,item_name:product.cleanTitle || product.title,item_category:product.category,price:${(lo/100).toFixed(2)},quantity:1}]}), {once:true});
</script>
<script src="/script.js"></script>
</body></html>`;
}

function notFoundPage() { return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product Not Found — Christos.Fashion</title><link rel="stylesheet" href="/styles.css"></head><body><main class="success-page"><div class="success-card"><p class="eyebrow">Product Not Found</p><h1>This design may have moved.</h1><p>Browse the current Christos.Fashion collection to find the latest Christian shirts and hats.</p><a class="btn btn-primary" href="/shop.html">Shop the Collection</a></div></main></body></html>`; }
function errorPage() { return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Temporarily Unavailable — Christos.Fashion</title><link rel="stylesheet" href="/styles.css"></head><body><main class="success-page"><div class="success-card"><p class="eyebrow">One Moment</p><h1>We couldn’t load this product.</h1><p>Please try again shortly or browse the collection.</p><a class="btn btn-primary" href="/shop.html">Shop the Collection</a></div></main></body></html>`; }
function htmlResponse(statusCode, body, robots) { return { statusCode, headers:{ 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':statusCode===200?'public, max-age=60, s-maxage=300, stale-while-revalidate=600':'no-store', 'X-Robots-Tag':robots, 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin' }, body }; }
