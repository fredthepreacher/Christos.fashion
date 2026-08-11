# Christos.Fashion — Google Growth & Launch Readiness

## Status

This build is prepared for the next stage of Google organic search, Merchant Center, free listings, and paid Google Ads. The code-side work is implemented. Account-specific IDs and approvals still require owner access.

## What Was Implemented

### Crawlable commerce architecture
- Dedicated server-rendered product URLs under `/products/*` using the live Printify catalog.
- Dedicated server-rendered collection landing pages:
  - `/collections/christian-shirts`
  - `/collections/christian-hats`
  - `/collections/faith-over-fear`
  - `/collections/jesus-saves`
  - `/collections/therapy`
  - `/collections/all`
- Canonical URLs, Open Graph metadata, Product schema, Offer/AggregateOffer data, breadcrumbs, product imagery, prices, and availability.
- Dynamic XML sitemap at `/sitemap.xml` containing current live Printify products and collections.
- Shop page now has crawlable collection links even before the client-side live inventory loads.

### Therapy Collection
- Added five campaign designs into site assets:
  - Scripture Is My Therapy
  - Jesus Is My Therapy
  - God Is My Therapy
  - Prayer Is My Therapy
  - Christ Is My Therapy
- Added a dedicated Therapy Collection homepage section and server-rendered collection landing page.
- Added the five products to FAQ/AEO copy and internal links.
- Added a clear disclaimer that the slogans are faith statements, not medical treatment claims or a substitute for appropriate professional care.

### Google Merchant Center readiness
- Added `/merchant-feed.xml`, generated from the live Printify catalog.
- One feed item is generated per enabled/in-stock variant.
- Feed includes price, availability, image, additional images, brand, MPN/SKU, item group, color when supplied by Printify, size when supplied, gender, adult age group, product type, and campaign labels.
- Variant feed links resolve to the matching product page and selected variant.
- Added labels for `therapy`, `faith-over-fear`, `jesus-saves`, and evergreen products to make campaign segmentation easier.

### Analytics and Google Ads conversion readiness
- Added `js/analytics.js`.
- Added public configuration endpoint `/api/public-config`.
- Supported public environment variables:
  - `GA4_MEASUREMENT_ID`
  - `GOOGLE_ADS_ID`
  - `GOOGLE_ADS_PURCHASE_LABEL`
- Added consent handling for analytics storage.
- Ecommerce events now include:
  - `view_item`
  - `select_item`
  - `add_to_cart`
  - `view_cart`
  - `remove_from_cart`
  - `begin_checkout`
  - `add_payment_info`
  - `purchase`
- Purchase events are deduplicated using the Stripe PaymentIntent/order ID.

### Checkout and fulfillment hardening
- PaymentIntent is now created after validated shipping information is entered instead of unnecessarily at page load.
- Prices are re-verified against Printify server-side.
- Checkout is currently limited to U.S. delivery so the public shipping policy, checkout, and Merchant Center settings can remain consistent for launch.
- Server validates name, email, U.S. address, two-letter state code, and ZIP before accepting payment.
- Stripe receives receipt email and shipping address.
- Webhook creates Printify orders using the Stripe PaymentIntent as the external order ID.
- Printify failures now return a retryable server error rather than falsely acknowledging fulfillment success.
- Duplicate Printify-order responses are handled idempotently.

### Policy and trust consistency
- Added dedicated `/shipping.html` and `/returns.html` pages.
- Shipping currently states:
  - U.S. launch market
  - $5.99 shipping below $50
  - free U.S. shipping on orders $50+
  - production and transit expectations
- Return/replacement language now consistently explains made-to-order limitations and defect/damage/misprint support rather than promising ordinary “easy returns.”
- Footer links point to dedicated policy pages.
- Removed unsupported customer-count language and fabricated-looking named testimonials.
- Customer-style AI campaign imagery is described as brand campaign imagery rather than verified customer photography.
- Removed the unverified countdown timer and replaced it with an honest early-access invitation.

### SEO / AEO / GEO cleanup
- Refined key homepage, shop, and About metadata.
- Added SEO descriptions for high-priority products and phrases.
- Strengthened internal linking around Christian shirts, Christian hats, Faith Over Fear, Jesus Saves, and Therapy Collection searches.
- Added/updated FAQ answers around products, shipping, returns, hats, Therapy Collection, and sizing.
- `robots.txt` allows crawlers to see `noindex` on transactional pages while blocking implementation endpoints.

## Owner Actions Required Before Advertising

### 1. Google Analytics 4
Create or select the Christos.Fashion GA4 web data stream and add this Netlify environment variable:

`GA4_MEASUREMENT_ID=G-XXXXXXXXXX`

Deploy again and verify ecommerce events in GA4 DebugView/Realtime.

### 2. Google Ads
Create the Google Ads conversion action for purchases and add:

`GOOGLE_ADS_ID=AW-XXXXXXXXX`

`GOOGLE_ADS_PURCHASE_LABEL=XXXXXXXXXXXX`

The `purchase` event will send the transaction value and currency after successful Stripe payment.

Treat **Purchase** as the primary optimization conversion. Add-to-cart and begin-checkout should normally be secondary/observational signals once purchases are measurable.

### 3. Google Search Console
- Verify `https://christos.fashion/`.
- Submit `https://christos.fashion/sitemap.xml`.
- Request indexing for:
  - homepage
  - `/collections/christian-shirts`
  - `/collections/christian-hats`
  - `/collections/faith-over-fear`
  - `/collections/jesus-saves`
  - `/collections/therapy`
- Use Search Console Performance data as the source of truth for actual ranking queries and positions.

### 4. Google Merchant Center
- Verify and claim `christos.fashion`.
- Set target country to United States for the initial launch.
- Add a scheduled product data source using:

`https://christos.fashion/merchant-feed.xml`

- Configure account-level shipping to match the website exactly:
  - $5.99 standard shipping below $50
  - free shipping at $50+
- Configure the return/replacement policy to match `/returns.html` exactly.
- Review Merchant Center diagnostics for missing or invalid product attributes, especially color, size, image quality, and identifiers.
- Do not launch Shopping ads until prices, landing pages, availability, shipping, and policy data match what customers see at checkout.

### 5. Printify catalog QA
For every product intended for Google:
- keep the title accurate and customer-readable;
- make sure at least one variant is enabled and available;
- use a clean primary mockup;
- provide accurate color and size option names;
- keep SKU/MPN values unique when available;
- tag hats with `hat`, `cap`, `snapback`, or equivalent so site categorization is correct;
- tag Therapy products with `therapy` or keep “Therapy” in the product title.

### 6. Final live transaction test
Before paid traffic:
- use Stripe test mode on a safe deployment or follow the existing approved test workflow;
- test one shirt and one hat;
- confirm cart, shipping threshold, payment, order-success page, purchase tracking, Stripe webhook, and Printify order creation;
- confirm the live policy copy matches checkout behavior.

## Google Ads Landing Pages

Use intent-specific landing pages instead of sending every click to the homepage.

| Search intent | Landing page |
|---|---|
| Christian shirts / Christian t-shirts | `/collections/christian-shirts` |
| Christian hats | `/collections/christian-hats` |
| Faith Over Fear shirt/apparel | `/collections/faith-over-fear` |
| Jesus Saves hat/apparel | `/collections/jesus-saves` |
| Scripture/Jesus/God/Prayer/Christ Is My Therapy | `/collections/therapy` |
| Broad Christos brand traffic | `/` |

## Initial Negative Keyword Themes

Protect ad spend from digital-design and non-apparel intent. Start with negatives such as:

- svg
- png
- cricut
- printable
- template
- clipart
- vector
- sublimation
- embroidery file
- mockup
- digital download
- free download
- design file

For Therapy Collection ad groups, also exclude service/treatment searches that clearly seek healthcare rather than apparel, such as:

- therapist
- counseling
- psychologist
- psychiatrist
- therapy near me
- counseling near me
- mental health treatment
- appointment
- insurance therapy

## Recommended Campaign Order

1. **Search — High Intent Christian Apparel**
   - Christian Shirts
   - Christian Hats
   - Faith Over Fear
   - Jesus Saves
   - Therapy Collection phrase-specific ad groups
2. **Merchant Center Free Listings** as soon as products are approved.
3. **Shopping / Performance Max** only after Merchant Center approval and verified purchase tracking.
4. Add remarketing/audience expansion only after enough traffic and conversion data exists.

## Messaging Guardrails

- Do not claim Christos products are the “#1,” “best-selling,” or medically healing without substantiation.
- Therapy Collection ads should describe faith, encouragement, prayer, Scripture, identity, and statement apparel — not diagnosis, treatment, cure, or guaranteed emotional/medical outcomes.
- Use real prices, real shipping terms, and real availability.

