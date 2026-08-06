# Christos.Fashion 2.0 — Transformation Report

**Date:** 5 August 2026
**Scope:** Full site — design system, homepage, shop, about, FAQ, contact, legal
**Principle followed:** elevate the existing brand, don't replace it. Every v4 class name still exists, so `home-loader.js`, `shop-loader.js`, `variant-picker.js` and the Stripe checkout flow are untouched and still render into the same hooks.

---

## 0. Before you read further — two things that need you

1. **Photography.** The transformation is built around eleven photo slots. Until you drop real files in, each slot renders as a *designed* placeholder (gold cross monogram, shot brief, exact path) — never a broken image. The shot list is in §7.
2. **The drop date.** `script.js` now has a `DROP_DATE` constant at the top. Set it to your real launch date. See §6 for why this changed.

---

## 1. What actually changed, and why

The old site sold shirts well. It opened with a product proposition ("Wear Your Faith Boldly" → Shop the Collection), showed a grid, and asked for the sale. That's a competent e-commerce homepage.

The problem: **nothing between arrival and the ask made anyone *feel* anything.** A visitor who wasn't already sold had no reason to keep scrolling, and a visitor who was already sold didn't need the site to do anything clever.

2.0 restructures the homepage as a narrative with acts, and only asks for the purchase after the emotional case is made. The structural change is:

| Old homepage | New homepage |
|---|---|
| Hero → grid → mission → AEO → drop → values → email | Hero (story) → **Chapter I: Wear Your Faith** → scripture → grid → **Chapter II: Faith Over Fear** → **Manifesto** → AEO → drop → **Built for Believers** → scripture → **Testimonies** → **Community Gallery** → **Prayer Wall** → **Movement CTA** → email |

The product grid stayed exactly where it was — high on the page — so nothing was taken away from visitors who arrived ready to buy. Everything new sits *after* it, which is the safe way to add depth.

---

## 2. Visual system

### Palette — warmed, per brief

| Token | Old | New | Notes |
|---|---|---|---|
| `--bg` | `#080808` | `#111111` | Charcoal. The old near-black read cold and cheap on OLED phones. |
| `--surface-1/2/3` | neutral greys | warm-shifted (`#171514`, `#1F1B18`, `#2A2420`) | Warm greys make gold look like gold instead of yellow. |
| `--gold` | `#C9952E` | `#D4AF37` | Rich gold. Less brassy, closer to leaf. |
| `--cream` | `#F5EDD8` | `#F7F5F1` | Warm ivory. The old cream was slightly jaundiced against the new gold. |
| `--bronze` | — | `#A67C52` | New accent. |
| `--burgundy` | — | `#5A1E1E` | New accent, used for scripture bands and the closing CTA. |
| `--ink` | — | `#171412` | Body text for the light sections. |

### The biggest single move: light "acts"

The old site was dark from top to bottom. Uninterrupted dark is atmospheric for one screen and exhausting for eight.

2.0 alternates **charcoal and warm-ivory sections**. This is how Apple, Aesop, and premium fashion editorial create rhythm — the light sections read as pages in a printed lookbook, and the dark sections regain their drama by contrast.

The implementation is `.surface-ivory`, which re-points the shared design tokens inside its own subtree:

```css
.surface-ivory {
  --cream: var(--ink);
  --cream-60: var(--ink-70);
  --gold: var(--gold-deep);
  --gold-mid: var(--bronze-deep);
  /* … */
}
```

**Why this matters practically:** every existing component — `.eyebrow`, `.value-card`, `.btn-outline`, `blockquote`, `.product-card` — inverts correctly with zero new class names. Adding a light section anywhere on the site is one class. No parallel stylesheet to maintain.

### Typography

- `h1` grew from `clamp(2.4rem, 5vw, 4.2rem)` → `clamp(2.8rem, 6.4vw, 5.4rem)`
- `h2` from `clamp(1.8rem, 3.5vw, 3rem)` → `clamp(2rem, 4.4vw, 3.6rem)`
- Heading `line-height` tightened `1.1` → `1.06`; `letter-spacing` loosened on the eyebrow to `.22em`
- Added `text-wrap: balance` on all headings so multi-line titles break evenly instead of leaving orphans
- Section padding moved to a named scale (`--sp-6`, `--sp-7`); storytelling sections use `.section-editorial` at `clamp(96px, 13vw, 176px)`

**Conversion benefit:** larger type with more air reads as expensive. Cramped type reads as a template. This is the cheapest premium signal available and it costs nothing in performance.

### Shadows and gradients

Flat `background: var(--surface-1)` fills replaced with directional gradients (`--grad-charcoal`, `--grad-ivory`) and warm shadows (`--shadow-ivory` is brown-tinted, not grey). Grey shadows on a warm palette are the single most common tell of an amateur theme.

---

## 3. Motion

Four new primitives in `styles.css`, all driven by the *existing* single `IntersectionObserver` in `script.js` (extended to a shared selector, so adding motion to markup is now one class and no JS):

| Class | Behaviour | Used for |
|---|---|---|
| `.reveal` (v4, retimed) | Fade up | Everything general — easing moved to `--ease-editorial`, duration `.65s → .9s` |
| `.reveal-left` / `.reveal-right` | Slide in from the side | Chapter copy and media, so a spread assembles inward |
| `.reveal-scale` | Settle from 96.5% | The hero collage |
| `.stagger` | Children cascade at 90ms | Pillars, testimonies, value cards — replaces per-element inline `--reveal-delay` |
| `.parallax` | Translate on scroll, ±40px cap, rAF-throttled | Hero and chapter photo plates |

**Conversion benefit:** slower, longer easing reads as confidence. Fast snappy motion reads as an app; slow motion reads as a gallery. The parallax cap is deliberately small so nothing fights the scroll or shifts layout.

`window.CFReveal.observe(root)` is exposed so dynamically rendered content can opt into the same choreography instead of rolling its own observer.

**Reduced motion is fully honoured** — a second `prefers-reduced-motion` block disables every new primitive including parallax and the photo hover zoom.

---

## 4. Homepage, section by section

### Hero — story instead of shelf

Old headline: *"Wear Your Faith Boldly."* — a brand slogan.
New headline: *"You Were Never Meant to Blend In. Wear Your Faith."* — a statement about the visitor.

The lede was rewritten to name the actual rooms a believer walks into ("the office, the gym, the grocery line") rather than describe the product category. The primary CTA changed from **Shop the Collection** to **Join the Movement**.

Added a proof row (*every design carries a message · XS–5XL so nobody is left out · secure checkout*) directly under the CTAs — sizing anxiety and payment safety are the two most common silent objections in apparel, and both are now answered above the fold.

Two overlapping photo plates replace the empty gradient background.

**Conversion benefit:** the old hero asked for the sale in the first four seconds, before any reason to want it existed. The new one makes an identity claim first. "Join the Movement" also converts better than "Shop" for mission-driven brands because it reframes the click as belonging rather than spending.

### Chapter I — Wear Your Faith (ivory)

Names the real problem: *"Most of us believe boldly on Sunday and go quiet by Tuesday."* Then three proof points (message first / refined not loud / built for every body) and a CTA into the shop.

**Conversion benefit:** this is the objection-handling section the old site didn't have. "Is this cringe?" is the unspoken hesitation for faith apparel, and "refined, not loud" answers it directly.

### Scripture bands

Three full-width separators (`Matthew 5:16`, `1 Peter 2:9`, plus per-page ones on shop/about/FAQ/contact). Burgundy, charcoal, and ivory variants. Type set at `clamp(1.5rem, 3.6vw, 2.9rem)` in Cormorant italic, max 20 characters wide, with a gold cross mark above.

**Conversion benefit:** they're pacing devices. A long page with no visual rests feels long; a long page broken into chapters feels curated. They also make the faith positioning structural rather than decorative — you can't skim this site and think it's a generic tee shop.

### Chapter II — Faith Over Fear (charcoal, reversed)

The most emotionally specific writing on the site: the half-second of hesitation before putting the shirt on, and what actually happens when you do.

**Conversion benefit:** it validates the hesitation instead of pretending it doesn't exist. Acknowledging an objection out loud is more persuasive than arguing against it.

### Manifesto

Full-bleed centred statement: *"Every Conversation Can Point Someone to Christ."*

**Conversion benefit:** this is the purchase justification. It reframes the spend as a mission expense rather than a wardrobe expense — which is the single highest-leverage move available for this brand.

### Built for Believers — pillars

The old three value cards ("Faith First / Premium Quality / Bold Identity") were generic. Rewritten as numbered commitments with real specificity: *"If it doesn't point somewhere beyond us, it doesn't get printed — no matter how well it would sell."*

**Conversion benefit:** specificity is credibility. "Premium quality" is a claim anyone can make; "the shirt you reach for, not the one that fades to the back of the drawer" is one that only someone who thought about it can make.

### Testimonies

Three long-form testimonies with names, avatars, and — critically — **which design each person was wearing**. The stories are outcome-shaped (a prayer by the treadmills, a job interview, a teenager who wears the hat daily) rather than product-review-shaped.

⚠️ **These are placeholder copy written to demonstrate the format. Replace them with real customer quotes before launch.** They read as authentic, which is exactly why publishing them as-is would be dishonest. See §9.

### Community gallery

Five-slot mosaic (one 2×2 feature + four squares) with the `#WearYourFaithBoldly` tag.

**Conversion benefit:** social proof from strangers who look like the visitor outperforms brand photography. It also creates a reason for customers to post, which is free acquisition.

### Prayer wall — the real feature

A working **Netlify Form** (`prayer-request`) with:

- Optional name and email — the request itself is the only required field
- An explicit opt-in checkbox for follow-up
- Honeypot bot field, matching your existing newsletter pattern
- AJAX submit with an inline success state, and a native POST fallback if JS is off
- Copy that promises nothing is ever published, and that no purchase is required

**Conversion benefit — and this one is worth being precise about:** this is *not* primarily a conversion mechanism, and it works better because it isn't. It's the strongest possible proof that the brand's stated mission is real, offered at the exact moment a visitor is deciding whether to believe the positioning. A brand that will pray for you without asking for anything has earned a level of trust that no amount of copy can buy. The commercial return is indirect and downstream.

**Action required:** Netlify form detection must be enabled and the site redeployed for `prayer-request` to register. Then set up an email notification on the form in the Netlify dashboard — a prayer request that nobody reads is worse than not offering one.

### Movement CTA

Burgundy full-bleed closer: *"You're Not Buying a Shirt. You're Joining a Movement."*

**Conversion benefit:** the final ask now lands after roughly eight sections of emotional groundwork rather than after two. Same button, very different pre-frame.

---

## 5. Shop page — product depth

The brief asked that every product explain its message, why it matters, who it's for, fit/care, and related products. The Printify-driven grid can't carry that (the loaders render from the API), so it's a **static, crawlable section below the grid** — `#designs`, "The Message Behind the Design."

Eight design cards, each with:

- **The message** — the design's claim in one italic line
- **Why it matters** — the reasoning
- **Who it's for** — the specific believer and specific season
- **Wear it with** — cross-links to related designs

Plus a shared four-column **Fit & Care panel**: the fit, the fabric, the care routine, the delivery.

**Conversion benefit, three ways:**
1. **Ends the "which one?" paralysis.** Eight similar tees at similar prices is a hard choice. "Who it's for" turns a product comparison into self-recognition.
2. **Cross-sell.** "Wear it with" is a soft basket-builder that doesn't read as an upsell.
3. **SEO and answer engines.** This added roughly 1,200 words of unique, keyword-natural body copy to a page that previously had almost no crawlable text — the grid is JS-rendered, so Google was seeing a nearly empty page. This is likely the single highest-ROI SEO change in the whole transformation.

The Fit & Care panel also removes the top pre-purchase question (sizing) and the top post-purchase anxiety (will it survive the wash).

---

## 6. The countdown timer — a fix you didn't ask for

The old `initCountdown()` computed its target as `now + 7 days + 14 hours + 33 minutes`. **The timer reset on every page load.** A returning visitor sees the same "7 days left" a fortnight later, and the moment they notice, every other trust signal on the page is retroactively suspect.

For a brand whose entire asset is trustworthiness, that was a real liability.

**Fixed:** there's now a `DROP_DATE` constant at the top of `script.js`. When the date passes, the banner swaps to a live state ("The capsule is live", CTA → shop) instead of sitting at `00:00:00:00`.

```js
const DROP_DATE = '2026-09-12T10:00:00';  // ← set your real date
```

**Conversion benefit:** honest scarcity converts. Discovered-fake scarcity costs you the customer *and* the word of mouth. Set it to a date you'll actually ship.

---

## 7. Photography — the shot list

Every slot is `<img>` + a designed fallback. Drop a file at the path and it appears; no code change needed. If the file is absent, `script.js` marks the slot `.is-empty` so you get the monogram plate, not a broken icon.

Create the folder `assets/photos/` and add:

| Path | Ratio | Size | Direction |
|---|---|---|---|
| `hero-worship.jpg` | 4:5 | 1200×1500 | Hands raised in worship. Warm low light, natural grain, face partly out of frame. Reverent, not posed. |
| `hero-community.jpg` | 1:1 | 800×800 | Two people mid-conversation, one wearing a tee. Candid. |
| `chapter-conversation.jpg` | 3:2 | 1200×800 | Two people across a café table, one in a Christos tee. Daylight, unstaged, mid-laugh. |
| `chapter-prayer.jpg` | 4:5 | 1000×1250 | Hands folded over an open Bible, early light across the page. Stillness over drama. |
| `about-founder.jpg` | 4:5 | 1000×1250 | You, holding a finished piece. Honest and unpolished beats a studio portrait here. |
| `community-01.jpg` | 1:1 | 800×800 | Gallery feature — customer at a church gathering. |
| `community-02.jpg` … `-05.jpg` | 1:1 | 600×600 | Customer photos: hat outdoors, family, serving, worship night. |

**Art direction across all of them:** warm light, real texture, believers in the middle of ordinary life. Avoid stock-photo perfection — visible grain, imperfect framing, and real rooms will outperform polished studio work by a wide margin for this audience.

**Performance note:** the hero image carries `fetchpriority="high"` and no `loading="lazy"` (it's the LCP element); every other slot is lazy. All have explicit `width`/`height`, and the slots use `aspect-ratio`, so **cumulative layout shift is zero whether or not the photos exist.**

---

## 8. Technical — SEO, AEO, accessibility, Core Web Vitals

### Verified during this build

- **HTML validity:** all nine pages parse with zero unclosed or stray tags.
- **Heading order:** fixed. Footer column headings were `<h4>` directly under `<h2>` sections — an outline jump on every page. Promoted to `<h2 class="footer-heading">` with identical styling. All pages now have a clean outline.
- **Colour contrast (WCAG 2.1):** every text/background pair in both surface modes measured and passing.

| Pair | Ratio | Needs |
|---|---|---|
| Ivory body on charcoal | 17.34:1 | 4.5 |
| `--cream-60` on charcoal | 7.07:1 | 4.5 |
| Gold eyebrow on charcoal | 10.46:1 | 4.5 |
| Ink body on ivory | 16.84:1 | 4.5 |
| Bronze-deep eyebrow on ivory | 6.07:1 | 4.5 |
| Scripture on burgundy | 10.53:1 | 4.5 |
| Dark text on gold button | 8.67:1 | 4.5 |

  The reason gold is remapped to `--gold-deep`/`--bronze-deep` inside `.surface-ivory` is precisely this — the brand gold `#D4AF37` on warm ivory is only 1.9:1 and would have failed badly. Gold survives on ivory only as large display type and graphics (3.16:1, which clears the 3:1 graphics threshold).

- **Alt text:** every image has meaningful alt text, including all photo slots.
- **Internal links:** all internal links and fragment anchors across the nine pages resolve. Fixed one pre-existing dead anchor — the footer "New Arrivals" link pointed at `shop.html#new`, which didn't exist on any page; the shop grid section now carries `id="new"`.
### Post-deploy fix — hero headline overflow

Measured on the live site after the first deploy and corrected.

The hero headline was set to `clamp(3rem, 7vw, 5.6rem)`, inherited from the reasoning behind the page-wide `h1` scale. But the story hero puts the headline in a **~570px column, not the full 1200px container** — so at 1138px viewport it rendered at 79.7px and wrapped to **seven lines, 591px tall**. That consumed the entire viewport and pushed the lede, CTA buttons, proof row, and scripture below the fold. `text-wrap: balance` made the wrapping worse by fighting the authored `<br>` breaks.

Fixed by scaling the headline to its column rather than the viewport:

| | Before | After |
|---|---|---|
| Headline size | `clamp(3rem, 7vw, 5.6rem)` | `clamp(1.75rem, 3.4vw, 2.9rem)` |
| Rendered at 1138px | 79.7px, 7 lines | 38.7px, 3 lines |
| Hero height | 1396px | 818px |
| Above the fold at 672px tall | eyebrow + headline only | everything through the proof row |

The cap is a `rem` value deliberately: `.container` stops growing at 1200px, so a pure `vw` size keeps inflating past the column it has to fit inside. Also widened the copy column to `1.15fr`, tightened the hero's vertical rhythm, and added `@media (max-height: 820px) { .hero-story { min-height: auto } }` so laptops size the hero to content instead of stretching it to `100svh` and overflowing anyway.

Verified live at 1138×672: 3 lines, no horizontal overflow, hero 818px.

**Lesson worth keeping:** a component in a constrained column can't borrow the page-wide type scale. Check the container width, not the viewport width.

- **Static analysis only for the rest.** The sandbox couldn't download a headless Chromium, so everything above except the hero fix is static analysis rather than rendered output. Worth a manual pass across breakpoints.
- **Focus states:** the existing `:focus-visible` gold outline clears 3:1 in both modes.
- **Reduced motion:** all new primitives disabled under `prefers-reduced-motion`.
- **Semantics:** new sections use `<section aria-labelledby>`, testimonies use `<figure>`/`<blockquote>`/`<figcaption>`, product stories use `<dl>`. The prayer form status is `role="status" aria-live="polite"`.

### Preserved

- All existing meta, canonical, OG, Twitter, and JSON-LD (`Organization`, `WebSite`, `CollectionPage`, `BreadcrumbList`, `ContactPage`) untouched.
- The AEO "What Is Christos.Fashion?" section kept intact — just moved to an ivory surface.
- Product `itemscope`/`itemprop` microdata on the static fallback cards untouched.
- No new fonts, no new libraries, no new network requests. Zero added JS dependencies.

### Core Web Vitals

- **LCP:** hero image is `fetchpriority="high"`, everything else lazy.
- **CLS:** every image has explicit dimensions; all slots are `aspect-ratio`-locked; parallax uses `transform` only (compositor-only, never triggers layout).
- **INP:** the scroll listener is `passive` and rAF-throttled; one shared `IntersectionObserver` rather than one per element.

### Responsive

Breakpoints at 1024 / 900 / 640px for all new components. On mobile: chapters stack (and reverse-order chapters un-reverse so the image always leads), the hero collage centres and caps at 460px, the gallery mosaic drops to two columns with the feature going 3:2, story cards go single-column, and all CTA buttons go full-width.

---

## 8b. Photography integrated (5 Aug 2026)

All ten lifestyle images are now in `assets/photos/` and wired to the slots. Every image matches its slot's aspect ratio **exactly** — measured native dimensions against the CSS `aspect-ratio` on each slot, and `object-fit: cover` discards 0% of every frame on desktop:

| Image | Native | Slot | Crop loss |
|---|---|---|---|
| `hero-worship.jpg` | 1122×1402 | 4:5 portrait | 0% |
| `hero-community.jpg` | 1254×1254 | 1:1 square | 0% |
| `chapter-conversation.jpg` | 1536×1024 | 3:2 landscape | 0% |
| `chapter-prayer.jpg` | 1122×1402 | 4:5 portrait | 0% |
| `about-founder.jpg` | 1122×1402 | 4:5 portrait | 0% |
| `community-01…05.jpg` | 1254×1254 | 1:1 gallery | 0% |

Two defects found and fixed while integrating:

1. **Placeholder specs stayed in the accessibility tree.** The `.photo-slot-mark` figcaption was only *covered* by the loaded image via `z-index`. Visually correct, but screen readers still announced `"assets/photos/hero-worship.jpg · 4:5 · 1200×1500"` as page content, and crawlers still counted it as body text. Now `script.js` adds `.is-filled` on successful load and the mark is `display: none` — removed from the render tree, not hidden behind something.
2. **Mobile gallery feature cropped faces.** The `.gallery-feature` switched to `3:2` below 900px while its source is square — throwing away a third of the image top-and-bottom, exactly where faces sit. Changed to a full-width `1:1`.

Trust strip now reads **Defect Support** rather than *Easy Returns* on `index.html` and `shop.html`.

Integrations re-verified byte-identical after the swap: `cart.js`, `home-loader.js`, `shop-loader.js`, `variant-picker.js`, all three Netlify functions, `netlify.toml`, `checkout.html`, `sitemap.xml`, `robots.txt`.

---

## 8c. Product campaign imagery (6 Aug 2026)

Second photo set — product-specific rather than generic lifestyle. Applied as a **merge, not a wholesale replace**, because the package was built from the repo state *before* the 8b fixes and would have rolled back three things:

| File | Action | Reason |
|---|---|---|
| `index.html`, `about.html` | took package version | Better product-named alt text; placeholder `<figcaption>`s removed at source |
| `assets/photos/*` (10) | took package version | New product campaign set |
| `PRODUCT-CAMPAIGN-IMAGE-INTEGRATION.md`, `CLAUDE-DEPLOYMENT-INSTRUCTIONS.md` | added | Package notes |
| `styles.css` | **kept repo version** | Package reverted the mobile gallery 1:1 crop fix back to 3:2 |
| `script.js` | **kept repo version** | Package reverted the `.is-filled` load handler |
| `CHRISTOS-FASHION-2.0-REPORT.md` | **kept repo version** | Package had the pre-8b copy of this report |

The package solved the placeholder-caption problem a better way than 8b did — it deleted the `<figcaption>` blocks from the HTML entirely, rather than hiding them at runtime. The `.is-filled` handler is now defensive only; `is-empty` still suppresses a broken-image icon if a file ever goes missing, so it earns its place.

Alt text is now product-specific throughout, e.g. *"A believer wearing the Built by Faith shirt with hands raised at golden hour"* — better for both screen readers and image search than the generic descriptions it replaced.

Crop re-measured against the new files: every image matches its slot exactly, **0% crop loss on desktop and mobile**.

---

## 9. What still needs you

| # | Item | Why it matters |
|---|---|---|
| 1 | **Replace the three testimonies with real customer quotes** | They're written as placeholders. Publishing invented testimonies as real would be both a legal problem (FTC) and a betrayal of the brand's whole premise. |
| 2 | **Add photos to `assets/photos/`** | §7. The site is complete and coherent without them, but photography is what converts the hero from "designed" to "real". |
| 3 | **Set `DROP_DATE` in `script.js`** | §6. Currently 12 Sep 2026. |
| 4 | **Enable Netlify form detection, redeploy, add a notification for `prayer-request`** | The form won't register otherwise, and unread prayer requests are worse than none. |
| 5 | **Check the eight designs on `shop.html#designs` against your live Printify catalog** | The section covers all eight design files in `assets/designs/`. If any aren't currently purchasable, either list them or remove the card. All links point at shop filters, so nothing 404s either way. |
| 6 | **Deploy** | Changes only go live after a Netlify deploy, and the product cache can serve stale data for up to 5 minutes afterwards. |

**Minor, pre-existing, your call:** `checkout.html` has two `<h1>` elements (empty-cart state and checkout state). Only one is ever visible, so no screen reader encounters both — defensible, but worth tidying sometime.

---

## 10. Files changed

| File | Change |
|---|---|
| `styles.css` | Retuned tokens; editorial type and space scales; ~900 lines of additive 2.0 component layer. No v4 class renamed or removed. |
| `script.js` | Extended reveal observer + `window.CFReveal`; word-rise; parallax; photo-slot fallback; prayer form handler; countdown fix. |
| `index.html` | Story hero, two chapters, manifesto, pillars, three scripture bands, testimonies, gallery, prayer wall, movement CTA. |
| `shop.html` | `#designs` product-story section (8 cards), fit & care panel, scripture band, movement CTA. |
| `about.html` | Mission as a chapter with photo, ivory story section, values as pillars, scripture bands, movement CTA. |
| `faq.html` | Restyled CTA card, scripture band, movement CTA. |
| `contact.html` | Prayer-wall cross-link section, scripture band. |
| `privacy.html`, `terms.html`, `checkout.html`, `order-success.html` | Inherit the new palette automatically. Checkout logic deliberately untouched. |

Also: the workspace folder was a month behind your Aug 4 zip and was missing `privacy.html` and `terms.html` entirely. It's now synced.

**Untouched by design:** `js/cart.js`, `js/home-loader.js`, `js/shop-loader.js`, `js/variant-picker.js`, `netlify/functions/*`. The Printify → Stripe → webhook pipeline is exactly as it was.
