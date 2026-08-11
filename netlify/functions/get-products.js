const { fetchCatalog } = require('../lib/catalog');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(204, '');
  if (event.httpMethod !== 'GET') return cors(405, JSON.stringify({ error: 'Method not allowed' }));

  try {
    const products = await fetchCatalog(process.env);
    return cors(200, JSON.stringify(products));
  } catch (err) {
    console.error('get-products error:', err.message);
    const status = err.code === 'MISCONFIGURED' ? 500 : 502;
    return cors(status, JSON.stringify({ error: status === 500 ? 'Server misconfiguration' : 'Product catalog unavailable' }));
  }
};

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': status === 200 ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' : 'no-store',
    },
    body,
  };
}
