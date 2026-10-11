# Search Console Prep — Production Verification & Baseline

Checked live against `https://guptainterior.in` on 2026-10-11. Read-only — no production code or data was changed.

## 🚨 Critical issue found: `NEXT_PUBLIC_SITE_URL` is not set on Vercel

Every URL in production's `sitemap.xml`, `robots.txt`'s `Sitemap:` line, and every page's `<link rel="canonical">` currently reads `http://localhost:3000...` instead of the real domain. This means:

- Google cannot discover or canonicalize any real page from the sitemap (all 559 `<loc>` entries point at localhost)
- Every page's self-declared canonical is wrong, which actively discourages indexing of the real URL
- `robots.txt`'s sitemap pointer is broken

**Fix:** set `NEXT_PUBLIC_SITE_URL` in the Vercel project's Environment Variables (Production) to the real serving host — see the host-canonicalization finding below for which host that should be — then redeploy. This is a Vercel dashboard change, not a code change, and is **not something I can do from here**; flagging as the top-priority manual step before Search Console submission.

**Status: fixed in this PR (feat/search-console).** `lib/site.ts` now falls back to `https://www.guptainterior.in` (not localhost) when `NEXT_PUBLIC_SITE_URL` is unset, and the production build now fails loudly if the resolved site URL ever contains `localhost`. The user is setting `NEXT_PUBLIC_SITE_URL=https://www.guptainterior.in` in Vercel and redeploying separately — this record is kept as-is to document what was found.

## 🚨 Host canonicalization is inconsistent with the `www`-less assumption

```
http://guptainterior.in            → 308 → https://guptainterior.in/
https://guptainterior.in (apex)    → 308 → https://www.guptainterior.in/   ← serves nothing itself
http://www.guptainterior.in        → 308 → https://www.guptainterior.in/
https://www.guptainterior.in       → 200 (this is what actually serves the site)
```

The site's real canonical host is **`www.guptainterior.in`**, not the bare `guptainterior.in` that `lib/site.ts`/`SITE_URL` assumed throughout the prior SEO work. `NEXT_PUBLIC_SITE_URL` must be set to `https://www.guptainterior.in` (with `www`) to match what Vercel actually serves — otherwise canonicals will point at a URL that itself redirects, which is valid but wasteful and inconsistent with the sitemap. Alternatively, reconfigure Vercel's domain settings to make the bare apex the primary domain and redirect `www` → apex instead, if that's the preferred host. Either is fine; they just need to match. **This needs a decision from you, then a Vercel config/env change.**

**Status: fixed in this PR.** `www.guptainterior.in` is now the production fallback in `lib/site.ts`, matching the host confirmed above.

## Task 1 — Page-by-page verification table

All canonical values below show the `localhost` bug; everything else (titles, descriptions, robots, h1 count, schema types) is otherwise correct.

| URL | Status | Title | Canonical | Robots | H1 | Schema types | Problems |
|---|---|---|---|---|---|---|---|
| `/` | 200 | Gupta Interior \| Architectural Surfaces | `http://localhost:3000` ❌ | (default) | 1 | HomeAndConstructionBusiness, WebSite | canonical host wrong |
| `/products` | 200 | Tile & Marble Catalogue in Delhi \| Gupta Interior | `http://localhost:3000/products` ❌ | index, follow | 1 | — | canonical host wrong |
| `/contact` | 200 | Contact Us – Showroom in Mangolpur Kalan, Delhi \| Gupta Interior | `http://localhost:3000/contact` ❌ | (default) | 1 | — | canonical host wrong |
| `/collections/wall-tiles` | 200 | Wall Tiles in Delhi \| Gupta Interior | `http://localhost:3000/collections/wall-tiles` ❌ | (default) | 1 | CollectionPage, BreadcrumbList, FAQPage | canonical host wrong |
| `/collections/floor-tiles` | 200 | Floor Tiles in Delhi \| Gupta Interior | `http://localhost:3000/collections/floor-tiles` ❌ | (default) | 1 | CollectionPage, BreadcrumbList, FAQPage | canonical host wrong |
| `/collections/porcelain-tiles` | 200 | Porcelain Tiles in Delhi \| Gupta Interior | `http://localhost:3000/collections/porcelain-tiles` ❌ | (default) | 1 | CollectionPage, BreadcrumbList, FAQPage | canonical host wrong |
| `/collections/glossy-finish-tiles` | 200 | Glossy Finish Tiles in Delhi \| Gupta Interior | `http://localhost:3000/collections/glossy-finish-tiles` ❌ | (default) | 1 | CollectionPage, BreadcrumbList, FAQPage | canonical host wrong |
| `/collections/matt-finish-tiles` | 200 | Matt Finish Tiles in Delhi \| Gupta Interior | `http://localhost:3000/collections/matt-finish-tiles` ❌ | (default) | 1 | CollectionPage, BreadcrumbList, FAQPage | canonical host wrong |
| `/products/1004-600x1200mm` | 200 | 1004 – 600x1200mm, Glossy \| Delhi \| Gupta Interior | `http://localhost:3000/products/1004-600x1200mm` ❌ | (default) | 1 | Product, BreadcrumbList | canonical host wrong |
| `/products/12x18-d-r-tiles-1-amber-201` | 200 | AMBER 201 – 12x18 \| Delhi \| Gupta Interior | `http://localhost:3000/products/...` ❌ | (default) | 1 | Product, BreadcrumbList | canonical host wrong |
| `/products/12x18-d-r-tiles-1-amber-202` | 200 | AMBER 202 – 12x18 \| Delhi \| Gupta Interior | `http://localhost:3000/products/...` ❌ | (default) | 1 | Product, BreadcrumbList | canonical host wrong |
| `/products?q=abc` (search) | 200 | (same as /products) | `http://localhost:3000/products` ❌ | **noindex, follow** ✅ | 1 | — | canonical host wrong |
| `/products?page=2` | 200 | (same as /products) | `http://localhost:3000/products` ❌ | **noindex, follow** ✅ | 1 | — | canonical host wrong |

**No `aggregateRating`, `review`, or `offers` fields found in any JSON-LD block on any page** — confirmed clean, no regression from the merged SEO work.

**Note on the originally-specified `/products?search=abc`:** the app's real query-string key for search is `q` (see `FILTER_KEYS` / `CatalogueBrowser`), not `search`. `?search=abc` is simply an unrecognized param the app ignores, so that URL correctly renders as the plain indexable `/products` page (`index, follow`) — that is expected behavior, not a bug. Tested `?q=abc` instead to confirm the real noindex path, and it correctly returns `noindex, follow` with canonical `.../products`.

## sitemap.xml / robots.txt

- `sitemap.xml`: 559 `<loc>` entries — count is correct (4 static + 5 collections + `/collections` index + `/contact` + 548 visible products), **but every single one uses `http://localhost:3000`** instead of the production host.
- `robots.txt`: disallow rules correct (`/admin/`, `/products?*`, `/tiles?*`) but `Sitemap: http://localhost:3000/sitemap.xml` is also broken.
- No hidden/unapproved products detected in the list (consistent with the `is_visible` filter added in the prior merge) — can't fully cross-check against the admin panel's hidden set from outside, but the count matches expectations and nothing looked obviously out of place.

## Task 3 — PageSpeed Insights baseline: **could not run**

The public PageSpeed Insights API (`pagespeedonline.googleapis.com`) returned `429 RESOURCE_EXHAUSTED` with `quota_limit_value: "0"` for every request from this environment — this isn't a transient rate limit, the unauthenticated/no-API-key quota available here is zero. I did not fabricate scores.

**Test these manually at https://pagespeed.web.dev (mobile) once the `NEXT_PUBLIC_SITE_URL`/host issue above is fixed and redeployed** (testing now would measure the broken-canonical state):
- `https://www.guptainterior.in/`
- `https://www.guptainterior.in/products`
- `https://www.guptainterior.in/collections/wall-tiles`
- `https://www.guptainterior.in/products/1004-600x1200mm`

When you run these, specifically check the **LCP element** on the homepage (mobile) — the prior SEO work (Phase 7) made the 3D hero `next/dynamic({ssr:false})` and added a static poster-image fallback on mobile/reduced-motion, but that was verified by build/chunk inspection only (no Chrome available in that sandbox either) — this will be the first real confirmation of which element Lighthouse reports as LCP in production.

## Prioritized issue list

1. **Set `NEXT_PUBLIC_SITE_URL=https://www.guptainterior.in` in Vercel Production env vars and redeploy.** Blocks correct sitemap, robots.txt, and every canonical tag — this must be fixed before Search Console submission, otherwise you'd be submitting a sitemap full of localhost URLs.
2. **Decide the canonical host** (`www.guptainterior.in` vs bare `guptainterior.in`) and make Vercel's domain redirect config match — currently apex→www is enforced at the Vercel edge, so `www` is the only one you should use in `NEXT_PUBLIC_SITE_URL` unless you reconfigure Vercel to flip it.
3. Once (1) and (2) are fixed and redeployed, re-run Task 1's curl checks to confirm all canonicals/sitemap/robots now show the real host, then submit the sitemap in Search Console.
4. Run PageSpeed Insights manually (links above) post-fix to get a real mobile performance/SEO/accessibility/best-practices baseline, including confirming the LCP element on `/`.
5. (Already done, no action needed) `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` support added to `app/layout.tsx` — paste your Search Console HTML-tag token into that Vercel env var whenever you're ready to verify ownership; no further code change needed.

## Task 2 — Search Console verification meta tag

Added `metadata.verification.google` to `app/layout.tsx`, reading `process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`. Confirmed via a local build (env var unset, matching current `.env.local`) that **zero** `google-site-verification` meta tags render anywhere in the build output when the variable is empty — Next.js's Metadata API drops `undefined` keys automatically, no extra conditional needed. Documented the variable in `.env.local.example` with instructions for where to get the token from Search Console's HTML-tag verification method. No token was hardcoded; Vercel env vars were not touched.
