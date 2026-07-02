CHRISTOS.FASHION — Website v4
==================================================
Built in Claude Cowork | Multi-page · SEO · AEO Ready

FILES:
  index.html      — Homepage
  shop.html       — Full product collection
  about.html      — Brand story & mission
  faq.html        — FAQ with schema (AEO)
  contact.html    — Contact form
  styles.css      — Full design system
  script.js       — Shared JS (nav, filter, FAQ, countdown)
  robots.txt      — Search engine crawling rules
  sitemap.xml     — All pages for Google/Bing indexing
  assets/
    christos-logo-gold.png     — Brand logo
    designs/                   — ← ADD YOUR PRODUCT IMAGES HERE

==================================================
PRODUCT IMAGES — HOW TO ADD THEM
==================================================
Save your design images into: assets/designs/
Use these exact filenames:

  built-by-faith.png          — Built By Faith tee design
  faith-over-fear.png         — Faith Over Fear tee design
  pray-work-repeat.png        — Pray. Work. Repeat. tee design
  christ-over-culture.png     — Christ Over Culture tee design
  god-taught-me.png           — God Taught Me tee design
  work-hard-god-first.png     — Work Hard God First tee design
  i-thought-it-was-over.png   — I Thought It Was Over tee design
  jesus-saves-hat.png         — Jesus Saves snapback hat mockup
  og-image.jpg                — Social sharing preview image (1200x630px)

If you use different filenames, update the src="" in shop.html and index.html.

The site shows a styled placeholder if an image is missing.

==================================================
PRINTIFY INTEGRATION
==================================================
When your products are live on Printify:
1. Open shop.html
2. Find the PRINTIFY_LINKS object in the <script> at the bottom
3. Replace each '#' with your actual Printify product URL
4. Remove the "Shop coming soon" banner (the yellow note div)

==================================================
CONTACT FORM — FORMSPREE SETUP (5 minutes, free)
==================================================
The form is already wired for Formspree. You just need your Form ID.

STEP 1: Create your free account
  → Go to https://formspree.io
  → Sign up with hello@christos.fashion

STEP 2: Create a new form
  → Click "+ New Form"
  → Name it: Christos Fashion Contact
  → Set "Email destination" to: hello@christos.fashion
  → Click Create Form

STEP 3: Get your Form ID
  → It will show a URL like: https://formspree.io/f/xpwzabcd
  → Your Form ID is the last part: xpwzabcd

STEP 4: Paste it into contact.html
  → Open contact.html
  → Find this line:
       action="https://formspree.io/f/YOUR_FORM_ID"
  → Replace YOUR_FORM_ID with your actual ID, e.g.:
       action="https://formspree.io/f/xpwzabcd"
  → Save the file

STEP 5: Test it
  → Open contact.html in a browser
  → Submit a test message
  → Check hello@christos.fashion — you should receive it instantly

That's it. No backend, no server, no code needed beyond that one swap.

==================================================
EMAIL SIGNUP
==================================================
To collect real emails, connect to Mailchimp or ConvertKit:
Option A: Replace <form action="#"> with your Mailchimp embed action URL
Option B: Use their embedded signup widget

==================================================
SEO CHECKLIST
==================================================
✅ Title tags (all pages)
✅ Meta descriptions (all pages)
✅ Canonical URLs (all pages)
✅ Open Graph tags (all pages)
✅ Twitter Card tags (all pages)
✅ Organization schema (index.html)
✅ Product schema (shop.html)
✅ FAQ schema for AEO (faq.html)
✅ BreadcrumbList schema (all inner pages)
✅ robots.txt
✅ sitemap.xml
✅ Alt text on all images
✅ Proper H1/H2/H3 hierarchy
✅ Clean URLs (no query strings on main pages)

TODO when live:
□ Submit sitemap to Google Search Console
□ Submit sitemap to Bing Webmaster Tools
□ Add Google Analytics / GA4
□ Set up Facebook Pixel (before running ads)
□ Add real og-image.jpg (1200x630) for social sharing
□ Update sitemap.xml lastmod dates when content changes
□ Replace all social URLs with real profile links

==================================================
DOMAIN SETUP — christos.clothing → christos.fashion
==================================================
PRIMARY domain: christos.fashion
REDIRECT domain: christos.clothing (301 → christos.fashion)

Where to set this up depends on who you registered christos.clothing with.

--- IF YOU BOUGHT BOTH DOMAINS AT THE SAME REGISTRAR (GoDaddy, Namecheap, etc.) ---

Option A — Forwarding (easiest, no hosting needed):
  1. Log into your domain registrar
  2. Go to christos.clothing → Domain Forwarding / Redirect
  3. Set: Forward to → https://christos.fashion
  4. Type: Permanent (301)
  5. Settings: Forward with masking OFF (you want the URL to change)
  6. Save — it can take a few hours to propagate

Option B — If your host supports it (Netlify, Vercel, etc.):
  Add christos.clothing as an alias domain in your hosting settings
  and configure a redirect rule:
    [[redirects]]
    from = "https://christos.clothing/*"
    to   = "https://christos.fashion/:splat"
    status = 301
    force = true

--- WHY THIS MATTERS FOR SEO ---
Having two domains serve the same content without a redirect
splits your Google authority. The 301 redirect makes sure 100%
of your SEO credit flows to christos.fashion.

--- ALSO UPDATE YOUR SOCIAL LINKS ---
In your Instagram bio, TikTok link, and any ads, always link to:
  https://christos.fashion
(not christos.clothing — even though it redirects)

==================================================
© 2025 Christos.Fashion
