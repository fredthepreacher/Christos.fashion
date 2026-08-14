const { fetchCatalog } = require('../lib/catalog');

const COLLECTIONS = {
  therapy: {
    name: 'The Therapy Collection',
    eyebrow: 'One Source of Hope.',
    title: 'Faith for the Battles<br><span class="title-italic">No One Else Can See.</span>',
    description: 'Christian statement hats and apparel built on one idea: faith is where believers take what weighs on them. Every design below is pulled from the live catalog, so you only ever see what is actually available to order.',
    match: p => p.collections.includes('therapy'),
    seoTitle: 'The Therapy Collection | Christian Hats & Faith Apparel | Christos.Fashion',
    seoDescription: 'Shop the Christos.Fashion Therapy Collection — Scripture Is My Therapy and Prayer Is My Therapy Christian statement hats, with further designs added as they are released.'
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
  // Same fix as product-page.js: the /collections/* rewrite does not reliably
  // populate queryStringParameters.slug, so every collection silently fell back
  // to 'all' and rendered the identical generic page at five different URLs —
  // duplicate content that Google would have penalised. Fall back to the path.
  const qSlug = (event.queryStringParameters && event.queryStringParameters.slug) || '';
  const path  = event.path || (event.rawUrl ? new URL(event.rawUrl).pathname : '');
  const pMatch = path.match(/\/collections\/([^?]+?)\/?$/);
  const slug = decodeURIComponent(qSlug || (pMatch ? pMatch[1] : ''))
    .replace(/^\/+|\/+$/g, '') || 'all';
  const cfg = COLLECTIONS[slug];
  if (!cfg) return response(404, notFound(), 'noindex, nofollow');
  try {
    const products = (await fetchCatalog(process.env)).filter(cfg.match);
    // An empty collection is still served so any existing link keeps working,
    // but it must not be indexed: a page promising apparel with nothing to buy
    // is thin content, and Google penalises it. The moment a product is tagged
    // into the collection in Printify, this flips back to indexable on its own.
    const robots = products.length
      ? 'index, follow, max-image-preview:large'
      : 'noindex, follow';
    // robots is passed into render() as well as response(): the meta tag used
    // to be hardcoded to "index, follow", so an empty collection shipped an
    // X-Robots-Tag header saying noindex alongside a meta tag saying index.
    // Google resolves conflicts by taking the most restrictive rule, so it
    // worked by luck — but two directives disagreeing is not something to leave
    // in place. Both now come from the same variable.
    return response(200, render(cfg, slug, products, robots), robots);
  } catch (err) {
    console.error('collection-page error:', err.message);
    return response(503, errorPage(), 'noindex, nofollow');
  }
};

function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function jsonSafe(v){return JSON.stringify(v).replace(/</g,'\\u003c');}
function money(c){return '$'+(Number(c||0)/100).toFixed(2);}

// Per-collection Q&A. Names and counts are read from the live catalog so the
// answers stay true as the Printify shop changes; nothing is hardcoded that
// could go stale, and no ratings, review counts or stock levels are invented.
function buildCollectionFaq(cfg, slug, products) {
  const names = products.map(p => p.cleanTitle);
  const list = a => a.length > 1 ? a.slice(0,-1).join(', ') + ' and ' + a[a.length-1] : (a[0] || '');
  const prices = products.flatMap(p => p.variants.map(v => v.price)).filter(Number.isFinite);
  const lo = prices.length ? Math.min(...prices) : null;
  const money = c => '$' + (Number(c||0)/100).toFixed(2);
  const pairs = [];

  // cfg.name may already read as a full phrase ("The Therapy Collection"), so
  // only append the word "collection" when it isn't already there — otherwise
  // the questions come out as "the The Therapy Collection collection".
  const N = cfg.name;
  const subject = /collection/i.test(N) ? N : `${N} collection`;
  const bare = N.replace(/^The\s+/i, '');

  pairs.push([`What is ${/^The\s/i.test(N) ? N : 'the ' + subject}?`, cfg.seoDescription]);

  if (names.length) {
    pairs.push([`What products are in the ${bare}${/collection/i.test(N) ? '' : ' collection'}?`,
      `${N} currently includes ${names.length} design${names.length===1?'':'s'}: ${list(names)}. The listing is generated from the live catalog, so it always reflects what is actually available to order.`]);
  }

  if (lo !== null) {
    pairs.push([`How much does ${bare} apparel cost?`,
      `${N} pieces start at ${money(lo)}. Exact price depends on the size and colour chosen, and every price is verified server-side at checkout.`]);
  }

  if (slug === 'therapy') {
    pairs.push([`Is the Therapy Collection about mental health treatment?`,
      `No. The Therapy Collection is a set of Christian statement designs about faith, Scripture and prayer as sources of hope and encouragement. It is not medical or mental-health advice and is not a substitute for professional care.`]);
  }

  pairs.push([`What sizes are available in the ${bare}${/collection/i.test(N) ? '' : ' collection'}?`,
    `Shirt designs are offered from XS through 5XL depending on the garment, and hats are one size designed to fit most adults. Exact sizes for each design are listed on its product page.`]);

  pairs.push([`Does Christos.Fashion ship ${bare} orders for free?`,
    `Shipping within the United States is free on orders of $50 or more, and a flat $5.99 under that. Christos.Fashion currently ships to the United States only.`]);

  return pairs;
}

// The art strip used to hard-code all five Therapy designs. Three of them have
// no live Printify product, so the strip advertised artwork nobody could buy —
// and the matching /products/* slugs 404. Derive it from the live catalog
// instead: an art file is shown only when a purchasable product's slug starts
// with that design's slug (e.g. "scripture-is-my-therapy-cap").
const THERAPY_ART = [
  ['scripture-is-my-therapy', 'Scripture Is My Therapy design'],
  ['jesus-is-my-therapy',     'Jesus Is My Therapy design'],
  ['god-is-my-therapy',       'God Is My Therapy design'],
  ['prayer-is-my-therapy',    'Prayer Is My Therapy design'],
  ['christ-is-my-therapy',    'Christ Is My Therapy design'],
];

function therapyArtStrip(products) {
  const slugs = products.map(p => p.slug || '');
  const live = THERAPY_ART.filter(([art]) => slugs.some(s => s === art || s.startsWith(art + '-')));
  if (!live.length) return '';
  const imgs = live.map(([art, alt]) =>
    `<img src="/assets/designs/${art}.webp" alt="${esc(alt)}" loading="lazy" decoding="async">`).join('');
  return `<div class="therapy-art-strip" aria-label="Therapy Collection designs">${imgs}</div>`;
}

function render(cfg, slug, products, robots) {
  const robotsContent = robots || 'index, follow, max-image-preview:large';
  const canonical=`https://christos.fashion/collections/${slug}`;
  const cards=products.length?products.map((p,i)=>{
    const prices=p.variants.map(v=>v.price), lo=Math.min(...prices);
    return `<article class="product-card reveal visible" itemscope itemtype="https://schema.org/Product"><a href="${p.productUrl}" class="product-card-link" aria-label="View ${esc(p.cleanTitle)}"><div class="product-img-wrap">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.cleanTitle)} — Christos.Fashion" loading="${i<2?'eager':'lazy'}" decoding="async" width="600" height="600" itemprop="image">`:''}<div class="product-quick-add" aria-hidden="true">View Product</div></div><div class="product-info"><h2 class="product-name" itemprop="name">${esc(p.cleanTitle)}</h2><p class="product-variant">${p.category==='hats'?'Christian hat':p.category==='hoodies'?'Christian hoodie':'Christian graphic tee'}</p><div class="product-price-row"><strong class="product-price">${p.variants.length>1?'From ':''}${money(lo)}</strong><span class="btn btn-ghost btn-sm">View →</span></div></div></a></article>`;
  }).join(''):`<div class="collection-empty"><p class="eyebrow">Coming Into Focus</p><h2>This collection is syncing from Printify.</h2><p>If the products were just created, check again in a few minutes.</p><a href="/shop.html" class="btn btn-primary">Browse All Products</a></div>`;
  const schema={'@context':'https://schema.org','@type':'CollectionPage',name:cfg.name,description:cfg.seoDescription,url:canonical,mainEntity:{'@type':'ItemList',numberOfItems:products.length,itemListElement:products.map((p,i)=>({'@type':'ListItem',position:i+1,url:`https://christos.fashion${p.productUrl}`,name:p.cleanTitle}))}};
  const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:'https://christos.fashion/'},{'@type':'ListItem',position:2,name:'Shop',item:'https://christos.fashion/shop.html'},{'@type':'ListItem',position:3,name:cfg.name,item:canonical}]};

  // Collection Q&A. Visible markup and FAQPage schema are generated from one
  // array so they cannot drift. Product names and counts come from the live
  // catalog; shipping and returns answers mirror the published policies.
  const faqPairs = buildCollectionFaq(cfg, slug, products);
  const faqSchema = {
    '@context':'https://schema.org','@type':'FAQPage',
    '@id':`${canonical}#faq`, url:canonical, name:`${cfg.name} — Questions`, inLanguage:'en-US',
    isPartOf:{'@type':'WebSite',name:'Christos.Fashion',url:'https://christos.fashion'},
    speakable:{'@type':'SpeakableSpecification',cssSelector:['#collection-faq .faq-q','#collection-faq .faq-a']},
    mainEntity: faqPairs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))
  };
  const faqHtml = `<section class="section" id="collection-faq" aria-labelledby="collection-faq-heading"><div class="container" style="max-width:820px"><div class="section-header" style="text-align:center"><p class="eyebrow">Common Questions</p><h2 id="collection-faq-heading">${esc(cfg.name)} — Questions</h2></div><div class="faq-list" role="list">${
    faqPairs.map(([q,a])=>`<div class="faq-item" role="listitem"><button class="faq-q" aria-expanded="false"><span>${esc(q)}</span><svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button><div class="faq-a"><div class="faq-a-inner">${esc(a)}</div></div></div>`).join('')
  }</div></div></section>`;
  const heroArt = slug==='therapy' ? therapyArtStrip(products) : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(cfg.seoTitle)}</title><meta name="description" content="${esc(cfg.seoDescription)}"><link rel="canonical" href="${canonical}"><meta name="robots" content="${esc(robotsContent)}"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${esc(cfg.seoTitle)}"><meta property="og:description" content="${esc(cfg.seoDescription)}"><meta property="og:image" content="https://christos.fashion/assets/og-image.jpg"><meta name="twitter:card" content="summary_large_image"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${jsonSafe(schema)}</script><script type="application/ld+json">${jsonSafe(breadcrumb)}</script><script type="application/ld+json">${jsonSafe(faqSchema)}</script><script src="/js/analytics.js" defer></script></head><body><header class="nav" id="nav" role="banner"><div class="nav-inner"><nav class="nav-links"><a href="/" class="nav-link">Home</a><a href="/shop.html" class="nav-link active">Shop</a><a href="/about.html" class="nav-link">About</a></nav><a href="/"><img src="/assets/christos-logo-gold.png" alt="Christos.Fashion" class="nav-logo"></a><div class="nav-right"><nav class="nav-links"><a href="/faq.html" class="nav-link">FAQ</a><a href="/contact.html" class="nav-link">Contact</a></nav><button class="nav-cart-btn" data-cart-toggle aria-label="Open cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.99-1.74L23 6H6"/></svg><span data-cart-count class="cart-badge" style="display:none">0</span></button></div></div></header><main id="main-content"><div class="page-header collection-page-header"><nav class="breadcrumb"><a href="/">Home</a><span class="breadcrumb-sep">/</span><a href="/shop.html">Shop</a><span class="breadcrumb-sep">/</span><span>${esc(cfg.name)}</span></nav><p class="eyebrow">${esc(cfg.eyebrow)}</p><h1>${cfg.title}</h1><p>${esc(cfg.description)}</p></div>${heroArt}<section class="section"><div class="container"><div class="shop-header-row"><div><p class="eyebrow">Shop the Collection</p><h2>${products.length} ${products.length===1?'Design':'Designs'}</h2></div><a class="btn btn-outline" href="/shop.html">All Products</a></div><div class="product-grid collection-product-grid">${cards}</div></div></section>${faqHtml}<section class="scripture-band scripture-band-burgundy"><div class="container"><blockquote>“For I am not ashamed of the gospel.”</blockquote><cite>Romans 1:16</cite></div></section></main><footer class="footer"><div class="container"><div class="footer-grid"><div class="footer-brand"><img src="/assets/christos-logo-gold.png" alt="Christos.Fashion"><p>Modern Christian apparel for believers who wear their faith boldly.</p></div><div class="footer-col"><h2 class="footer-heading">Collections</h2><ul><li><a href="/collections/therapy">Therapy Collection</a></li><li><a href="/collections/faith-over-fear">Faith Over Fear</a></li><li><a href="/collections/jesus-saves">Jesus Saves</a></li></ul></div><div class="footer-col"><h2 class="footer-heading">Help</h2><ul><li><a href="/shipping.html">Shipping</a></li><li><a href="/returns.html">Returns & Replacements</a></li><li><a href="/contact.html">Contact</a></li></ul></div></div></div></footer><script type="module">import { CartUI } from '/js/cart.js'; CartUI.init();</script><script src="/script.js"></script></body></html>`;
}
function notFound(){return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collection Not Found — Christos.Fashion</title><link rel="stylesheet" href="/styles.css"></head><body><main class="success-page"><div class="success-card"><h1>Collection not found.</h1><a class="btn btn-primary" href="/shop.html">Shop All Products</a></div></main></body></html>';}
function errorPage(){return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collection Temporarily Unavailable — Christos.Fashion</title><link rel="stylesheet" href="/styles.css"></head><body><main class="success-page"><div class="success-card"><h1>We couldn’t load the collection.</h1><p>Please try again shortly.</p><a class="btn btn-primary" href="/shop.html">Shop All Products</a></div></main></body></html>';}
function response(statusCode,body,robots){return{statusCode,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':statusCode===200?'public, max-age=60, s-maxage=300, stale-while-revalidate=600':'no-store','X-Robots-Tag':robots,'X-Content-Type-Options':'nosniff'},body};}
