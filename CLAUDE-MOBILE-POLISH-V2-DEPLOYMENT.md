# Claude Deployment Prompt — Christos.Fashion Mobile Polish v2

Use the attached `Christos_Fashion_Mobile_Polish_V2_Ready.zip` as the newest production version of Christos.Fashion.

## Objective
Deploy the finished Mobile Polish v2 package safely. Do not redesign the site and do not undo the mobile hierarchy, Therapy Collection cleanup, Why Christos rewrite, or footer cleanup already implemented.

## Instructions

1. Confirm you are inside the existing Christos.Fashion GitHub repository.
2. Run `git status`, `git branch --show-current`, `git remote -v`, and `git log -1 --oneline`.
3. Preserve the repository's existing `.git` directory and all environment variables/secrets.
4. Create a rollback point before replacing files.
5. Extract the ZIP to a temporary directory.
6. Copy the **contents inside the `Christos.fashion` folder** into the repository root. Do not create a nested `Christos.fashion/Christos.fashion` structure.
7. Do not replace the repository's `.git` directory.
8. Preserve Stripe, Printify, Netlify, analytics, Merchant Center, and other production secrets.
9. Confirm these key changes remain present after copying:
   - `<body class="page-home">` on the homepage.
   - Mobile hero campaign imagery appears directly after the hero CTA.
   - Mobile hero proof row is hidden; trust strip remains visible.
   - Therapy Collection contains the five design cards and **one** main CTA.
   - No `therapy-product-grid` exists on the homepage.
   - Therapy artwork is not dimmed.
   - Why Christos uses the short `Faith Beyond Sunday` eyebrow and readable value-card hierarchy.
   - Homepage footer newsletter is hidden because the main email signup already appears above the footer.
   - Footer link contrast is improved.
10. Run the available project checks. At minimum run JavaScript syntax validation and inspect for broken local asset paths.
11. Test responsive layouts at approximately 320px, 360px, 375px, 390px, 414px, 768px, and desktop.
12. On mobile verify:
   - logo is clearly visible;
   - hero headline fits without awkward clipping;
   - hero lifestyle images display immediately after the CTA;
   - no horizontal overflow;
   - trust strip is readable;
   - Therapy cards have readable labels and full contrast;
   - only one Therapy CTA is displayed;
   - Why Christos is readable and no longer looks like a wall of spaced-out uppercase text;
   - all five campaign-gallery images remain visible;
   - footer Shop and Info links are legible and compact;
   - cart and mobile navigation still work.
13. Verify desktop has not regressed.
14. Review `git diff` before committing and confirm no secrets or unrelated files were added.
15. Commit with a message such as:
   `fix: finalize Christos mobile UX and conversion polish`
16. Push to the production branch without force-pushing.
17. Confirm Netlify publishes the new commit successfully.
18. Inspect `https://christos.fashion/` in a private/incognito browser after deployment.
19. If an old version appears, use Netlify **Clear cache and deploy site** once rather than repeatedly pushing identical commits.

## Do not change
- Visual brand identity
- Existing campaign imagery
- Printify integration
- Stripe checkout
- Product/collection server-rendered routes
- Merchant Center feed
- Dynamic sitemap
- Analytics event architecture
- Prayer wall/forms
- Legal/policy pages unless a genuine technical issue is found

## Final report
Return:
- previous and new commit hashes;
- files changed;
- test results by viewport;
- Netlify deploy status;
- confirmation of the live production URL;
- confirmation that the hero images, Therapy Collection, Why Christos section, and footer look correct on mobile;
- any genuine owner action still required.
