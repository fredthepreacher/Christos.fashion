// ============================================================
// Netlify Function: get-products
// GET /api/get-products
//
// Fetches your Printify shop products and returns a slim,
// frontend-safe payload. The Printify API key never leaves
// the server.
//
// Env vars required (set in Netlify dashboard → Site config → Env vars):
//   PRINTIFY_API_KEY  — your Printify personal access token
//   PRINTIFY_SHOP_ID  — your shop ID (find it in Printify → My stores)
// ============================================================

const PRINTIFY_BASE = 'https://api.printify.com/v1';

// Simple in-memory cache so rapid page loads don't hammer Printify.
// Resets each time the function cold-starts (fine for serverless).
let cache = { data: null, at: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

exports.handler = async (event) => {
  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return cors(204, '');
  }

  if (event.httpMethod !== 'GET') {
    return cors(405, JSON.stringify({ error: 'Method not allowed' }));
  }

  const { PRINTIFY_API_KEY, PRINTIFY_SHOP_ID } = process.env;

  if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
    console.error('Missing PRINTIFY_API_KEY or PRINTIFY_SHOP_ID env vars');
    return cors(500, JSON.stringify({ error: 'Server misconfiguration' }));
  }

  // Return cached response if fresh
  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    return cors(200, JSON.stringify(cache.data));
  }

  try {
    // Printify paginates at 10 products by default; fetch up to 100
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
      return cors(502, JSON.stringify({ error: 'Failed to fetch products from Printify' }));
    }

    const { data: products } = await response.json();

    // Transform into a slim payload — only what the frontend needs
    const slim = products.map(p => ({
      id:          p.id,
      title:       p.title,
      description: p.description,
      // Printify images array; grab the first as the primary
      image:       p.images?.[0]?.src ?? null,
      images:      (p.images ?? []).slice(0, 4).map(i => i.src),
      // Variants hold per-size/color pricing
      variants: p.variants
        .filter(v => v.is_enabled)
        .map(v => ({
          id:       v.id,
          title:    v.title,       // e.g. "Black / S"
          price:    v.price,       // in cents (e.g. 2999 = $29.99)
          sku:      v.sku,
          options:  v.options,     // array of option ids
          inStock:  v.is_available,
        })),
      // Options meta (color names, size names)
      options: (p.options ?? []).map(o => ({
        name:   o.name,
        type:   o.type,
        values: o.values.map(v => ({ id: v.id, title: v.title, colors: v.colors })),
      })),
      tags:      p.tags ?? [],
      // Use tags to drive the filter tabs on shop.html
      category:  tagToCategory(p.tags ?? []),
    }));

    cache = { data: slim, at: Date.now() };

    return cors(200, JSON.stringify(slim));
  } catch (err) {
    console.error('get-products error:', err);
    return cors(500, JSON.stringify({ error: 'Internal server error' }));
  }
};

// ---- helpers ----

function tagToCategory(tags) {
  const t = tags.map(s => s.toLowerCase());
  if (t.some(s => s.includes('hat') || s.includes('cap') || s.includes('snapback'))) return 'hats';
  if (t.some(s => s.includes('hoodie') || s.includes('sweatshirt'))) return 'hoodies';
  return 'shirts'; // default
}

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body,
  };
}
