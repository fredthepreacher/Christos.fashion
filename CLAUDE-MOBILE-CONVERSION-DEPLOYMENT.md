# Claude Deployment Prompt — Christos.Fashion Mobile + Conversion Pass

Use the attached `Christos_Fashion_Mobile_Conversion_Ready.zip` as the newest website code. The responsive and homepage-organization work is already implemented. Do not redesign it again.

## Tasks
1. Confirm you are inside the existing Christos.Fashion GitHub repository and record `git status`, current branch, remote, and current commit.
2. Preserve the repository’s existing `.git` folder, `.env`/environment configuration, Netlify environment variables, Stripe credentials, Printify credentials, analytics IDs, and any secrets.
3. Extract the ZIP to a temporary folder. Copy the CONTENTS of its `Christos.fashion` folder into the repository root. Do not create a nested `Christos.fashion/Christos.fashion` structure.
4. Review `MOBILE-CONVERSION-PASS.md`. Do not restore the redundant homepage sections removed in this pass.
5. Confirm the homepage order is: Hero → Trust → Marquee → Featured Products → Therapy Collection → Why Christos → Scripture → Campaign Gallery → Prayer Wall → Email Signup → Footer.
6. Confirm mobile CSS keeps all hero and gallery imagery visible at 320, 360, 375, 390, and 414px widths. No horizontal overflow, clipped photos, invisible reveal sections, or desktop parallax transforms should remain on phones.
7. Confirm all `.webp` design references resolve and the original PNG source files can remain as fallbacks/source assets.
8. Preserve `/products/*`, `/collections/*`, `/merchant-feed.xml`, `/sitemap.xml`, `/api/*`, Stripe checkout, Printify fulfillment, cart, forms, SEO metadata, structured data, analytics, and Netlify functions.
9. Run JavaScript syntax checks and any available project checks. Inspect for broken local asset references and duplicate HTML IDs.
10. Test desktop and mobile locally. Specifically verify hero-worship, hero-community, chapter-conversation, all five community images, the five Therapy Collection design images, featured product cards, prayer form, cart, and navigation.
11. Review the Git diff. Do not commit `.env`, secrets, temporary files, or a second `.git` directory.
12. Commit with a message such as `fix: unify mobile experience and simplify homepage conversion flow`.
13. Push to the production branch without force-pushing.
14. Verify the new Netlify production deploy is Published and attached to the new commit.
15. Inspect `https://christos.fashion/` in desktop and mobile/incognito after deployment.

## Final report
Return the new commit hash, push status, Netlify deploy status, production URL, mobile-width test results, image-loading results, cart/form status, and any genuine owner action still required. Do not claim anything was verified unless you actually tested it.
