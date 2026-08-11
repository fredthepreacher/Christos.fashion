exports.handler = async () => {
  const body = {
    ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || '',
    googleAdsId: process.env.GOOGLE_ADS_ID || '',
    googleAdsPurchaseLabel: process.env.GOOGLE_ADS_PURCHASE_LABEL || '',
  };
  return { statusCode:200, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300, s-maxage=900'}, body:JSON.stringify(body) };
};
