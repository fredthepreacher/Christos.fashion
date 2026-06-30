const PRINTIFY_BASE = 'https://api.printify.com/v1';

let cache = { data: null, at: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(204, '');
  if (event.httpMethod !== 'GET') return cors(405, JSON.stringify({ error: 'Method not allowed' }));

  const { PRINTIFY_API_KEY, PRINTIFY_SHOP_ID } = process.env;

  if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
    const missing = [
      !PRINTIFY_API_KEY && 'PRINTIFY_API_KEY',
      !PRINTIFY_SHOP_ID && 'PRINTIFY_SHOP_ID'
    ].filter(Boolean).join(', ');
    console.error('Missing env vars:', missing);
    return cors(500, JSON.stringify({ error: 'Server misconfiguration', missing }));
  }

  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    return cors(200, JSON.stringify(cache.data));
  }

  try {
    console.log('Fetching products for shop:', PRINTIFY_SHOP_ID);

    const response = await fetch(
      `${PRINTIFY_BASE}/shops/${PRINTIFY_SHOP_ID}/products.json?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${PRINTIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Printify error:', response.status, text);
      return cors(502, JSON.stringify({ error: 'Printify API error', status: response.status, detail: text }));
    }

    const json = await response.json();
    const products = Array.isArray(json) ? json : (json.data || []);
    console.log('Products fetched:', products.length);

    const slim = products.map(function(p) {
      return {
        id:          p.id,
        title:       p.title,
        description: p.description,
        image:       p.images && p.images[0] ? p.images[0].src : null,
        images:      (p.images || []).slice(0, 4).map(function(i) { return i.src; }),
        variants:    (p.variants || []).filter(function(v) { return v.is_enabled; }).map(function(v) {
          return {
            id:      v.id,
            title:   v.title,
            price:   v.price,
            sku:     v.sku,
            options: v.options,
            inStock: v.is_available,
          };
        }),
        options: (p.options || []).map(function(o) {
          return {
            name:   o.name,
            type:   o.type,
            values: (o.values || []).map(function(v) { return { id: v.id, title: v.title }; }),
          };
        }),
        tags:     p.tags || [],
        category: tagToCategory(p.tags || []),
      };
    });

    cache = { data: slim, at: Date.now() };
    return cors(200, JSON.stringify(slim));

  } catch (err) {
    console.error('get-products error:', err.message);
    return cors(500, JSON.stringify({ error: 'Internal server error', detail: err.message }));
  }
};

function tagToCategory(tags) {
  var t = tags.map(function(s) { return s.toLowerCase(); });
  if (t.some(function(s) { return s.includes('hat') || s.includes('cap') || s.includes('snapback'); })) return 'hats';
  if (t.some(function(s) { return s.includes('hoodie') || s.includes('sweatshirt'); })) return 'hoodies';
  return 'shirts';
}

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}
