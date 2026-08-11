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
  ['https://christos.fashion/collections/all','0.9'],
  ['https://christos.fashion/collections/christian-shirts','0.9'],
  ['https://christos.fashion/collections/christian-hats','0.9'],
  ['https://christos.fashion/collections/therapy','0.9'],
  ['https://christos.fashion/collections/faith-over-fear','0.9'],
  ['https://christos.fashion/collections/jesus-saves','0.9'],
];
exports.handler = async () => {
  try {
    const products=await fetchCatalog(process.env);
    const urls=STATIC_URLS.concat(products.map(p=>[`https://christos.fashion${p.productUrl}`,'0.8']));
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
