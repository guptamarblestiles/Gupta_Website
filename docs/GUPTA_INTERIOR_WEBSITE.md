# Gupta Interior — Complete Website Document

_Master reference for the whole project: what exists, how it works, what was done, what is pending, and the plan for the admin panel. Last updated: 14 Oct 2026._

> Status labels used throughout: **[LIVE]** on production, **[MERGED]** on `main`, **[BRANCH]** built but not merged, **[PLANNED]** not started, **[OPEN]** needs an owner decision.
> Anything marked "unverified" was reported by Claude Code or inferred from code and has not been independently confirmed on the live site.

---

## 1. Project at a glance

| Item | Value |
|---|---|
| Business | Gupta Interior — marble, tile and interior-materials dealer, Delhi NCR |
| Live site | https://www.guptainterior.in/ |
| Repo | `guptamarblestiles/Gupta_Website` (GitHub) |
| Local folder (only allowed folder) | `/Users/rakshitdahiya2.0/Desktop/projects/Gupta_Website` |
| Deploy | Vercel (production deploys from `main`; branch pushes get preview URLs) |
| Stack | Next.js 16.3 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, framer-motion 13, React Three Fiber + drei + three, Supabase (Postgres + Storage), zod, sharp, bcryptjs, nodemailer / EmailJS |
| Catalogue size | ~548 products (107 curated tiles added on top of 441 older ones), ~271 images for the new items |
| Business details | Shop No. B-114, Mangolpur Kalan, Pathar Market, Delhi 110085 · 97119 44187 · guptamarblestiles@gmail.com · Mon–Sat 10:00–18:00, closed Sundays · Area served: Delhi NCR (single source of truth: `lib/site.ts`) |
| Owner of decisions | Nik (builder) with the shop owner for business facts |

**Important rule from AGENTS.md:** this is Next.js 16 with breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing code; note `middleware.ts` is now `proxy.ts`.

### Roles and working method

- **Cowork (Claude)**: investigation, image preparation, writing prompts, project docs, verification of screenshots.
- **Claude Code in VS Code**: all code changes, git, deploys.
- **Rule**: every Claude Code prompt must restate all earlier standing requirements (past regressions happened when they were dropped). No new folders unless asked. Never delete user files without permission. Do not commit/push/deploy unless asked.

---

## 2. Brand and design system

### Naming
- Visible brand in code: **Gupta Interior** (`SITE_NAME` in `lib/site.ts`).
- **[OPEN]** Owner has not confirmed "Gupta Interior" vs "Gupta Marbles & Tiles". The old master prompt in the project says "D R Traders"; that is stale. The real site is Gupta Interior.

### Typography
- Body/UI: **Inter**. Display headings: **Playfair Display**. Self-hosted through `@fontsource` (no Google Fonts CDN).
- Brand wordmark in the navbar: switchable via `?brand=1|2|3` (default Marcellus; alternatives Cinzel and Cormorant Garamond are installed). **[OPEN]** final pick not confirmed; once chosen, remove the switch and the unused fonts.
- Tailwind tokens used everywhere: `text-display`, `font-display`, `text-label`, `bg-surface-variant` etc. (defined in `app/globals.css` `@theme`).
- Gotcha: `cn()` in `lib/utils/cn.ts` uses `extendTailwindMerge` so custom colour and size tokens do not silently drop each other. Re-verify visually if tokens are renamed.

### Look and feel
- Minimal, classy, editorial. Warm cream/beige surfaces, near-black text, gold/copper accent (`#b87333` family), generous spacing, large rounded image tiles where used.
- Motion: slow and purposeful. framer-motion `whileInView`, `useScroll`/`useTransform`, always respecting `useReducedMotion`. Easing `[0.22, 1, 0.36, 1]`.
- Avoid: generic SaaS look, excessive glass/shadows, bouncy motion, dense layouts, white card boxes behind text (the owner explicitly disliked these).

### Imagery
- All local images are WebP, long edge ≤ 2000px, stored under `public/images/...`.
- Originals (Pexels JPGs) are kept out of `public/` in `assets-source/applications-originals/`.
- Credits file: `public/images/applications/CREDITS.md` (needs rows for the newest photos).
- Image source rule: free-licence Pexels; real photos of real interiors showing marble/tile; no stock that misrepresents the product.

---

## 3. Site map and routes

### Public

| Route | Purpose |
|---|---|
| `/` | Homepage (sections in §4) |
| `/products` | Catalogue with filters, search, pagination (server-side) |
| `/products/[slug]` | Product detail: gallery, spec table, enquiry form, sticky enquire bar, Download Resources, related products |
| `/tiles` | Tiles listing (target for the "Explore"/"View Tiles" links) |
| `/collections`, `/collections/[slug]` | Category collections (top slugs pre-rendered) |
| `/contact` | Contact page + enquiry |
| `/visualizer` | Room tile visualizer (homography-based canvas tool) |
| `/sitemap.xml`, `/robots.txt`, `opengraph-image` | SEO endpoints |
| `not-found` | Custom 404 |

### Admin (same deployment)

| Route | Purpose |
|---|---|
| `/admin/login` | Password login (bcrypt hash in DB) |
| `/admin` | Dashboard |
| `/admin/products`, `/new`, `/[id]` | Add, edit, delete products |
| `/admin/categories`, `/new`, `/[id]` | Manage categories |
| `/admin/catalogues`, `/new`, `/[id]` | Manage PDF lookbooks |
| `/admin/import` | Bulk import review grid |
| `/admin/settings` | Change admin password |
| `/api/admin/import-image` | Image import endpoint |

Access control: `proxy.ts` gates every `/admin/*` route except login, using an HMAC-signed session cookie (`ADMIN_SESSION_SECRET`).

---

## 4. Homepage — section by section

Current order in `app/page.tsx`:

1. **Navbar** — transparent over hero; **hides on scroll down after the hero and returns when scrolling up**; brand wordmark with switchable font.
2. **HeroSection** — video background (`HeroVideoBackground`), headline and CTA. The scroll-to-explore indicator was **removed** at the owner's request.
3. **SpacesSection** — "Surfaces for Every Room, Made to Last." with subtitle "Marble and tile for the places you live, host and unwind in." Three space cards with captions and Explore links.
4. **BusinessOverview** ("Who we are") — full-bleed image that zooms/grows with scroll, anchored to the bottom, opacity lowered so the front text stays legible. Two text layers. **No white card, no "From quarry to craftsmanship" section** (both were explicitly removed and must not come back).
5. **WhatWeDealIn** — horizontal marquee strip listing what the shop sells. List lives in `lib/what-we-deal-in.ts`. Confirmed items: Tiles, Marble, Bathware. **[OPEN]** the rest (Sanitaryware, Faucets & Fittings, Wall Cladding, Flooring, Kitchen Sinks, Lighting, Hardware) are placeholders until the owner confirms.
6. **ApplicationsTiles** — numbered editorial rows 01 Homes, 02 Buildings, 03 Hospitality, each with a main image and an overlapping secondary image, followed by `ApplicationsCollage` (five photos fly in from different directions into a fixed-ratio collage using absolute percentages and `overflow-x: clip`).
7. **Highlights** — bento grid: four independent columns, each with one image tile and one text tile, alternating image-top / text-top like the "Built On Trust" reference. Items: Premium Materials, Certified Quality, Custom Solutions, Expert Support. Tiles animate in from different directions. Latest rebuild (commit `1f84ef1`) made the grid compact so it fits a single screen. **Unverified** on the live site after the final rebuild: Nik's last screenshot showed an earlier, oversized version.
8. **CatalogueSection** — catalogue preview / PDF lookbooks (`CatalogueBrowser`, `CataloguePDFViewer`).
9. **ContactSection** — address, phone, WhatsApp, opening hours.
10. **TrustStats** and **CtaBand** — dark bookend sections.
11. **Footer** — business info, hours; social links hidden until real profiles exist.
- Testimonials section was **removed** (commit `21aacd4`).

### Content rules for claims
- "25+ years" is on the site already but **[OPEN]** needs owner confirmation.
- Do not invent statistics. The only provable number is the catalogue count from the database (~548).
- WhatsApp number and brand name need owner confirmation.

---

## 5. Catalogue, products and data

### Database (Supabase Postgres, one project)

Migrations in `supabase/migrations/` (applied in order):
1. `create_enquiries_table`
2. `create_products_tables`
3. `rebuild_catalogue_schema`
4. `add_pricing_categories_catalogues_admin_auth`
5. `catalogue_curation_filters_and_source_pdfs`

Tables:
- `products` — name, slug, category (free text, not an enum), finish, size, description, optional `price`/`price_unit`/`price_note`, normalized filter columns (`application`, `rooms[]`, `pattern`, `thickness`, `series`, `finish_detail`) with legacy fallbacks, `is_visible`, approval status.
- `product_images` — `image_url`, `sort_order` (alt text derived at render time in `lib/products/alt.ts`).
- `categories` — admin-curated; public select only where `is_visible = true`.
- `catalogues` — PDF lookbooks; same visibility rule.
- `source_pdfs` — which source PDF/page each product came from.
- `admin_auth` — single bcrypt row, service-role only (no public policy).
- `enquiries` — form submissions.

Storage: one bucket for product images (WebP pipeline in `lib/admin/imageUpload.ts`), one for catalogue PDFs. Public reads through `getPublicUrl()`; `next.config.ts` whitelists the Supabase storage host for `next/image`.

Clients: `lib/supabase/server.ts` (publishable key, respects RLS, returns null when unconfigured) and `lib/supabase/admin.ts` (secret key, bypasses RLS, server-only behind the admin session gate).

### Data-access layer
`lib/products/queries.ts` exposes `getProducts`, `getFilterFacets`, `getProductBySlug`, `getRelatedProducts`. All filtering and pagination happen in the database (never slice 548 rows on the client). Falls back to `lib/products/mockProducts.ts` when Supabase env vars are missing so builds never 500.

### Filters and search
- 9 normalized filters with live counts (category, finish, size, application, rooms, pattern, thickness, series, etc.).
- Debounced search over name, code, category, finish, size.
- `/products` and `/tiles` use `noindex, follow` plus canonical when any filter/search/page param is present.

### Catalogue curation (done, verified in Supabase)
- 107 curated tiles imported, all approved and visible. Products went 441 → 548, 271 new images, 0 items without an image, 0 duplicate slugs.
- Per source PDF: 11.pdf 11, Slim 20, 2x4 9, 600X1200 8, Catalogue_2026 43, Gupta 16.
- Import script: `scripts/import/importCurated.ts`. Non-code assets live outside the repo in `Desktop/projects/Gupta_Interior_Assets/` (see its `00_README.md`).

### Known data gaps
- `application` is only "Wall" or null; `rooms` only "Kitchen" for 5 products. There is **no per-space tag** (interior, exterior, washroom, lobby, hotel). Because of that the Spaces "Explore" and Applications "View tiles" links currently point to `/tiles` with `TODO` comments.
- 441 older products still need classification (KEEP / REVIEW / HIDE / DUPLICATE / INVALID, hide-only, never delete).
- Source PDFs not yet uploaded; `source_pdfs.file_url` unset (some files > 50 MB).

---

## 6. Enquiries and email

- `EnquiryForm` on product pages and contact page; validated with zod on client and server (`lib/enquiry/schema.ts`, `actions.ts`).
- Stored in the `enquiries` table; email notification through Gmail/nodemailer (`lib/enquiry/email.ts`) and EmailJS client (`emailjs.ts`).
- WhatsApp contact button and a sticky enquire bar on product pages.
- Env vars (names only): `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`, `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`.

---

## 7. SEO (checklist in `SEO_CHECKLIST.md`)

Done: single source of truth in `lib/site.ts`; unique titles/descriptions per page; canonicals; noindex on filtered URLs; product OG images from real photos; sitemap that pages through products in 1000-row chunks and respects `is_visible`; robots; JSON-LD (`HomeAndConstructionBusiness`, `WebSite`, products); visible opening hours; Search Console verification env var.

To do: fill `socialLinks[]` with real profiles; submit sitemap in Search Console; Google Business Profile; per-category landing copy; image alt review; Core Web Vitals pass after the final homepage.

---

## 8. Admin panel

### 8.1 What exists today (in the main repo, [MERGED])

A single-admin backend that lives **inside the same Next.js app** (`app/admin`), same deployment, same Supabase project. Every mutation is a Server Action that writes to Supabase and then calls `revalidatePath()` in-process, so the public site updates immediately. No separate revalidate API is needed (and none exists; the 404 on `/api/revalidate` is expected).

Capabilities now:
- Login with DB-backed bcrypt password; HMAC-signed session cookie; change password in Settings.
- Products: create, edit, delete (`ProductForm`, `DeleteProductButton`), image manager (`ImageManager`) with WebP conversion.
- Categories: create, edit, delete, visibility.
- Catalogues (PDF lookbooks): create, edit, delete, visibility.
- Bulk import: scan folder, classify, review grid, upload (`lib/import/*`, `ImportReviewGrid`).
- Pricing fields (price, unit, note) with `PriceDisplay` on the public side.

### 8.2 The in-progress admin ("admin panel" folder)

An untracked folder `admin panel/` sits in the repo root (the owner chose to keep it for now, along with `docs/`). It contains its own `app/`, `components/`, `lib/`, `supabase/`, `scripts/` and `node_modules`, i.e. a separate working copy. **Not audited by Cowork**; do not assume how it differs from `app/admin`. First task for the next admin session: diff it against `app/admin` and decide whether to merge the good parts or retire it.

### 8.3 Target feature set ("admin handles everything")

**Products**
- Add / edit / duplicate / archive / hide (soft-hide preferred over delete).
- Multi-image upload with drag-and-drop ordering, primary image, auto WebP + thumbnails, alt text field.
- All spec fields editable: name, code, category, series, finish, size, thickness, pattern, application, rooms/spaces, price + unit + note, description.
- Bulk actions: hide/show, change category, change finish, delete with typed confirmation.
- Duplicate detection (exact slug + perceptual image hash) before publishing.
- Draft → approved → published status flow.

**Space tagging (unblocks the filtered Explore links)**
- New `space` (or `spaces[]`) field: interior, exterior, washroom, lobby, kitchen, living, hotel/hospitality, commercial.
- Rule-based auto-suggestion from category/size/finish, then manual correction in a bulk tagging grid.
- Public filter plus links like `/tiles?space=washroom`.

**Homepage content control**
- Edit marquee items (`what-we-deal-in`), Highlights copy, Spaces cards/captions, business hours/phone/WhatsApp (move `lib/site.ts` facts into a `site_settings` table).
- Choose featured products and collection order.

**Enquiries inbox**
- List, filter by status (new / contacted / closed), notes, export CSV, link to the product enquired about.

**Catalogues / PDFs**
- Upload source PDFs (large-file support through direct-to-storage upload), set `source_pdfs.file_url`, show "sourced from page N".

**Safety and operations**
- Roles (owner, editor) instead of one shared password; login rate limiting; audit log (who changed what, when); soft delete and restore; confirmation on destructive actions.
- Backups: periodic Supabase export; image bucket mirrored.
- Rotate the Supabase secret key (see §10).

### 8.4 Suggested phases

1. **Audit and decide** — diff `admin panel/` vs `app/admin`; pick one codebase.
2. **Product CRUD hardening** — multi-image ordering, alt text, soft hide, bulk actions.
3. **Space tagging** — schema column, auto-suggest script, bulk tagging grid, public filter, wire the Explore links.
4. **Site settings** — move business info, marquee list, highlight copy to DB with admin forms.
5. **Enquiries inbox** — statuses, notes, export.
6. **Roles + audit log + rate limiting.**
7. **Source PDF upload and attribution UI.**
8. **QA** — permissions test, mobile admin, backup/restore drill.

---

## 9. Branches and git state

| Branch | State |
|---|---|
| `main` | Production. Latest: `18cda4a` "Merge feat/nav-hide-brand-font-about-bg into main" (includes navbar, About, marquee, Spaces, Applications, Highlights bento, Testimonials removal) |
| `feat/nav-hide-brand-font-about-bg` | Merged into main (can be deleted after tagging) |
| `feat/spaces-on-main`, `feat/spaces-section`, `feat/home-spaces-about` | Redundant; waiting for owner's "yes" to tag then delete |
| `feat/search-console` | Unmerged (Search Console verification/SEO work); decide after preview |
| `feat/source-pdf-upload` | Unmerged |
| `feat/homepage-redesign-v2` | Older redesign line |
| `origin/feat/admin-app` | Exists on remote; earlier audit reported it missing locally, confirm what it contains |

Untracked in the working tree: `admin panel/`, `docs/`, `_preview_tmp/` (temporary previews, must be deleted), plus some image files.

Commit attribution: end commit messages with the Co-Authored-By and Claude-Session lines supplied by the session reminder.

---

## 10. Environment variables and secrets

Names only (values live in `.env.local` and Vercel, never in the repo or chat):

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD` (legacy fallback), `ADMIN_SESSION_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`, `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

**Security to-dos**
- **Rotate the Supabase secret key** (it was pasted in chat once). Update `.env.local` and Vercel after rotating.
- Confirm Storage bucket public/private settings match intent and bucket names match `STORAGE_BUCKET` / `CATALOGUE_STORAGE_BUCKET`.
- Old archived frontends in `Gupta_Interior_Assets/` still contain their own `.git` and one `.env.local`; remove secrets there.

---

## 11. History: what has been done (chronological summary)

1. **Foundation (Aug 2026)** — originally scoped as "D R Traders" luxury catalogue with a master prompt (Next.js, Supabase, R3F hero, scroll transition). Built scaffold, tokens, navbar, 3D hero, scroll transition, mock catalogue shell. Later rebranded to Gupta Interior; migrated to a luxury/editorial design system (`238b06f`).
2. **Real catalogue** — 1,497-row legacy CSV and image pipeline discovered on an old branch; superseded by the curated Supabase catalogue (548 products live).
3. **Admin app** merged into main (single-deployment architecture confirmed by audit on 12 Oct).
4. **SEO phases 1–8** (`lib/site.ts`, metadata, sitemap, JSON-LD, noindex rules).
5. **Catalogue curation** (11 Oct): migration, 107 tiles, 9 filters, spec table, Download Resources.
6. **Homepage redesign (12–14 Oct)**:
   - navbar hide-on-scroll and brand-font options;
   - full-bleed About image; removed "From quarry to craftsmanship", the white card, the scroll indicator;
   - "what we deal in" marquee;
   - Spaces heading, captions, link fix;
   - Applications rebuilt as numbered rows + collage (fixed a broken all-`aspect-square` collage with absolute percentage layout);
   - overlapping secondary images for Buildings and Hospitality;
   - Highlights rebuilt as a bento grid (compact four-column version);
   - Testimonials removed;
   - all merged to `main` at `18cda4a`.

### Mistakes to not repeat
- Dropping earlier requirements from later prompts (caused the Spaces heading, "From quarry" and white card to reappear).
- Adding unrequested UI (white card, caption chips) — only build what was asked.
- Oversized tiles that do not fit a screen — check at 1280×720.

---

## 12. Open decisions and to-do list

**Needs the owner**
- [ ] Confirm brand name (Gupta Interior vs Gupta Marbles & Tiles).
- [ ] Choose the wordmark font (variants 1/2/3), then remove the switch.
- [ ] Confirm marquee items, "25+ years", WhatsApp number.
- [ ] Say yes to tag-then-delete of redundant branches.
- [ ] Decide on merging `feat/search-console` and `feat/source-pdf-upload`.
- [ ] Provide real social profile links.

**Engineering**
- [ ] Verify the live homepage: Spaces heading/links, collage, overlapping images, final Highlights bento at 1280×720 and mobile.
- [ ] Add CREDITS rows for the newest Pexels photos; delete `_preview_tmp/`.
- [ ] Space tagging project (§8.3) to enable filtered Explore/View-tiles links.
- [ ] Classify the 441 older products (hide-only).
- [ ] Upload source PDFs; set `source_pdfs.file_url`.
- [ ] Rotate Supabase secret key; audit bucket policies.
- [ ] Audit the `admin panel/` folder vs `app/admin`.
- [ ] Mobile QA pass on every homepage section; Lighthouse pass.
- [ ] Update project docs (`working-folder-rule.md`: main @ `18cda4a`, branch list; retire the stale D R Traders master prompt in project instructions).

---

## 13. How to work on this project (checklist for any future prompt)

1. Read `AGENTS.md` and the relevant Next 16 docs in `node_modules/next/dist/docs/`.
2. State all standing requirements in the prompt (no card behind About text, no "From quarry", no scroll indicator, tokens/fonts unchanged, no invented stats, no new folders).
3. Use real data only; no fake APIs or placeholder claims in production.
4. After changes: `npx tsc --noEmit`, `npm run lint`, `npm run build`; screenshot 375, 768, 1280×720, 1440, 1920; no horizontal scroll, no console errors.
5. Commit on a feature branch, push, review the Vercel preview, then merge to `main` only with the owner's approval.
