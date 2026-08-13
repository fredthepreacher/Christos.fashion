# Christos.Fashion Mobile + Conversion Architecture Pass

## What changed
- Reorganized the homepage from a long, repetitive sequence into a clear conversion journey: hero → trust → featured products → Therapy Collection → one concise brand story → Scripture → campaign gallery → prayer wall → email signup.
- Removed redundant homepage sections that repeated the same “movement / conversation / mission” message. Detailed brand content remains available on About, FAQ, collection, and product pages.
- Rebuilt the mobile hero collage so both campaign photos remain visible instead of relying on desktop absolute positioning.
- Disabled parallax transforms on tablet/mobile to prevent images from drifting or being clipped off-screen.
- Made reveal content fail-safe on phones: important sections and imagery no longer depend on IntersectionObserver to become visible.
- Changed mobile trust indicators from a tall vertical stack to a compact responsive matrix.
- Made product cards one-column on phones for larger imagery and easier shopping.
- Preserved the full campaign gallery on mobile with reliable square crops.
- Converted the large design PNG assets used by the site to optimized WebP copies and updated site references for much faster mobile loading. Original PNGs remain in the package as source assets.
- Reframed the gallery as campaign imagery, not customer testimonials.
- Replaced awkward trust wording with “Damage & Misprint Support” and “Made to Order.”
- Removed two accidental junk files and excluded `.git` from this handoff package.

## Deployment intent
This is a responsive/organization pass only. Preserve the existing Printify, Stripe, Netlify functions, Google SEO/Shopping architecture, analytics, product routes, collections, forms, policies, and environment variables.
