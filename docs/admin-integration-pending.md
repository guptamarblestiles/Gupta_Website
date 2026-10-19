# Admin ↔ production Supabase integration — pending items

Written while the laptop that holds the original Supabase project credentials
is unavailable. Contains **no secrets** — only what's safe to read in a repo.
Supersede this file (or delete it) once the admin app has been connected and
verified against production.

## 1. What's already implemented

The admin app (`admin/`) is a complete, separate Next.js app, already built
in this repo on branch `feat/admin-app` (not yet merged to `main`):

- Supabase Auth (email+password) sign-in, `proxy.ts` middleware gate +
  per-request DB role check (`admin/lib/auth.ts`) + RLS as the final
  enforcement layer — three independent layers, none of them UI-only.
- Full CRUD UI for products, categories, filters/collections, PDF library,
  images, homepage catalogues, enquiries, team/roles, activity log.
- A browser-side PDF→product importer (pdf.js + OCR) that creates
  `pdf_import_candidates` rows for review before any product is created.
- A migration, `supabase/migrations/20261012090000_admin_app_roles_status_audit.sql`
  (725 lines), that adds everything the admin app needs — roles, `status`,
  audit log, RLS policies, storage write policies — additively, with no
  destructive change to any existing table, column, or row.
- A local demo mode (`ADMIN_DEMO=1`) that runs the entire UI against an
  in-memory fake Supabase client — no network, no real writes — useful for
  reviewing the app with nothing configured.
- A test suite (`admin/tests`, `npm test`) that runs the **real migration
  SQL** against an in-memory Postgres (`@electric-sql/pglite`) and asserts
  the RLS/role/trigger behavior: 63 tests, all passing, covering role
  permissions, publish-blocks-without-image, audit-log tamper-resistance,
  storage policies, PDF dedup, and the import-merge rules.
- Env/config plumbing (`admin/lib/env.ts`, `admin/lib/supabase/*`) that
  degrades gracefully to "not configured" rather than crashing when env
  vars are absent — verified by a clean production build with no env vars
  set at all.

## 2. Supabase project reference — verified, not guessed

No `.env.local` exists anywhere in this repo (by design — see `.gitignore`),
and no Supabase CLI link (`supabase/.temp`) is present locally. However, the
**project's hostname is independently confirmed from the live public
website**, not from any local guess:

- `next.config.ts` (committed, used in production) whitelists
  `gvwaqvdhranchtzfgfiu.supabase.co` for `next/image`.
- Fetching `https://www.guptainterior.in/` right now (2026-10-12) returns
  real product `<img>` src URLs on that exact same hostname, e.g.
  `https://gvwaqvdhranchtzfgfiu.supabase.co/storage/v1/object/public/tiles/2x4-glossy-d-m-roman-white/image-0.webp`.

So: **`NEXT_PUBLIC_SUPABASE_URL = https://gvwaqvdhranchtzfgfiu.supabase.co`**
is the real, live production project — confirmed by observing the live site,
not assumed. This is a public hostname, not a secret.

The **publishable (anon) key** is not derivable this way and is not present
anywhere in the repo or build output. It must come from the other laptop or
from Supabase Studio (Project Settings → API Keys) once you can sign in to
the Supabase dashboard for this project.

## 3. Schema — what's verified vs. what's only local history

The public site is demonstrably reading from `products` / `product_images`
right now (live images render). Based on migration history in
`supabase/migrations/`, the following are **very likely live** because the
public site's current behavior depends on them:

| Table | Likely live? | Why |
|---|---|---|
| `products`, `product_images` | Yes | Public site renders real products/images from them today. |
| `categories`, `catalogues` | Probably | Public site has a homepage Catalogues section and category pages that depend on this migration's columns. |
| `source_pdfs`, `products.source_page`/`source_pdf_id`, filter columns (`application`, `rooms`, `pattern`, `thickness`, `series`, …) | Probably | The live site's filter sidebar and PDF download links (per `admin/README.md`) depend on `20261011160000`. |
| `enquiries` | Unknown | That migration's own comment says it was "written to be applied later... once real project credentials exist — NOT applied automatically." Whether it was ever actually run is unverified. |
| `admin_auth` (legacy root `/admin` password table) | Unknown | Used by the old in-repo `/admin` route; may or may not have been seeded/applied. |
| `admin_users`, `products.status`, `pdf_import_candidates`, `audit_log`, admin RPCs, admin storage policies (`20261012090000`) | **No — not yet applied** | This migration was written in the same commit that created the admin app (`1a261fa`, this session's starting point) and `admin/README.md` itself says to apply it "deliberately," implying it hasn't been run yet. |

**Nothing here is invented** — every column/table name above is copied
verbatim from the migration files already in this repo; none were guessed.

## 4. Configuration already completed (this session)

- No code changes were needed to point the admin app at the right project —
  it already reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  / `SUPABASE_SECRET_KEY` from env, exactly matching the public site's
  convention, and `admin/next.config.ts` even derives its image remote
  pattern from the same `NEXT_PUBLIC_SUPABASE_URL` rather than hardcoding it.
- Confirmed `.gitignore` in both the repo root and `admin/` excludes all
  `.env*` files except the checked-in `.example` templates — no risk of a
  real key being committed.
- Confirmed no service-role/secret key is referenced from any client
  component or `"use client"` file — `SUPABASE_SECRET_KEY` is only read in
  `admin/lib/supabase/service.ts` (server-only, used solely for
  `auth.admin` calls to create staff logins).
- Ran `npm run typecheck`, `npm run lint`, and `npm test` in `admin/` — all
  clean (0 errors, 63/63 tests passing). Ran `npm run build` in `admin/`
  with **no env vars set at all** — succeeded, confirming the app never
  hard-crashes when unconfigured.
- Ran `tsc --noEmit` and `npm run lint` on the root public site — both clean.

## 5. Unknowns — needed from the other laptop (or Supabase dashboard access)

Non-secret information needed, in order of what unblocks the most:

1. **Confirm dashboard access** to the project at `gvwaqvdhranchtzfgfiu` (via
   supabase.com login, or an invite to the project if you don't have the
   original login).
2. **The publishable (anon) key** for that project (Project Settings → API
   Keys → "anon public" / "publishable"). Safe to paste into `.env.local`
   directly (not into chat), since RLS governs what it can do.
3. **Whether `20261011160000` and `20261012090000` have already been
   applied** (Database → Migrations, or just check
   `select to_regclass('public.admin_users')` in the SQL editor — null means
   not applied).
4. **Whether `enquiries` and `admin_auth` tables already exist** (same
   check) — needed to know if the legacy root `/admin` password flow and the
   enquiry form have ever actually worked against this project, or only
   locally.
5. A **service-role (secret) key**, needed once, only to run
   `admin/scripts/create-owner.ts` to create the first admin login — or,
   without that script, an owner can be created by hand in Supabase Studio
   per the steps in `admin/README.md` §5.
6. Confirmation of **Supabase Auth settings**: whether "Allow new users to
   sign up" is on (should be turned off for the admin app) and what
   Redirect URLs are currently configured.

## 6. Changes still required on the public website

- **`app/api/revalidate/route.ts` is not yet deployed to production.**
  `curl -X POST https://www.guptainterior.in/api/revalidate` returns
  **HTTP 404** — confirmed live twice now: 2026-10-12 (initial audit) and
  again at **2026-10-12 14:50 UTC** (this follow-up). The route exists only
  on the local `feat/admin-app` branch (added in commit `1a261fa`) and is
  absent from `origin/main`, which is what's presumably deployed. Until
  this branch (or at least this route) is merged and redeployed, admin
  changes will **not** auto-refresh the homepage's Catalogues section or
  `sitemap.xml` — they'll still show up on product/category pages (which
  read Supabase per-request) but the two statically-prerendered surfaces
  will stay stale until the next full deploy.
- `REVALIDATE_SECRET` needs to be set on the public site's Vercel project,
  matching `PUBLIC_REVALIDATE_SECRET` on the admin's Vercel project — neither
  is set anywhere yet (both absent locally, and nothing indicates they're
  set in Vercel either, though that can't be checked from this laptop).
- **Nothing to merge/deploy was done in this session** — this is a
  to-do, not a completed step. Merging `feat/admin-app` to `main` is a
  decision for you to make deliberately (it also carries the whole admin
  app and the big migration file), not something done automatically here.

## 7. How to check what's actually live, without risking anything

Two independent checks, neither of which writes anything:

**A. From Supabase Studio's SQL editor** (read-only `select`s — safe to run
as-is; they inspect schema, they don't change it):

```sql
-- Null means "table doesn't exist yet" for each one:
select to_regclass('public.admin_users');        -- from 20261012090000
select to_regclass('public.pdf_import_candidates'); -- from 20261012090000
select to_regclass('public.audit_log');           -- from 20261012090000
select to_regclass('public.enquiries');           -- from 20260815120000
select to_regclass('public.admin_auth');          -- from 20260818200000
select to_regclass('public.source_pdfs');         -- from 20261011160000

-- If admin_users exists, this shows whether status/column-level changes
-- from 20261012090000 landed on products too:
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'products'
  and column_name in ('status', 'archived_at', 'created_by', 'updated_by');
```

Supabase Studio's own **Database → Migrations** tab (if migrations were
ever applied via `supabase db push` rather than pasted into the SQL editor
by hand) will also list applied migration names directly — check that
first; the queries above are the fallback if that tab is empty or was
never used.

**B. From this laptop, read-only, once you have the publishable key** — set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in
`admin/.env.local`, then `npm run dev` in `admin/` and sign in attempt will
itself reveal the state: the admin's own session check
(`admin/lib/auth.ts`) queries `admin_users`, so "relation does not exist"
in the server logs means the migration isn't applied; "no active row" for
your email means the migration *is* applied but no owner exists yet.
`admin/scripts/create-owner.ts` does the same existence check (line 57)
before attempting anything else, and refuses with an explicit message if
`admin_users` is missing — so running it is itself a safe probe, except
that it requires the **secret** key, not just the publishable key, so only
do this once you're intentionally ready to create the first owner (step 6
of §9 below), not merely to "check" something.

No Supabase CLI link exists in this repo (`supabase/.temp` absent, CLI not
a dependency in either `package.json`) — so `supabase migration list`
isn't available from this laptop without first running `supabase link`,
which itself only needs the project ref and your Supabase login, not a key.

## 8. Can the admin login work today? No — here's exactly why

Checked, not assumed. Three independent blockers, all already known from
§2 and §5, restated together because this is the concrete question of "can
I log in right now":

1. No `admin/.env.local` exists on this laptop → `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are both empty →
   `isSupabaseConfigured` (`admin/lib/env.ts`) is `false` →
   `getAdminSession()` (`admin/lib/auth.ts` line 50) returns `null`
   unconditionally, before ever reaching the network. Sign-in would render
   but immediately bounce back to `/login`.
2. Even with those two values filled in, whether `public.admin_users`
   exists on the real project is **unverified** (§3) — if the migration
   hasn't been applied, the session check's query errors out and sign-in
   still fails, just with a different cause.
3. Even with the table there, **no owner row exists yet** anywhere — one
   has to be created once via `create-owner.ts` (needs the secret key) or
   the SQL in `admin/README.md` §5 (needs dashboard SQL-editor access) —
   neither was run in this session, per your instruction not to create an
   administrator without explicit approval.

None of these were touched or worked around here. This section exists so
you know exactly which of the three is still blocking once you fix the one
above it, instead of guessing from a generic "login failed."

## 9. Safe steps for completing the integration once unblocked

1. Get Supabase dashboard access or the project's anon key from the other
   laptop (item 5.2 above). Put it in `admin/.env.local` and root
   `.env.local`, from the `.example` templates — never commit it.
2. In Supabase Studio, run the two "Why to apply" checks from §5.3 to see
   what's actually live.
3. If `20261011160000` isn't applied yet, apply it first (it's a
   prerequisite the big admin migration explicitly requires).
4. **Before applying `20261012090000`:** take a Database backup (or test on
   a branch), per `admin/README.md` §1 — it's additive but changes live
   permissions.
5. Apply `20261012090000`. It back-fills `products.status` from the
   existing `is_visible` column, so nothing already published goes dark.
6. Create the first owner (`admin/scripts/create-owner.ts`, or the SQL in
   `admin/README.md` §5) and sign in once to confirm role-gated access
   actually works against the real project (this is the first real,
   authorized read/write against production — don't do it before this
   point).
7. Merge `app/api/revalidate/route.ts` to `main` and redeploy the public
   site; set `REVALIDATE_SECRET` / `PUBLIC_REVALIDATE_SECRET` on both
   Vercel projects.
8. Only then start managing real products through the admin app.

Nothing above was executed against the production database in this
session — no migration was run, no row was written, and no credentials were
requested in chat.
