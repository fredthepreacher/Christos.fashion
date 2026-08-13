const { fetchCatalog } = require('../lib/catalog');
const STATIC_URLS = [
  ['https://christos.fashion/','1.0'],
  ['https://christos.fashion/shop.html','0.9'],
  ['https://christos.fashion/about.html','0.6'],
  ['https://christos.fashion/faq.html','0.6'],
  ['https://christos.fashion/contact.html','0.5'],
  ['https://christos.fashion/shipping.html','0.5'],
  ['https://christos.fashion/returns.html','0.5'],
  ['https://christos.fashion/privacy.html','0.3'],
  ['https://christos.fashion/terms.html','0.3'],
];

// Collections are only advertised to search engines when they actually
// contain products. /collections/faith-over-fear was being listed here and
// crawled while the catalog had nothing tagged faith-over-fear, so Google
// was pointed at an empty page — thin content, and a promise of apparel
// that cannot be bought. This makes the sitemap self-healing: tag a product
// in Printify and its collection reappears on the next cache cycle.
const COLLECTION_MATCHERS = [
  ['all',              () => true],
  ['christian-shirts', p => p.category === 'shirts'],
  ['christian-hats',   p => p.category === 'hats'],
  ['therapy',          p => p.collections.includes('therapy')],
  ['faith-over-fear',  p => p.collections.includes('faith-over-fear')],
  ['jesus-saves',      p => p.collections.includes('jesus-saves')],
];

exports.handler = async () => {
  try {
    const products=await fetchCatalog(process.env);
    const liveCollections = COLLECTION_MATCHERS
      .filter(([, match]) => products.some(match))
      .map(([slug]) => [`https://christos.fashion/collections/${slug}`,'0.9']);
    const urls=STATIC_URLS
      .concat(liveCollections)
      .concat(products.map(p=>[`https://christos.fashion${p.productUrl}`,'0.8']));
    const now=new Date().toISOString().slice(0,10);
    const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([loc,priority])=>`  <url><loc>${xml(loc)}</loc><lastmod>${now}</lastmod><changefreq>${priority==='1.0'?'weekly':'monthly'}</changefreq><priority>${priority}</priority></url>`).join('\n')}\n</urlset>`;
    return {statusCode:200,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600, s-maxage=21600'},body};
  } catch(err) {
    console.error('sitemap error:',err.message);
    const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${STATIC_URLS.map(([loc,p])=>`<url><loc>${xml(loc)}</loc><priority>${p}</priority></url>`).join('\n')}\n</urlset>`;
    return {statusCode:200,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'},body};
  }
};
function xml(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
