const { fetchCatalog } = require('../lib/catalog');

const COLLECTIONS = {
  therapy: {
    name: 'The Therapy Collection',
    eyebrow: 'Five Declarations. One Source of Hope.',
    title: 'Faith for the Battles<br><span class="title-italic">No One Else Can See.</span>',
    description: 'Explore Scripture Is My Therapy, Jesus Is My Therapy, God Is My Therapy, Prayer Is My Therapy, and Christ Is My Therapy — Christian statement hats and apparel created as daily reminders of faith, prayer, truth, and hope.',
    match: p => p.collections.includes('therapy'),
    seoTitle: 'The Therapy Collection | Christian Hats & Faith Apparel | Christos.Fashion',
    seoDescription: 'Shop the Christos.Fashion Therapy Collection: Scripture Is My Therapy, Jesus Is My Therapy, God Is My Therapy, Prayer Is My Therapy, and Christ Is My Therapy Christian hats and apparel.'
  },
  'christian-shirts': {
    name: 'Christian Shirts', eyebrow: 'Wear the Message',
    title: 'Christian Shirts<br><span class="title-italic">Built for Everyday Faith.</span>',
    description: 'Shop premium Christian graphic tees with faith-centered designs made to encourage believers, spark conversations, and point people back to Jesus Christ.',
    match: p => p.category === 'shirts',
    seoTitle: 'Christian Shirts & Graphic Tees | Christos.Fashion',
    seoDescription: 'Shop Christian shirts and faith-based graphic tees from Christos.Fashion, including Faith Over Fear, Built by Faith, Pray Work Repeat, and more.'
  },
  'christian-hats': {
    name: 'Christian Hats', eyebrow: 'Faith Above the Fold',
    title: 'Christian Hats<br><span class="title-italic">That Start Conversations.</span>',
    description: 'Shop Christian hats and statement caps from Christos.Fashion, including Jesus Saves and the Therapy Collection — faith-forward designs made for everyday wear.',
    match: p => p.category === 'hats',
    seoTitle: 'Christian Hats & Jesus Hats | Christos.Fashion',
    seoDescription: 'Shop Christian hats from Christos.Fashion, including the Jesus Saves trucker hat and Therapy Collection statement hats.'
  },
  'faith-over-fear': {
    name: 'Faith Over Fear', eyebrow: 'Choose What Gets the Final Word',
    title: 'Faith Over Fear<br><span class="title-italic">Every Day.</span>',
    description: 'A focused collection for one of the most enduring Christian apparel messages: Faith Over Fear. Wear the reminder when anxiety gets loud.',
    match: p => p.collections.includes('faith-over-fear'),
    seoTitle: 'Faith Over Fear Christian Shirt & Apparel | Christos.Fashion',
    seoDescription: 'Shop Faith Over Fear Christian apparel from Christos.Fashion — bold faith-based clothing designed as a daily reminder to trust God over fear.'
  },
  'jesus-saves': {
    name: 'Jesus Saves', eyebrow: 'The Gospel in Two Words',
    title: 'Jesus Saves.<br><span class="title-italic">Wear the Message.</span>',
    description: 'Simple, direct, unmistakable. Shop Jesus Saves Christian apparel built to carry the central message of the Gospel into everyday conversations.',
    match: p => p.collections.includes('jesus-saves'),
    seoTitle: 'Jesus Saves Hat & Christian Apparel | Christos.Fashion',
    seoDescription: 'Shop the Jesus Saves hat and Christian apparel from Christos.Fashion — bold Gospel-centered designs built for everyday conversations.'
  },
  all: {
    name: 'All Christian Apparel', eyebrow: 'The Full Collection',
    title: 'Christian Apparel<br><span class="title-italic">For Everyday Believers.</span>',
    description: 'Explore the full Christos.Fashion collection of Christian shirts, hats, and faith-centered statement apparel.',
    match: () => true,
    seoTitle: 'Christian Apparel — Shirts, Hats & Faith Clothing | Christos.Fashion',
    seoDescription: 'Shop the full Christos.Fashion collection of Christian apparel, graphic tees, statement hats, and Gospel-centered designs.'
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') return { statusCode:405, body:'Method not allowed' };
  const slug = decodeURIComponent((event.queryStringParameters && event.queryStringParameters.slug) || '').replace(/^\/+|\/+$/g,'') || 'all';
  const cfg = COLLECTIONS[slug];
  if (!cfg) return response(404, notFound(), 'noindex, nofollow');
  try {
    const products = (await fetchCatalog(process.env)).filter(cfg.match);
    return response(200, render(cfg, slug, products), 'index, follow, max-image-preview:large');
  } catch (err) {
    console.error('collection-page error:', err.message);
    return response(503, errorPage(), 'noindex, nofollow');
  }
};

function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function jsonSafe(v){return JSON.stringify(v).replace(/</g,'\\u003c');}
function money(c){return '$'+(Number(c||0)/100).toFixed(2);}

function render(cfg, slug, products) {
  const canonical=`https://christos.fashion/collections/${slug}`;
  const cards=products.length?products.map((p,i)=>{
    const prices=p.variants.map(v=>v.price), lo=Math.min(...prices);
    return `<article class="product-card reveal visible" itemscope itemtype="https://schema.org/Product"><a href="${p.productUrl}" class="product-card-link" aria-label="View ${esc(p.cleanTitle)}"><div class="product-img-wrap">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.cleanTitle)} — Christos.Fashion" loading="${i<2?'eager':'lazy'}" decoding="async" width="600" height="600" itemprop="image">`:''}<div class="product-quick-add" aria-hidden="true">View Product</div></div><div class="product-info"><h2 class="product-name" itemprop="name">${esc(p.cleanTitle)}</h2><p class="product-variant">${p.category==='hats'?'Christian hat':p.category==='hoodies'?'Christian hoodie':'Christian graphic tee'}</p><div class="product-price-row"><strong class="product-price">${p.variants.length>1?'From ':''}${money(lo)}</strong><span class="btn btn-ghost btn-sm">View →</span></div></div></a></article>`;
  }).join(''):`<div class="collection-empty"><p class="eyebrow">Coming Into Focus</p><h2>This collection is syncing from Printify.</h2><p>If the products were just created, check again in a few minutes.</p><a href="/shop.html" class="btn btn-primary">Browse All Products</a></div>`;
  const schema={'@context':'https://schema.org','@type':'CollectionPage',name:cfg.name,description:cfg.seoDescription,url:canonical,mainEntity:{'@type':'ItemList',numberOfItems:products.length,itemListElement:products.map((p,i)=>({'@type':'ListItem',position:i+1,url:`https://christos.fashion${p.productUrl}`,name:p.cleanTitle}))}};
  const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:'https://christos.fashion/'},{'@type':'ListItem',position:2,name:'Shop',item:'https://christos.fashion/shop.html'},{'@type':'ListItem',position:3,name:cfg.name,item:canonical}]};
  const heroArt = slug==='therapy' ? `<div class="therapy-art-strip" aria-label="Therapy Collection designs"><img src="/assets/designs/scripture-is-my-therapy.png" alt="Scripture Is My Therapy design"><img src="/assets/designs/jesus-is-my-therapy.png" alt="Jesus Is My Therapy design"><img src="/assets/designs/god-is-my-therapy.png" alt="God Is My Therapy design"><img src="/assets/designs/prayer-is-my-therapy.png" alt="Prayer Is My Therapy design"><img src="/assets/designs/christ-is-my-therapy.png" alt="Christ Is My Therapy design"></div>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(cfg.seoTitle)}</title><meta name="description" content="${esc(cfg.seoDescription)}"><link rel="canonical" href="${canonical}"><meta name="robots" content="index, follow, max-image-preview:large"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${esc(cfg.seoTitle)}"><meta property="og:description" content="${esc(cfg.seoDescription)}"><meta property="og:image" content="https://christos.fashion/assets/og-image.jpg"><meta name="twitter:card" content="summary_large_image"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${jsonSafe(schema)}</script><script type="application/ld+json">${jsonSafe(breadcrumb)}</script><script src="/js/analytics.js" defer></script></head><body><header class="nav" id="nav" role="banner"><div class="nav-inner"><nav class="nav-links"><a href="/" class="nav-link">Home</a><a href="/shop.html" class="nav-link active">Shop</a><a href="/about.html" class="nav-link">About</a></nav><a href="/"><img src="/assets/christos-logo-gold.png" alt="Christos.Fashion" class="nav-logo"></a><div class="nav-right"><nav class="nav-links"><a href="/faq.html" class="nav-link">FAQ</a><a href="/contact.html" class="nav-link">Contact</a></nav><button class="nav-cart-btn" data-cart-toggle aria-label="Open cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.99-1.74L23 6H6"/></svg><span data-cart-count class="cart-badge" style="display:none">0</span></button></div></div></header><main id="main-content"><div class="page-header collection-page-header"><nav class="breadcrumb"><a href="/">Home</a><span class="breadcrumb-sep">/</span><a href="/shop.html">Shop</a><span class="breadcrumb-sep">/</span><span>${esc(cfg.name)}</span></nav><p class="eyebrow">${esc(cfg.eyebrow)}</p><h1>${cfg.title}</h1><p>${esc(cfg.description)}</p></div>${heroArt}<section class="section"><div class="container"><div class="shop-header-row"><div><p class="eyebrow">Shop the Collection</p><h2>${products.length} ${products.length===1?'Design':'Designs'}</h2></div><a class="btn btn-outline" href="/shop.html">All Products</a></div><div class="product-grid collection-product-grid">${cards}</div></div></section><section class="scripture-band scripture-band-burgundy"><div class="container"><blockquote>“For I am not ashamed of the gospel.”</blockquote><cite>Romans 1:16</cite></div></section></main><footer class="footer"><div class="container"><div class="footer-grid"><div class="footer-brand"><img src="/assets/christos-logo-gold.png" alt="Christos.Fashion"><p>Modern Christian apparel for believers who wear their faith boldly.</p></div><div class="footer-col"><h2 class="footer-heading">Collections</h2><ul><li><a href="/collections/therapy">Therapy Collection</a></li><li><a href="/collections/faith-over-fear">Faith Over Fear</a></li><li><a href="/collections/jesus-saves">Jesus Saves</a></li></ul></div><div class="footer-col"><h2 class="footer-heading">Help</h2><ul><li><a href="/shipping.html">Shipping</a></li><li><a href="/returns.html">Returns & Replacements</a></li><li><a href="/contact.html">Contact</a></li></ul></div></div></div></footer><script type="module">import { CartUI } from '/js/cart.js'; CartUI.init();</script><script src="/script.js"></script></body></html>`;
}
function notFound(){return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collection Not Found — Christos.Fashion</title><link rel="stylesheet" href="/styles.css"></head><body><main class="success-page"><div class="success-card"><h1>Collection not found.</h1><a class="btn btn-primary" href="/shop.html">Shop All Products</a></div></main></body></html>';}
function errorPage(){return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collection Temporarily Unavailable — Christos.Fashion</title><link rel="stylesheet" href="/styles.css"></head><body><main class="success-page"><div class="success-card"><h1>We couldn’t load the collection.</h1><p>Please try again shortly.</p><a class="btn btn-primary" href="/shop.html">Shop All Products</a></div></main></body></html>';}
function response(statusCode,body,robots){return{statusCode,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':statusCode===200?'public, max-age=60, s-maxage=300, stale-while-revalidate=600':'no-store','X-Robots-Tag':robots,'X-Content-Type-Options':'nosniff'},body};}
