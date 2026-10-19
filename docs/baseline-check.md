# Baseline check — before admin integration

Date: 2026-10-19
Branch: `feat/admin-integration` (created from `main` @ `18cda4a`)

## Root build/lint/typecheck

- `npx tsc --noEmit` — **pass**, no errors.
- `npm run lint` (eslint) — **pass**, no errors.
- `npm run build` (`next build`, Turbopack) — **pass**.

Note: the untracked `admin panel/` clone sits inside this repo's working
directory and was being picked up by the root `tsc`/`eslint` globs (it has its
own, unrelated type errors). Added `"admin panel"` to `tsconfig.json`'s
`exclude` and to `eslint.config.mjs`'s `globalIgnores` so the root checks only
cover the tracked site. These two edits are the only changes made in Stage 1.

### Route output from `next build`

```
○ /
○ /_not-found
ƒ /admin
ƒ /admin/catalogues
ƒ /admin/catalogues/[id]
ƒ /admin/catalogues/new
ƒ /admin/categories
ƒ /admin/categories/[id]
ƒ /admin/categories/new
○ /admin/import
○ /admin/login
ƒ /admin/products/[id]
○ /admin/products/new
ƒ /admin/settings
ƒ /api/admin/import-image
○ /collections
  /collections/[slug] (●: wall-tiles, floor-tiles, porcelain-tiles, +2 more)
○ /contact
○ /opengraph-image
ƒ /products
ƒ /products/[slug]
○ /robots.txt
○ /sitemap.xml
ƒ /tiles
○ /visualizer
ƒ Proxy (Middleware)
```

## Local route status codes (`next start`, port 3000)

| Route | Status |
|---|---|
| `/` | 200 |
| `/products` | 200 |
| `/products?page=2` | 200 |
| `/products?application=Wall` | 200 |
| `/products/12x18-d-r-tiles-1-amber-201` | 200 |
| `/tiles` | 200 |
| `/collections` | 200 |
| `/contact` | 200 |
| `/visualizer` | 200 |
| `/sitemap.xml` | 200 |
| `/robots.txt` | 200 |
| `/admin` | 307 → `/admin/login` (expected, proxy.ts gating) |
| `/admin/login` | 200 |

No errors in the `next start` server log.

## Live site (`https://www.guptainterior.in`)

Identical status codes to local for every route above (curl -I), including the
`/admin` → 307 redirect. Live and local match exactly.

## Database check (read-only, publishable key only)

| Table | Count |
|---|---|
| products | 548 |
| product_images | 1508 |
| categories | 0 |
| catalogues | 0 |
| enquiries | 0 (expected — RLS blocks anon read on write-only table) |
| source_pdfs | 6 |

- Products with no image: **0** (checked all 548).
- Duplicate slugs: **0** (checked all 548).
- `categories` / `catalogues` tables are genuinely empty — confirmed in code
  (`lib/collections.ts`) that this is intentional: the live schema dropped the
  old category enum, and collection/filter pages are built from the
  `application` and `finish` columns instead. This is documented behavior, not
  a bug.
- Filter facets (`application`, `finish` columns) return real, non-empty
  distinct values:
  - `application`: Wall (63) — only one populated value; most rows leave this
    blank, consistent with `lib/collections.ts`'s own note that application/
    finish are "consistently populated across a large share" but not all.
  - `finish`: Glossy (197), Carving (36), Matt (13), Satin (11), Matte (7).
- Image URL spot check: 60 URLs sampled evenly across the full 1508-row
  `product_images` table — **all returned HTTP 200**.
- Most recent curation batch (107 products created 2026-10-11): all image URLs
  for all of them — **all returned HTTP 200**.

## Responsive / console check (headless browser)

- 375px (mobile): correct responsive layout — hamburger nav, no horizontal
  overflow, no broken images, **no console errors**.
- 768 / 1280 / 1920: no console errors observed on the pages loaded, but the
  browser-automation tool's window-resize call only reliably applied once in
  this session (subsequent resizes did not change the captured viewport, so
  these three could not be visually re-confirmed independently this run).
  Recommend a manual spot-check of tablet/desktop breakpoints if that
  matters before relying on this baseline.

## Problems found

None that block proceeding. Two minor, pre-existing observations (not
introduced by this task, not fixed per Stage 1 instructions — "don't fix
public-site issues unless tiny and clearly broken"):

1. `application` facet is sparse (only "Wall" populated; most products leave
   it blank) — likely a data-curation gap, not a code bug.
2. Responsive verification above 375px wasn't independently re-confirmed this
   run due to a browser-tool resize quirk — worth a quick manual check later.
