# Admin app release checklist

Every row below is a real checklist item with a check-state: **✅ DONE**
(executed in this session, result observed and cited), or **⬜ PENDING**
(not yet run — most of these need migration 6 applied and/or a dashboard
session this laptop doesn't have). Nothing is marked done on the basis of
"should work" or code inspection alone — those are marked PENDING with a
note on what inspection already showed.

## 0. Feature implementation audit (this session, code-level)

Read every action/data file in `admin/` (`actions/*.ts`, `lib/data/*.ts`,
`lib/run.ts`) against the real, confirmed-live schema. Finding: **every
feature in the brief — products, categories, filters, catalogues/homepage,
PDF library, PDF→product import, enquiries, team/roles/audit — is already
fully implemented with real Supabase queries using the exact column/table
names the migrations define, server-side role checks via `runAction()`
(never trusts a client-supplied role), and the specific safeguards asked
for** (category delete blocked while products reference it; product
delete requires typing the exact product code; PDF upload deduplicates by
SHA-256; PDF-import candidates never auto-publish — they're created as
`draft`/`review` only; "fill only empty fields" when merging into an
existing product). Grepped for `TODO`/`FIXME`/"not implemented"/stub
markers across `admin/` — **none found** outside the deliberate,
explicitly-gated demo mode.

**What this means:** there was no new feature code to write this session.
The remaining gap is not implementation — it's that **none of it can be
exercised against the real project yet**, because `admin_users` (which
every protected page's `getAdminSession()` queries first) doesn't exist
until migration 6 is applied. This is why §5's smoke test is still fully
pending despite the code itself being complete.

## 0b. Workstream 2 — which CRUD operations were genuinely executed vs. code-reviewed only

No staging Supabase project exists, so "isolated local test environment"
means the PGlite-backed database used throughout this repo's own test
suite (real migration SQL, real RLS, real triggers — not a mock). This
table is honest about the difference between "a SQL-level equivalent of
this operation was executed and asserted" and "read the code, didn't run
it":

| Operation | Status | Evidence |
|---|---|---|
| List/search/filter products | ✅ Executed (DB-level) | `tests/db/policies.test.ts` — many tests select via the exact RLS-filtered path each role gets. |
| Add/edit products | ✅ Executed (DB-level) | "editor can create and edit, but not delete products"; `migration6-data-preservation.test.ts`'s legacy-write test. |
| Upload/replace product images | ✅ Executed (DB-level) | "admin\_set\_product\_images reorders and removes atomically" exercises the exact RPC `admin/actions/products.ts` calls. |
| Manage categories (create/edit) | ✅ Executed (DB-level) | "renaming a category carries its managed category row". |
| Delete a category blocked while referenced | ⬜ Code-reviewed only | `deleteCategory`'s guard is a `SELECT count` in application code, not an RLS policy/constraint — not independently executable without calling the real TS function against a real Supabase-JS-compatible backend, which PGlite doesn't provide. |
| Manage catalogues / PDF files | ✅ Executed (DB-level) | "the same file bytes cannot be registered twice"; "detected crops are unique per PDF". |
| Review PDF-import candidates before publishing | ✅ Executed (DB-level + unit) | "PDF import merge rules" suite (4 tests) + `migration6` candidate dedup tests. |
| View/update enquiry status | ✅ **Newly executed this session** | Added `tests/db/policies.test.ts`: editor can update status/notes and gets `handled_by` stamped; viewer's attempt is silently filtered by RLS; only an owner can delete; the customer's own submitted fields are never touched. |
| Archive/restore/delete records | ✅ Executed (DB-level) | "archive and restore keep is\_visible in sync…"; "owner can delete products"; new "only owners can delete an enquiry". |
| Team access management | ✅ Executed (DB-level, minus the Auth-API call) | "editor cannot change roles; owner can"; guard-rail tests (self-demotion, last-owner). The `auth.admin.createUser()` half of `addTeamMember` can't run against PGlite (no Auth API) — code-reviewed only. |
| Audit history | ✅ Executed (DB-level) | "records actor, verb and diff…"; "cannot be written or erased by admins directly". |
| Input validation, loading/error states | ⬜ Code-reviewed + unit-tested in isolation, not through the real UI | `candidate.test.ts` and others test validation *functions* directly; the actual form/page wiring (`loading.tsx`, `error.tsx`, toast messages) was read, not clicked through. |

**What "staging-tested" would add that this doesn't:** exercising the
actual `admin/actions/*.ts` TypeScript functions themselves (not their
SQL-level equivalent) through a real `@supabase/supabase-js` client
talking to a real PostgREST endpoint — which needs either a real Supabase
project or a PostgREST instance in front of PGlite, neither available
here. The gap this leaves is narrow: action-layer glue code (payload
shaping, error-message formatting) is unverified by execution; the
business rules and database enforcement underneath it are.

## 1. Local tests — public website and admin app

| Check | App | Status |
|---|---|---|
| `npm test` (83 tests: 65 RLS/role/trigger simulation against PGlite + 11 proxy/routing regression + 7 migration-6 data-preservation) | `admin/` | ✅ DONE — 83/83 passing |
| `npm run typecheck` | `admin/` | ✅ DONE — clean |
| `npm run lint` | `admin/` | ✅ DONE — clean |
| `npm run build` (`basePath: "/admin"` now enabled, real `.env.local`: URL + publishable key, no secret key) | `admin/` | ✅ DONE — clean, both as `next build` and running in production mode (`next start`). |
| `tsc --noEmit` | root (public site, incl. `app/admin/`) | ✅ DONE — clean |
| `npm run lint` | root | ✅ DONE — clean |
| `npm run build` (both with and without `ADMIN_ZONE_ORIGIN` set at build time) | root | ✅ DONE — clean both ways (exit 0), includes `app/admin/` (legacy panel) and `/api/revalidate` |

## 2. Staging/test procedure — never touches real customer or catalogue data

- All write-testing in Stage 5 of `admin-integration-next-steps.md` uses a
  **clearly fake, clearly labeled test product** (name prefixed
  `"TEST — delete me"`, a product code that can't collide with real
  inventory), a throwaway test image/PDF, and either a marked test enquiry
  or observation-only for enquiries if no safe test row exists.
- Every test artifact gets deleted/reverted before the release is called
  done (checklist item in §5 below enforces this).
- No test in this checklist edits or deletes a real, existing catalogue
  item, image, or PDF.

## 3. Security checks

| Check | Status | Evidence |
|---|---|---|
| Server-side secret handling: `SUPABASE_SECRET_KEY` never reaches browser code | ✅ DONE | Traced: only read in `admin/lib/supabase/service.ts` (has `"server-only"` import), used solely for `auth.admin` calls. Grepped — no `"use client"` file references it. |
| `.env.local` never committed/staged | ✅ DONE | `git check-ignore -v`, `git log --all -- admin/.env.local`, `git diff --cached` all checked this session — ignored, never committed, nothing staged. |
| Auth: 3-layer enforcement (middleware → server session check → RLS) | ✅ DONE (code-level) | Read `admin/proxy.ts` + `admin/lib/auth.ts` directly; each layer independently verified in source. |
| RLS: policies match intended role matrix | ✅ DONE (code-level, PGlite-simulated) | `admin/tests/db/policies.test.ts` — 63 tests simulate exactly this against real migration SQL. **Not yet tested against the real project** (⬜ below). |
| RLS against the **real** project | ⬜ PENDING | Requires migration 6 applied + a real signed-in session of each role. |
| File upload security: path derived from content hash, not user input; upload gated by Storage RLS (editors only) | ✅ DONE (code-level) | Read `admin/lib/client/uploads.ts` — path is `hash.slice(0,24)+extension`, not the original filename; errors from RLS denial surface a specific "can't upload" message rather than a generic failure. **Not yet tested as a real authenticated upload** (⬜ below). |
| Input validation on product form | ⬜ PENDING | `admin/tests/unit/candidate.test.ts` and others test the *validation logic* in isolation (unit-tested, passing) — not yet exercised through the real UI against the real database. |
| Error-state handling (loading/error/empty/success) | ⬜ PENDING | Present in code (`admin/app/(app)/loading.tsx`, `error.tsx`, per-action `ActionResult` types) — not yet observed live. |
| Owner/editor/viewer permission boundaries, live | ⬜ PENDING | Needs a real session per role; PGlite simulation (✅ above) is the closest proxy available without one. |

## 4. Regression checks — existing public website

| Check | Status | Evidence |
|---|---|---|
| Product listing still renders from Supabase | ✅ DONE (observed, read-only) | Fetched `https://www.guptainterior.in/` directly — real product images render from the live project. |
| Images resolve from the real Storage bucket | ✅ DONE | Same fetch; images load from `gvwaqvdhranchtzfgfiu.supabase.co/storage/v1/object/public/tiles/...`, confirmed `HTTP 200` via direct probe. |
| Catalogue PDFs resolve | ✅ DONE | Pulled a real `source_pdfs.file_url` via authenticated REST and fetched it directly — `HTTP 200`, `content-type: application/pdf`. |
| Enquiry form still submits | ⬜ PENDING (not production data) | Not tested against the live form — would require submitting a real-looking test enquiry; not done without your go-ahead (it's a write to production data). The DB-level behavior (insert-only for anon, status-update by editor) **is** now verified in isolation — see Workstream-2 row below. |
| `app/admin/` (legacy panel) still functions after migration 6 | ⬜ PENDING (logic reviewed + isolated-DB verified, not live-tested) | `docs/migration-6-production-review.md` §3 traces `lib/admin/products.ts`'s exact code against the new triggers; `admin/tests/db/migration6-data-preservation.test.ts`'s "legacy-admin-style write" test now **executes** that exact payload shape against a real (isolated) Postgres with migration 6 applied and confirms it still succeeds. Still not observed against the real production project. |
| `/api/revalidate` mechanism (auth/secret handling) | ✅ **DONE — tested locally this session** | Ran the root app locally with a throwaway, local-only test secret (never a real one): no `Authorization` header → `401`; wrong secret → `401`; no `REVALIDATE_SECRET` configured at all → `503`; correct secret → `200 {"revalidated":true,...}`. Proves the mechanism itself is correct. |
| `/api/revalidate` reachable on **production** | ❌ **Confirmed failing** (expected — not deployed yet) | `curl -X POST https://www.guptainterior.in/api/revalidate` → `HTTP 404`, re-checked multiple times across sessions. Fixed only by merging/deploying per Stage 7 of the next-steps plan. |
| `guptainterior.in/admin` routing — full end-to-end, not just the admin app alone | ✅ **Built, fixed, and verified end-to-end this session** | See `admin-integration-next-steps.md`'s routing section "Update": two real local servers (root + admin, both `next build`+`next start`), root's own rewrite (`ADMIN_ZONE_ORIGIN`, baked in at build time) correctly proxies `/admin/*` from the root site's port to the admin zone's real auth gate — unauthenticated 307s with no leaked content, demo/authenticated 200s with real content, assets load, root's own pages unaffected. Separately rebuilt root **without** the env var and confirmed the legacy panel's behavior is byte-identical to before (its own distinct `?from=` redirect param, not the new `?next=`). `basePath` is now enabled in `admin/next.config.ts`; the rewrite is inert by default (confirmed empty `beforeFiles` in the manifest) until `ADMIN_ZONE_ORIGIN` is set. |

## 5. Production smoke test (run only after migration 6 + owner account exist)

⬜ **All PENDING — none of these have run.** In order:

1. ⬜ Sign in as the real owner account. Expected: lands on the dashboard, not redirected to `/login`.
2. ⬜ Attempt an action as a viewer-role test account that should be denied (e.g. edit a product). Expected: denied server-side, not just hidden in the UI.
3. ⬜ Create the `"TEST — delete me"` product (per §2). Expected: appears as draft/review, not visible on the public site.
4. ⬜ Upload a throwaway test image to it, publish it. Expected: requires an image before publish (migration 6's trigger) — confirm the block fires with zero images, then succeeds after upload.
5. ⬜ Confirm the audit log recorded the create + publish actions with the correct actor.
6. ⬜ Un-publish and delete the test product; confirm it's gone from both the admin list and (if briefly published) the public site after a revalidation call or next natural page load.
7. ⬜ Check a real, already-published product's page on the live site still renders correctly (no regression from migration 6's trigger touching unrelated rows during backfill).
8. ⬜ Check the legacy `/admin` panel can still open and save a product edit without error.

### Recovery procedure if any smoke-test step fails

- **If step 1–2 fail (auth/role):** do not proceed further down the list.
  Check `admin_users` has the expected row and `is_active = true`; re-check
  Stage 4 of the next-steps plan.
- **If step 3–6 fail (product CRUD/publish/audit):** stop, do not attempt
  further writes. Check the specific error message (the app's `ActionResult`
  types surface a specific reason, not a generic failure) against
  `migration-6-production-review.md` before retrying.
- **If step 7 fails (existing product regression):** this is the most
  serious outcome — stop immediately, do not make further admin-app writes,
  and restore from the backup taken in Stage 1 of the next-steps plan
  rather than attempting a live fix under pressure.
- **If step 8 fails (legacy panel broken):** stop; this means the trigger
  coupling analysis in the migration review was wrong for some case it
  didn't anticipate. Restore from backup, and re-examine
  `lib/admin/products.ts`/`lib/admin/imageUpload.ts` against the actual
  error before re-applying anything.

## 6. Acceptance criteria — when is this integration "complete"

All of the following must be independently true, each with an observed
result (not an inference), before calling the integration done:

- [ ] Migration 6 applied, confirmed via the post-apply probe in
      `migration-6-production-review.md` §4 (not just "it ran without error").
- [ ] First owner created and **successfully signed in** at least once.
- [ ] Every row in §5's smoke test executed and passed, with its result
      observed (not assumed from code review).
- [ ] At least one real role boundary (viewer or editor attempting an
      owner-only action) was actually tested and actually denied.
- [ ] The legacy `/admin` panel exercised once, post-migration, with a
      real save, and confirmed to still work.
- [ ] `/api/revalidate` deployed to production and returns something other
      than 404 to an authorized request.
- [ ] A change made through the new admin app is confirmed to appear on
      the live public site (the actual end-to-end sync claim — not
      testable until the above is true).
- [ ] All test artifacts from §5 removed/reverted — nothing fake left in
      production data.
- [ ] `feat/admin-app` pushed to `origin` (currently local-only, per
      `docs/laptop2-admin-audit.md` — a backup gap independent of release
      readiness, but blocking "complete").
- [ ] A rollback/recovery plan exists and was read by whoever has
      deployment access, not just written in a doc (§6 of the next-steps
      plan, §6 of the migration review).
- [x] The `guptainterior.in/admin` routing bug fixed, and the full
      same-domain path (`basePath` + rewrite + proxy handoff) built and
      verified end-to-end against two real local servers (see
      `admin-integration-next-steps.md`). Still open: re-run the same
      verification once more against the actual Vercel deployments, since
      this was verified against `localhost`, not a real multi-zone setup.
- [x] Migration 6 verified, against an isolated database seeded with
      production-shaped pre-existing data, to preserve every existing
      product/image/category/catalogue/source-PDF/enquiry row and the
      legacy `admin_auth` row untouched, with correct status backfill in
      every case (`admin/tests/db/migration6-data-preservation.test.ts`,
      7 tests). Still open: the same confirmation against the **actual**
      production database, which only running the real migration there
      can provide.

**None of these are checked yet.** This checklist exists to be filled in
honestly, item by item, as each is actually run — not to be marked
complete because the supporting documentation is thorough.
