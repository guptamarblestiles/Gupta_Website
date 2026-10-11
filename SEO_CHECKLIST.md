# SEO Checklist — Gupta Interior

Work done on branch `feat/seo` (not merged/pushed/deployed) to improve organic
Google ranking for tile/marble searches in Delhi. Covers 8 phases, listed
below with real commit hashes for reference.

## What was done

**Phase 1 — `lib/site.ts` single source of truth** (`588cb67`)
Centralized business name, address, phone, email, opening hours
(Mon–Sat, 10:00–18:00, closed Sundays), domain, and an empty `socialLinks[]`
array. `lib/contact.ts`, `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`
all read from it. Removed two placeholder footer social links that pointed
at generic `instagram.com`/`linkedin.com` instead of real profiles (hidden
until `socialLinks` is filled in). Added visible opening hours to the footer
and homepage contact section — previously absent from the site.

**Phase 2 — Metadata, canonicals, noindex** (`0ac0363`)
Unique `<title>`/description per page type via `generateMetadata`. Canonical
URLs on every page. `/products` and `/tiles` get `noindex, follow` plus a
canonical back to the clean URL whenever any filter, search, or `page` query
param is present — prevents duplicate-content signals across the many
filter-combination URLs those two pages can generate. Product pages get
OG images from the real product photo and name/size/finish/Delhi in the
title. 404 product pages are `noindex, nofollow`.

**Phase 3 — Sitemap & robots** (`c2b8de1`)
`app/sitemap.ts` pages through products in 1000-row chunks (was a single
unbounded `select`, fine today at ~550 rows but would have silently
truncated past 1000) and filters on the real `is_visible` column so hidden/
unapproved products never appear. `app/robots.ts` adds
`Disallow: /products?*` and `/tiles?*` to keep crawl budget off filter
variants, on top of the existing `/admin/` disallow.

**Phase 4 — JSON-LD structured data** (`9c7227e`)
New `components/seo/JsonLd.tsx`. Homepage: `HomeAndConstructionBusiness`
(name, full address, phone, opening hours, area served — all from
`lib/site.ts`) + `WebSite`. Product pages: `Product` (name, image, sku,
brand, category, size/finish as `additionalProperty`) + `BreadcrumbList`.
No `offers`, no `aggregateRating`, no reviews anywhere — none are real.

**Phase 5 — Collection landing pages** (`c737066`)
Five indexable pages under `/collections/[slug]`: wall-tiles, floor-tiles,
porcelain-tiles, glossy-finish-tiles, matt-finish-tiles. Each has one `<h1>`,
original 250–400 word copy, a 4–5 question FAQ (with `FAQPage` JSON-LD since
the FAQs are visibly rendered), a product grid, internal links, and
`CollectionPage` + `BreadcrumbList` JSON-LD. Linked from the navbar, a new
footer column, and the sitemap. **See "Known limitations" — these don't
fully match the original keyword targets.**

**Phase 6 — On-page & internal linking** (`52eb56d`, `72ff301`)
Added a shared `buildImageAlt()` helper producing
`"{name} {finish} {size} {category} tile"` alt text, applied in `TileCard`
and the product-image data layer (`lib/products/queries.ts`). Audited every
other `alt=` in the catalogue/gallery/homepage components — the remaining
empty ones (`CatalogueCard`, `HighlightsGrid`, `TestimonialsCarousel`) are
correctly decorative/`aria-hidden` next to visible captions, left as-is.
Confirmed the product spec block is a semantic `<dl>`, not loose divs.
New `/contact` page (NAP, hours, "Get Directions" Maps link — no API key
needed). New on-brand `app/not-found.tsx` linking back to
`/collections` and `/products`. Added one sentence naming Mangolpur Kalan,
Rohini, and Delhi NCR to the homepage's business-overview copy.

**Phase 7 — Performance** (`8f680db`)
The "3D hero" (`Tile3D.tsx`) is a CSS-transform component, not WebGL, and
was already desktop-only (`hidden lg:flex`); it's now also code-split via
`next/dynamic({ ssr: false })` so it never ships in the initial mobile
bundle. The hero's video background now falls back to a static `next/image`
poster (with `priority`) on screens under 768px and under
`prefers-reduced-motion: reduce`, so it can't compete with the hero heading
for LCP on mobile. Verified existing `next/image` `sizes`/`priority`/
width-height usage elsewhere was already correct. Confirmed `@fontsource`
ships `font-display: swap` by default.

**Phase 8 — Final verification** (this commit)
Fresh `next build`; confirmed `sitemap.xml` (559 URLs) and `robots.txt`
render correctly; re-grepped the whole repo for old brand strings (zero
hits); validated every JSON-LD block on home/product/collection pages as
parseable JSON. **Found and fixed two real bugs during this pass:**
- `/collections` and `/collections/[slug]` and `/contact` had **duplicated
  title suffixes** (`"... | Gupta Interior | Gupta Interior"`) — their own
  `generateMetadata`/`metadata` already included `"| Gupta Interior"`, and
  the root layout's `"%s | Gupta Interior"` template appended it a second
  time. Fixed by removing the brand suffix from each page's own title and
  letting the shared template add it once.
- **The homepage had no canonical tag at all.** Added
  `alternates: { canonical: "/" }` to the root layout's default metadata.
  This also meant any other page without its own canonical would now
  silently inherit `/` as its canonical once the root-level one was added —
  checked every public page and found `/visualizer` was in that state;
  gave it an explicit `/visualizer` canonical.

## Known limitations / things flagged, not fixed

1. **Category taxonomy doesn't match the original keyword targets.**
   `products.category` in the database is free-text PDF-series naming
   (e.g. `"12x18 D.R.TILES 1"`), not a clean "Marble Slabs / Granite Slabs /
   GVT Tiles / Bathroom Tiles" taxonomy. The 5 collection pages built in
   Phase 5 (wall-tiles, floor-tiles, porcelain-tiles, glossy-finish-tiles,
   matt-finish-tiles) use the two facets that *are* well-populated
   (`application` and `finish`) rather than the originally-requested
   category names. **This means the site still won't specifically target
   "marble tiles Delhi," "GVT tiles," or "bathroom tiles" as dedicated
   landing pages.** Recommend adding a real `category`/`room` taxonomy via
   the admin panel (Marble, Granite, GVT, Bathroom, etc.) so collection
   pages can be rebuilt against real, correctly-labeled groupings. One
   product's meta description was also observed showing the raw messy
   category text verbatim (e.g. "12x18 d.r.tiles 1") — cosmetic, but will
   look cleaner once categories are real words.

2. **Lighthouse could not be run in this environment** — no Chrome/Chromium
   binary available in the sandbox used for this work. Before relying on
   the performance fixes in Phase 7, run a real mobile audit via:
   - Chrome DevTools → Lighthouse panel (mobile, throttled), or
   - https://pagespeed.web.dev against the live/staging URL once deployed, or
   - `npx lighthouse <url> --form-factor=mobile --screenEmulation.mobile`
     locally where Chrome is installed.

   Check specifically: LCP element identity on `/` (should be the hero
   heading/poster image, not the 3D tile or video), CLS, and TBT, on `/`,
   `/products`, a collection page, and a product page.

3. **`NEXT_PUBLIC_SITE_URL` must be set to the production domain on
   Vercel.** Locally (and in this verification pass) it defaults to
   `http://localhost:3000`, which is what `sitemap.xml`, `robots.txt`, and
   every canonical URL currently resolve to. If this env var isn't set
   correctly in production, the sitemap/canonicals will point at localhost
   instead of `https://guptainterior.in` — the single most important thing
   to verify before relying on anything else in this checklist.

4. **No Lighthouse-verified "before" baseline exists** since Lighthouse
   never ran successfully — the Phase 7 commit's performance claims rest on
   code inspection (confirmed dynamic import via the build's separate chunk
   output, confirmed desktop-only gating, confirmed mobile poster fallback)
   rather than measured scores. Treat Phase 7 as "should help, unverified
   magnitude" until a real Lighthouse/PageSpeed run confirms it.

## Manual steps left for the business owner

- **Set `NEXT_PUBLIC_SITE_URL`** to `https://guptainterior.in` in Vercel's
  environment variables (see limitation #3 above — this affects sitemap,
  robots, and every canonical URL).
- **Google Search Console**: verify domain ownership for
  `https://guptainterior.in`, then submit
  `https://guptainterior.in/sitemap.xml`.
- **Google Business Profile**: create or claim a listing using the exact
  NAP now centralized in `lib/site.ts` — name "Gupta Interior", address
  "Shop No. B-114, Mangolpur Kalan, Pathar Market, Delhi - 110085", phone
  +91 97119 44187, hours Mon–Sat 10:00 AM–6:00 PM (closed Sunday). Keeping
  this identical to the website's JSON-LD and footer is what local SEO
  dedup/trust signals depend on.
- **Fill in `socialLinks` in `lib/site.ts`** once real Instagram/Facebook/
  etc. profile URLs exist — the footer's "Follow" block and the
  `LocalBusiness` JSON-LD's `sameAs` field both read from this array
  automatically; no further code change needed.
- **Backlinks**: get the business listed on local directories (JustDial,
  IndiaMART, Sulekha, etc.) and any supplier/partner sites, all linking to
  `guptainterior.in`.
- **Reviews**: the site intentionally has zero fake ratings/reviews
  anywhere (per explicit instruction) — collecting real Google reviews is
  the only path to star-rating rich results later. No code work needed for
  this; it's a business-side task (ask customers, respond to reviews on the
  Google Business Profile once created).
- **Rebuild the category taxonomy** (see limitation #1) via the admin panel
  if "GVT tiles," "marble tiles," "granite tiles," and "bathroom tiles" are
  priority search terms — the current 5 collections are a reasonable
  interim measure, not a full substitute.
- **Run a real Lighthouse mobile audit** post-deploy (see limitation #2).

## URL pattern reference (verified live via `npm run build && npm run start`)

| URL pattern | Title | Canonical | Robots |
|---|---|---|---|
| `/` | Gupta Interior \| Architectural Surfaces | `/` | index (default) |
| `/products` (clean) | Tile & Marble Catalogue in Delhi \| Gupta Interior | `/products` | index, follow |
| `/products?application=Wall` (any filter/search/page) | same | `/products` | **noindex, follow** |
| `/products/[slug]` | {Product Name} – {Size} \| Delhi \| Gupta Interior | `/products/{slug}` | index (default) |
| `/products/[slug]` (not found) | Product Not Found | — | noindex, nofollow |
| `/tiles` (clean) | Tiles in Delhi – GVT, Bathroom & Wall Tiles \| Gupta Interior | `/tiles` | index, follow |
| `/tiles?application=Wall` (any filter/search/page) | same | `/tiles` | **noindex, follow** |
| `/collections` | Tile Collections in Delhi \| Gupta Interior | `/collections` | index (default) |
| `/collections/[slug]` | {Collection Name} \| Gupta Interior | `/collections/{slug}` | index (default) |
| `/contact` | Contact Us – Showroom in Mangolpur Kalan, Delhi \| Gupta Interior | `/contact` | index (default) |
| `/visualizer` | Tile Visualizer \| Gupta Interior | `/visualizer` | index (default) |
| 404 (any unmatched path) | Gupta Interior \| Architectural Surfaces (inherited) | `/` (inherited, harmless — noindex wins) | noindex |

## Full commit list on `feat/seo` (not pushed/deployed)

```
8f680db Skip hero video on mobile, code-split the desktop-only 3D tile
72ff301 Add /contact page, custom 404, and homepage location copy
52eb56d Add descriptive alt text for all product images
c737066 Add /collections landing pages built from real, populated facets
9c7227e Add JSON-LD: LocalBusiness/WebSite on homepage, Product/Breadcrumb on products
c2b8de1 Page the sitemap, filter hidden products, disallow filter URLs in robots
0ac0363 Add canonicals, noindex on filtered views, and richer product metadata
588cb67 Centralize business facts in lib/site.ts
```
