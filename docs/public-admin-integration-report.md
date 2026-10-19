# Public Site ↔ Admin Integration — Audit Report

Date: 2026-10-12
Branch audited: `feat/search-console` (clean, matches `origin`)

## 0. Headline finding

The task brief assumed a **separate admin application** still needs to be integrated with
this public website, via a `feat/admin-app` branch, a pending-integration doc, and an
`/api/revalidate` HTTP endpoint. None of that exists, and none of it is needed:

- There is no `feat/admin-app` branch, locally or on `origin`. Branches present:
  `main`, `feat/search-console` (current), `feat/seo`, `feat/catalogue-curation`,
  `feat/source-pdf-upload`, plus `origin/homepage-build`.
- There is no `docs/admin-integration-pending.md` anywhere in history.
- There is no `/api/revalidate` route in the codebase. The production 404 for that path
  is **correct and expected** — the route was never built, not a regression.

**The admin app already lives inside this same Next.js project**, under `app/admin/`, and
was merged into `main` long ago (see commits `47a3d4d`, `c09a875`, `b9fb960`). It runs in
the same deployment, same process, same Supabase project as the public site. Because of
that, there is no network boundary between "admin changes" and "public pages" — admin
mutations are Next.js Server Actions that call `revalidatePath()` directly, in-process,
immediately after writing to Supabase. An HTTP revalidate endpoint would be solving a
problem this architecture doesn't have.

If a genuinely separate admin app (different repo/deploy) is the actual goal, that is a
larger architectural change than "wire up revalidation" — see §6.

## 1. Database schema & storage (as currently deployed)

Supabase project: `https://gvwaqvdhranchtzfgfiu.supabase.co` (single project, confirmed —
did not create or touch any other project).

Migrations (`supabase/migrations/`, applied in order):
1. `20260815120000_create_enquiries_table.sql`
2. `20260815193000_create_products_tables.sql`
3. `20260816154500_rebuild_catalogue_schema.sql`
4. `20260818200000_add_pricing_categories_catalogues_admin_auth.sql`
5. `20261011160000_catalogue_curation_filters_and_source_pdfs.sql`

Tables:
- `products` — free-text `category` (not an enum, by design), optional `price`/`price_unit`/`price_note`,
  normalized filter columns (`application`, `rooms[]`, `pattern`, `thickness`, `series`, `finish_detail`)
  with legacy fallbacks (`application ?? wall_or_floor`, `series ?? collection`) handled in
  `lib/products/queries.ts` so old rows keep working post-migration.
- `product_images` — `image_url`, `sort_order`; no `alt` column (alt text is derived at
  render time in `lib/products/alt.ts`).
- `categories` — admin-curated lookup table, matched to `products.category` by name;
  RLS: public `select` only where `is_visible = true`.
- `catalogues` — PDF lookbooks, RLS: public `select` only where `is_visible = true`.
- `source_pdfs` — backing table for per-product "sourced from this PDF/page" attribution.
- `admin_auth` — single bcrypt-hashed credential row, no public RLS policy at all (service-role only).
- `enquiries` — contact form submissions.

Storage buckets referenced in code: a product-image bucket (`STORAGE_BUCKET`, WebP pipeline
in `lib/admin/imageUpload.ts`) and a catalogue-PDF bucket (`CATALOGUE_STORAGE_BUCKET`,
`lib/admin/catalogues.ts`). Both are read publicly via `getPublicUrl()`; `next.config.ts`
whitelists `gvwaqvdhranchtzfgfiu.supabase.co/storage/v1/object/public/**` for `next/image`.
I did not open the Supabase dashboard to confirm bucket public/private flags — see §7.

Two Supabase clients, cleanly separated by trust level:
- `lib/supabase/server.ts` — publishable key, returns `null` if unconfigured, used by all
  public-facing reads (respects RLS).
- `lib/supabase/admin.ts` — secret key, bypasses RLS, throws if unconfigured, only ever
  imported from server-only code gated behind the admin session check (`lib/admin/session.ts`
  + `proxy.ts`).

## 2. How the public site reads catalogue data

- `lib/products/queries.ts` — `getProducts`, `getFilterFacets`, `getProductBySlug`,
  `getRelatedProducts`. All filtering/pagination is server-side (PostgREST `.in()`, `.or()`,
  `.overlaps()`), never done by slicing an already-fetched array. Falls back to
  `lib/products/mockProducts.ts` when Supabase env vars are absent, so the site never 500s
  in an unconfigured environment.
- `lib/catalogues/queries.ts` — `getVisibleCatalogues`, swallows errors and returns `[]`
  rather than throwing, so a catalogue-feature outage never takes down the homepage.
- Product/category pages (`app/products`, `app/products/[slug]`, `app/collections/[slug]`)
  are server-rendered (`ƒ` dynamic in the build output above) — they query Supabase on
  every request, they are not statically cached pages that would need invalidating.
  `app/collections/[slug]` pre-renders a few known slugs via `generateStaticParams` (`●` SSG)
  for the top-level collection names only.

## 3. How admin changes reach the public site today

Every admin mutation is a `"use server"` Server Action that, after writing to Supabase,
calls `revalidatePath()` **in the same process**, synchronously, before returning:

- `lib/admin/products.ts` → `revalidatePath("/admin")`, `/products`, `/products/[slug]`
- `lib/admin/categories.ts` → `/admin/categories`, `/products`
- `lib/admin/catalogues.ts` → `/admin/catalogues`, `/`
- `lib/admin/importActions.ts` → `/admin`, `/products`

This is the correct, secure pattern for a same-deployment admin: `revalidatePath` can only
be called from server-side code already running inside the authenticated request, so there
is no "who is allowed to call this" question to answer — the admin session gate in
`proxy.ts` + `lib/admin/session.ts` (HMAC-signed cookie, `ADMIN_SESSION_SECRET`) already
covers it. An HTTP `/api/revalidate` endpoint would need its *own* separate authentication
scheme (e.g. a shared secret header) purely to re-answer a question `revalidatePath` already
answers for free in-process. I did not add one, because nothing in this codebase calls out
to it and doing so would be unused surface area — see §6 for when it would become necessary.

## 4. Files changed this session

None. No code changes were made — the audit found the integration already complete and
working (tsc/lint/build all pass, see §5). No PR, no commit, no push.

## 5. Checks run

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | ✅ clean, no errors |
| Lint | `npm run lint` | ✅ clean, no warnings/errors |
| Production build | `npm run build` | ✅ succeeded, all 22 routes compiled (Turbopack) |
| Prod revalidate probe | `curl -I https://www.guptainterior.in/api/revalidate` | 404 — expected, route doesn't exist in code |
| Prod admin probe | `curl -I https://www.guptainterior.in/admin` | 307 (redirect, presumably to `/admin/login`) |

No database writes, migrations, or admin-account operations were performed against the
production Supabase project.

## 6. Required environment variables (names only)

Already in `.env.local.example`, all currently used by exactly this merged app — no new
variables are required for current functionality:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `ADMIN_PASSWORD` (legacy fallback only, real credential is DB-backed)
- `ADMIN_SESSION_SECRET`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`, `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

If a **separate** admin deployment is later introduced (see §7), it would additionally need
a shared revalidation secret, e.g. `REVALIDATE_SECRET`, consumed by a new `/api/revalidate`
route on the public site and sent as a header/query param by the admin app. Not needed today.

## 7. Remaining blockers / things only you can check

1. **Supabase Storage bucket policy** — I cannot access the Supabase dashboard from here.
   Please confirm in Project Settings → Storage that the product-image bucket and the
   catalogue-PDF bucket are both set to the intended public/private mode, and that their
   bucket names match `STORAGE_BUCKET` / `CATALOGUE_STORAGE_BUCKET` in `lib/admin/*.ts`.
2. **Intent check** — the task brief describes a *separate* admin application that needs
   integrating. That does not match what's in this repo (admin is already merged into
   `main` and has been for months, per git history). Before I build anything further,
   please confirm: is there actually a second, separate admin codebase on "Laptop 2" that
   isn't in this Git remote at all? If so, I need to see that repo before I can say
   anything concrete about integrating it (its own Supabase client config, its own auth,
   whether it expects to call an HTTP revalidate endpoint). If not — if the existing
   `app/admin/` in this repo *is* "the admin app" — then no further integration work is
   required; it already reads/writes the real production database and already revalidates
   the public pages correctly.
3. **No `/api/revalidate` was added.** Per §3, the current single-deployment architecture
   doesn't need it. I did not build it speculatively because an unauthenticated or
   under-specified revalidate endpoint is itself a risk (cache-poisoning / DoS vector via
   path revalidation spam) — if Laptop 2 turns out to be a genuinely separate deployment,
   tell me and I'll scope that endpoint properly (shared-secret header, allow-listed paths
   only, rate limiting) before writing it.

## 8. Explicit non-actions (per safety rules)

- Did not create a second Supabase project.
- Did not run any production migration, write, or delete against Supabase.
- Did not create an admin account or change `admin_auth`.
- Did not merge to `main` or deploy.
- Did not open or rely on an already-logged-in Supabase dashboard session.
- Did not print or persist any secret values — only variable *names* appear in this report.
