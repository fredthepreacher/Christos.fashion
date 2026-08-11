const { fetchCatalog, optionValueMap, stripHtml } = require('../lib/catalog');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') return { statusCode:405, body:'Method not allowed' };
  try {
    const products = await fetchCatalog(process.env);
    const items = [];
    for (const p of products) {
      if (!p.image) continue; // Google requires a usable primary image for Shopping/free listings.
      const values = optionValueMap(p);
      for (const v of p.variants) {
        if (v.inStock === false) continue;
        let color = '', size = '';
        for (const id of v.options || []) {
          const opt = values.get(id);
          if (!opt) continue;
          const n = String(opt.type || opt.group || '').toLowerCase();
          if (!color && (n.includes('color') || n.includes('colour'))) color = opt.title;
          if (!size && n.includes('size')) size = opt.title;
        }
        if (!size && p.category === 'hats') size = 'OSFM';
        const gender = /women|woman|female|ladies/i.test(p.cleanTitle) ? 'female' : /\bmen|male\b/i.test(p.cleanTitle) ? 'male' : 'unisex';
        const link = `https://christos.fashion${p.productUrl}?variant=${encodeURIComponent(v.id)}`;
        const id = `${p.id}-${v.id}`;
        const titleBits = [p.cleanTitle, color, size].filter(Boolean);
        const extraImages = (p.images || []).filter(Boolean).slice(1,5);
        const campaignLabel = p.collections.includes('therapy') ? 'therapy' : p.collections.includes('faith-over-fear') ? 'faith-over-fear' : p.collections.includes('jesus-saves') ? 'jesus-saves' : 'evergreen';
        const productType = p.category === 'hats' ? 'Christian Apparel > Christian Hats' : p.category === 'hoodies' ? 'Christian Apparel > Christian Hoodies' : 'Christian Apparel > Christian Shirts';
        items.push(`\n<item>
<g:id>${xml(id)}</g:id>
<title>${xml(titleBits.join(' - '))}</title>
<description>${xml(p.seoDescription || stripHtml(p.description))}</description>
<link>${xml(link)}</link>
<g:image_link>${xml(p.image || '')}</g:image_link>
${extraImages.map(img=>`<g:additional_image_link>${xml(img)}</g:additional_image_link>`).join('\n')}
<g:availability>in_stock</g:availability>
<g:price>${(v.price/100).toFixed(2)} USD</g:price>
<g:condition>new</g:condition>
<g:brand>Christos.Fashion</g:brand>
<g:mpn>${xml(v.sku || id)}</g:mpn>
<g:item_group_id>${xml(p.id)}</g:item_group_id>
${color?`<g:color>${xml(color)}</g:color>`:''}
${size?`<g:size>${xml(size)}</g:size>`:''}
<g:gender>${gender}</g:gender>
<g:age_group>adult</g:age_group>
<g:product_type>${xml(productType)}</g:product_type>
<g:custom_label_0>${xml(campaignLabel)}</g:custom_label_0>
<g:custom_label_1>${xml(p.category)}</g:custom_label_1>
<g:shipping_label>${p.category==='hats'?'hats':'apparel'}</g:shipping_label>
</item>`);
      }
    }
    const body=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Christos.Fashion Product Feed</title><link>https://christos.fashion/</link><description>Christian apparel and faith-based clothing from Christos.Fashion</description>${items.join('')}\n</channel></rss>`;
    return { statusCode:200, headers:{'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public, max-age=300, s-maxage=900'}, body };
  } catch(err) {
    console.error('merchant-feed error:', err.message);
    return { statusCode:503, headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}, body:'Product feed temporarily unavailable' };
  }
};
function xml(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
