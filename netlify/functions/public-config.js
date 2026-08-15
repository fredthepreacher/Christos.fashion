// Public, non-secret measurement IDs for the browser.
// Anything returned here is visible to every visitor — only public IDs belong
// in this response. The Meta Conversions API token (META_CAPI_TOKEN) is
// deliberately NOT included; it is used server-side in stripe-webhook.js only.
exports.handler = async () => {
  const body = {
    ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || '',
    googleAdsId: process.env.GOOGLE_ADS_ID || '',
    googleAdsPurchaseLabel: process.env.GOOGLE_ADS_PURCHASE_LABEL || '',
    metaPixelId: process.env.META_PIXEL_ID || '',
  };
  return { statusCode:200, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300, s-maxage=900'}, body:JSON.stringify(body) };
};
