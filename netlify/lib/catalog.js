const PRINTIFY_BASE = 'https://api.printify.com/v1';

const PRODUCT_OVERRIDES = {
  '6a431946030b9049f40d7dc5': {
    title: 'Jesus Saves Trucker Hat | Christian Snapback Cap',
    description:
      'Wear the boldest two words in history. The Jesus Saves trucker hat pairs a clean, structured foam front with a breathable mesh back — a classic snapback silhouette built for everyday wear. The design points to one message: Jesus saves. Wear it to church, on the job, at the gym, or anywhere a conversation might start.<br/><br/>' +
      'Product features<br/>' +
      '- 100% polyester foam front with nylon mesh back for all-day comfort<br/>' +
      '- One size fits most (22.8" / 58 cm) with adjustable snapback closure<br/>' +
      '- Six-row stitched visor for a durable, structured shape<br/>' +
      '- Faith-centered Jesus Saves design — a Christian hat made to be noticed',
  },
};

let catalogCache = { data: null, at: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;
// Upper bound on how long a Printify outage may be papered over with the last
// known-good catalog. Beyond this, failing loudly beats selling from stale data.
const STALE_MAX_MS = 6 * 60 * 60 * 1000;
// Hard ceiling on pagination requests (50 products per page = 5,000 products).
const MAX_CATALOG_PAGES = 100;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(raw) {
  return String(raw || '').split(' | ')[0].trim();
}

function tagToCategory(tags, title) {
  const t = (tags || []).map(s => String(s).toLowerCase());
  const n = String(title || '').toLowerCase();
  if (t.some(s => s.includes('hat') || s.includes('cap') || s.includes('snapback')) || /\b(hat|cap|snapback|trucker)\b/.test(n)) return 'hats';
  if (t.some(s => s.includes('hoodie') || s.includes('sweatshirt')) || /\b(hoodie|sweatshirt)\b/.test(n)) return 'hoodies';
  return 'shirts';
}

function collectionTags(product) {
  const title = cleanTitle(product.title).toLowerCase();
  const tags = (product.tags || []).map(t => String(t).toLowerCase());
  const out = [];
  if (title.includes('therapy') || tags.some(t => t.includes('therapy'))) out.push('therapy');
  if (title.includes('faith over fear')) out.push('faith-over-fear');
  if (title.includes('jesus saves')) out.push('jesus-saves');
  if (product.category === 'shirts') out.push('christian-shirts');
  if (product.category === 'hats') out.push('christian-hats');
  if (product.category === 'hoodies') out.push('christian-hoodies');
  return Array.from(new Set(out));
}

function seoDescription(product) {
  const title = cleanTitle(product.title);
  const lower = title.toLowerCase();
  if (lower.includes('faith over fear')) {
    return 'Shop the Faith Over Fear Christian apparel design from Christos.Fashion — a bold reminder to choose trust over anxiety and wear your faith into everyday life.';
  }
  if (lower.includes('jesus saves')) {
    return 'Shop the Jesus Saves Christian hat from Christos.Fashion — a bold, everyday faith statement designed to start Gospel-centered conversations wherever you go.';
  }
  if (lower.includes('scripture is my therapy')) {
    return 'Shop Scripture Is My Therapy Christian apparel from Christos.Fashion — a faith-forward statement about finding truth, perspective, and encouragement in God’s Word.';
  }
  if (lower.includes('jesus is my therapy')) {
    return 'Shop Jesus Is My Therapy Christian apparel from Christos.Fashion — a bold statement of faith centered on hope, peace, and dependence on Jesus Christ.';
  }
  if (lower.includes('god is my therapy')) {
    return 'Shop God Is My Therapy Christian apparel from Christos.Fashion — a modern faith statement about bringing life, stress, and struggle back to God.';
  }
  if (lower.includes('prayer is my therapy')) {
    return 'Shop Prayer Is My Therapy Christian apparel from Christos.Fashion — a wearable reminder to bring every burden, question, and victory to God in prayer.';
  }
  if (lower.includes('christ is my therapy')) {
    return 'Shop Christ Is My Therapy Christian apparel from Christos.Fashion — a bold declaration that points daily life, healing, hope, and identity back to Christ.';
  }
  const plain = stripHtml(product.description);
  if (plain.length >= 90) return plain.slice(0, 157).replace(/\s+\S*$/, '') + '…';
  return `Shop ${title} from Christos.Fashion — premium Christian apparel designed to help believers wear their faith boldly and start meaningful conversations.`;
}

function normalizeProduct(p) {
  const ov = PRODUCT_OVERRIDES[p.id] || {};
  const title = ov.title || p.title || 'Christos.Fashion Product';
  const description = ov.description || p.description || '';
  const enabledVariants = (p.variants || []).filter(v => v.is_enabled);
  const usedValueIds = {};
  enabledVariants.forEach(v => (v.options || []).forEach(id => { usedValueIds[id] = true; }));

  const category = tagToCategory(p.tags || [], title);
  const product = {
    id: p.id,
    title,
    cleanTitle: cleanTitle(title),
    description,
    descriptionText: stripHtml(description),
    seoDescription: '',
    image: p.images && p.images[0] ? p.images[0].src : null,
    images: (p.images || []).slice(0, 6).map(i => i.src),
    variants: enabledVariants.map(v => ({
      id: v.id,
      title: v.title,
      price: v.price,
      sku: v.sku,
      options: v.options || [],
      inStock: v.is_available !== false,
    })),
    options: (p.options || []).map(o => ({
      name: o.name,
      type: o.type,
      values: (o.values || [])
        .filter(v => usedValueIds[v.id])
        .map(v => ({ id: v.id, title: v.title, colors: v.colors || null })),
    })).filter(o => o.values.length > 0),
    tags: p.tags || [],
    category,
    slug: slugify(cleanTitle(title)),
    visible: p.visible !== false,
  };
  product.collections = collectionTags(product);
  product.productUrl = `/products/${product.slug}--${product.id}`;
  product.seoDescription = seoDescription(product);
  return product;
}

async function fetchCatalog(env = process.env, options = {}) {
  const { PRINTIFY_API_KEY, PRINTIFY_SHOP_ID } = env;
  if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
    const missing = [!PRINTIFY_API_KEY && 'PRINTIFY_API_KEY', !PRINTIFY_SHOP_ID && 'PRINTIFY_SHOP_ID'].filter(Boolean).join(', ');
    const error = new Error(`Missing environment variables: ${missing}`);
    error.code = 'MISCONFIGURED';
    throw error;
  }

  if (!options.noCache && catalogCache.data && Date.now() - catalogCache.at < CACHE_TTL_MS) {
    return catalogCache.data;
  }

  // Printify caps the product list at 50 items per response. Walk every page
  // so the storefront keeps showing the whole catalog as it grows past 50.
  // Two independent stops guard against an infinite loop if Printify ever
  // reports pagination inconsistently: the advertised last_page, and a hard
  // page ceiling.
  const source = [];
  try {
    let page = 1;
    let lastPage = 1;
    do {
      const response = await fetch(`${PRINTIFY_BASE}/shops/${PRINTIFY_SHOP_ID}/products.json?limit=50&page=${page}`, {
        headers: { Authorization: `Bearer ${PRINTIFY_API_KEY}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const text = await response.text();
        const error = new Error(`Printify API error ${response.status}: ${text.slice(0, 400)}`);
        error.status = response.status;
        throw error;
      }

      const json = await response.json();
      // A bare array means an unpaginated response — take it and stop.
      if (Array.isArray(json)) { source.push(...json); break; }

      const batch = json.data || [];
      source.push(...batch);
      lastPage = Math.max(1, Number(json.last_page) || 1);
      // Defensive: an empty page means there is nothing further to walk,
      // whatever last_page claims.
      if (batch.length === 0) break;
      page += 1;
    } while (page <= lastPage && page <= MAX_CATALOG_PAGES);
  } catch (error) {
    // A transient Printify failure should not empty the storefront. If we
    // previously loaded a good catalog and it is not yet unreasonably old,
    // keep selling from it. Past that bound we surface the error rather than
    // quietly serving prices and stock that may no longer be real.
    if (catalogCache.data && Date.now() - catalogCache.at < STALE_MAX_MS) {
      console.warn('Printify catalog refresh failed; serving cached catalog:', error.message);
      return catalogCache.data;
    }
    throw error;
  }

  const products = source.map(normalizeProduct).filter(p => p.visible && p.variants.length > 0);
  catalogCache = { data: products, at: Date.now() };
  return products;
}

function findProduct(products, requestSlug) {
  const raw = decodeURIComponent(String(requestSlug || '')).replace(/^\/+|\/+$/g, '');
  const withoutExt = raw.replace(/\.html$/i, '');
  const parts = withoutExt.split('--');
  const maybeId = parts.length > 1 ? parts[parts.length - 1] : null;
  if (maybeId) {
    const byId = products.find(p => p.id === maybeId);
    if (byId) return byId;
  }
  const q = slugify(parts[0] || withoutExt);
  if (!q) return null;
  return products.find(p => p.slug === q) ||
         products.find(p => p.slug.startsWith(q + '-')) ||
         products.find(p => p.slug.includes(q)) ||
         products.find(p => q.includes(p.slug));
}

function optionValueMap(product) {
  const map = new Map();
  (product.options || []).forEach(group => {
    (group.values || []).forEach(value => {
      map.set(value.id, { group: group.name, type: group.type, ...value });
    });
  });
  return map;
}

module.exports = {
  PRINTIFY_BASE,
  fetchCatalog,
  normalizeProduct,
  findProduct,
  slugify,
  stripHtml,
  cleanTitle,
  tagToCategory,
  optionValueMap,
};
