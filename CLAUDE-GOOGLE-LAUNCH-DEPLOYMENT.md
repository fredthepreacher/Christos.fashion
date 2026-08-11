# Claude Deployment Prompt — Christos.Fashion Google Launch Build

Use the attached `Christos_Fashion_Google_Launch_Ready.zip` as the new production candidate for `christos.fashion`.

## Mission
Deploy the supplied code safely. Do not redesign it. Preserve all current imagery, product integrations, Stripe/Printify functionality, environment variables, and Git history.

## Procedure
1. Confirm you are inside the correct Christos.Fashion GitHub repository.
2. Run `git status`, `git branch --show-current`, `git remote -v`, and record the current commit as the rollback point.
3. Preserve the existing `.git` directory and all local/Netlify secrets. Never copy a `.git` directory from the ZIP.
4. Extract the ZIP to a temporary directory.
5. Copy the **contents inside** the ZIP's `Christos.fashion` folder into the repository root. Do not create a nested `Christos.fashion/Christos.fashion` deployment.
6. Confirm these new/changed components exist:
   - `netlify/lib/catalog.js`
   - `netlify/functions/product-page.js`
   - `netlify/functions/collection-page.js`
   - `netlify/functions/merchant-feed.js`
   - `netlify/functions/sitemap.js`
   - `netlify/functions/public-config.js`
   - `js/analytics.js`
   - `shipping.html`
   - `returns.html`
   - five Therapy Collection artwork files under `assets/designs/`
7. Confirm `package.json` declares Stripe. The stale empty lockfile was intentionally removed; install dependencies normally rather than restoring the old empty lockfile.
8. Run the relevant install/build/syntax checks. Do not commit `node_modules`.
9. Verify Netlify redirects for `/products/*`, `/collections/*`, `/merchant-feed.xml`, `/sitemap.xml`, and `/api/*`.
10. Verify existing Netlify environment variables remain configured:
    - `PRINTIFY_API_KEY`
    - `PRINTIFY_SHOP_ID`
    - `STRIPE_SECRET_KEY`
    - `STRIPE_WEBHOOK_SECRET`
11. If Freddie supplies them, configure these **public measurement IDs** as Netlify environment variables:
    - `GA4_MEASUREMENT_ID`
    - `GOOGLE_ADS_ID`
    - `GOOGLE_ADS_PURCHASE_LABEL`
    Never invent values.
12. Locally/test-deploy and verify:
    - `/shop.html`
    - `/collections/therapy`
    - `/collections/christian-shirts`
    - `/collections/christian-hats`
    - `/collections/faith-over-fear`
    - `/collections/jesus-saves`
    - at least one live `/products/...` URL
    - `/merchant-feed.xml`
    - `/sitemap.xml`
    - `/shipping.html`
    - `/returns.html`
13. Confirm the live Printify products populate the dynamic pages, including the Therapy hats if they are visible/enabled in the connected Printify shop.
14. Confirm cart and variant selection still work.
15. Test checkout in a safe test workflow. Do not place a real paid order without explicit authorization.
16. Confirm shipping shown at checkout matches the policy: U.S. only for current launch, $5.99 under $50, free at $50+.
17. Confirm no “Easy Returns,” false countdown, fabricated testimonial, or unsupported customer-count copy remains.
18. Confirm analytics scripts load only after consent and do not expose secret keys.
19. Review `git diff` for accidental secrets, `.git`, `node_modules`, junk files, or unrelated changes.
20. Commit with a message such as:
    `feat: prepare Christos Fashion for Google commerce launch`
21. Push to the production branch without force-pushing.
22. Confirm the Netlify production deploy is Published and tied to the new commit.
23. Inspect `https://christos.fashion/` after deployment in desktop and mobile viewports.

## Do Not Change
- Do not remove or regenerate the established Christos.Fashion campaign imagery.
- Do not alter prices manually; prices come from Printify and are verified server-side at checkout.
- Do not hardcode fake product IDs, variants, inventory, reviews, ratings, customer counts, rankings, or scarcity.
- Do not change the Stripe publishable/secret configuration unless there is a verified configuration problem.
- Do not promise ordinary returns when the store policy only supports qualifying defect/damage/misprint issues.
- Do not make medical claims for the Therapy Collection.

## Required Final Report
Return:
- previous commit hash
- new commit hash
- branch pushed
- Netlify deploy status
- live URL
- product route test result
- collection route test result
- Merchant feed result
- sitemap result
- cart result
- checkout test result
- Stripe webhook test result if safely testable
- mobile result
- console/error result
- any owner actions still required for GA4, Google Ads, Search Console, Merchant Center, or account credentials

Do not declare the job finished until the live production site has been checked after deployment.
