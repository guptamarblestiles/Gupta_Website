# Laptop 2 workspace audit — is there really a separate admin codebase?

Answering the specific question raised by Laptop 1's report: yes, this
laptop's workspace has local-only commits containing a second, separate
admin application that Laptop 1 cannot see. Details and evidence below.
No files were modified in either admin codebase to produce this report.

## 1–2. Repository identity — same repo, divergent local branch

```
origin  https://github.com/guptamarblestiles/Gupta_Website.git
branch  feat/admin-app   (confirmed via `git branch --show-current`)
status  clean (only this repo's own docs/*.md files are untracked)
```

This is **not** a separate clone or fork — it's the same
`guptamarblestiles/Gupta_Website` repository Laptop 1 is presumably also
working from. What differs is the **local branch checked out here**:

- `git merge-base --is-ancestor 796995a origin/main` → **yes**. Commit
  `796995a` ("Merge feat/catalogue-curation into main") is shared history —
  both laptops have this.
- `git merge-base --is-ancestor 1a261fa origin/main` → **no**. Commit
  `1a261fa` ("Add separate admin app with Supabase Auth roles, PDF import
  and audit log") — the commit that introduces the entire separate `admin/`
  app — is **not on `origin/main`**.
- `git ls-remote --heads origin` lists `main`, `homepage-build`,
  `feat/catalogue-curation`, `feat/search-console`, `feat/seo`,
  `feat/source-pdf-upload` — **no `feat/admin-app` on the remote at all.**

**Conclusion, stated plainly:** `feat/admin-app` and its two commits
(`1a261fa`, `9e154f8`) exist **only on this laptop's local Git repository**
and have never been pushed. That is exactly why Laptop 1 — looking at
`origin/main` or a fresh clone of it — correctly reported "no separate
admin app or `feat/admin-app` branch": it genuinely isn't there, from where
Laptop 1 is looking. Laptop 1's finding and this laptop's finding are both
accurate; they describe different points in the same repo's history.

**This also means the entire `admin/` app currently exists in exactly one
place: this laptop's local disk.** It is not backed up on GitHub. Losing
this checkout without pushing the branch first would lose that work
entirely (see Recommendations).

## 3. Architecture — two genuinely distinct Next.js apps in one working tree

| | `app/admin/` (root, Laptop 1's finding) | `admin/` (this laptop, separate app) |
|---|---|---|
| `package.json` name | `gupta-interior` (same as the public site — it's one Next.js app) | `gupta-interior-admin` — its own app, own `package.json`, own `node_modules`, own port (3001) |
| File count | 38 files (`app/admin/`, `lib/admin/`, `components/admin/`) | 101 files |
| Entry point | Route group inside the public site: `app/admin/(protected)/...`, `app/admin/login/page.tsx` | Standalone app: `admin/app/(app)/...`, `admin/app/(auth)/...`, own `admin/proxy.ts` |
| Auth model | **One shared password** (`lib/admin/session.ts`): bcrypt hash in an `admin_auth` table (or `ADMIN_PASSWORD` env fallback), HMAC-signed session cookie. No user identity, no roles. | **Per-user Supabase Auth** (email+password) + an `admin_users` role table (owner/editor/viewer) + RLS policies enforcing the same roles at the database level |
| DB access | `lib/supabase/admin.ts` — service-role client, **bypasses RLS entirely**; proxy.ts's password check is the *only* gate | `admin/lib/supabase/server.ts` — acts **as the signed-in user**; RLS is enforced on every query regardless of what the app code does |
| Supabase config | Reads the same `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SECRET_KEY` as the public site (root `.env.local.example`) | Reads the same variable *names*, in its own `admin/.env.local` (confirmed gitignored, separate from root's) |
| Migrations it depends on | 1–5 (`20260815120000` through `20261011160000`) — all plausibly already live, per the prior Supabase audit | 1–6, including `20261012090000_admin_app_roles_status_audit.sql`, confirmed **not yet applied** to production in the prior audit (`docs/admin-integration-pending.md` §3) |
| Storage writes | Same buckets (`tiles`, `catalogues`), via service-role (no Storage RLS involved) | Same buckets, via Storage RLS policies added in migration 6 (editors write, owners delete) |

Both ultimately read and write the **same** `products`, `product_images`,
`categories`, `catalogues`, `source_pdfs`, `enquiries` tables in the same
Supabase project — there is only one database either way, consistent with
every prior finding in `docs/admin-integration-pending.md`.

## 4. Existing integration documentation — found, not assumed

Two files already exist in `docs/` from earlier sessions on this laptop:

- `docs/admin-integration-pending.md` — the original audit: verified the
  Supabase project reference, the schema-vs-migration-file gap, and that
  `/api/revalidate` isn't deployed to production yet.
- `docs/admin-integration-report.md` — a follow-up: local `.env.local`
  setup (URL filled in, no key), a read-only connectivity probe, a
  migration-risk checklist (flagging that migrations 2–3 contain a
  destructive `DROP TABLE` that must never be re-run against the live DB),
  and an explicit "NOT TESTED" list for anything needing real credentials.

Nothing in this new audit contradicts either file; this document adds the
repo-identity question Laptop 1's report specifically raised.

## 5–6. Is the separate `admin/` app redundant with `app/admin/`, or does it have unique functionality?

**Verdict: `admin/` is a near-complete superset, built specifically to
replace `app/admin/` — but `app/admin/` is still the one in production
today, so it is not safe to delete yet.**

Functionality that genuinely overlaps (both can do it, against the same
tables):
- Product create/edit, category management, PDF-catalogue management.

Functionality that **only exists in the separate `admin/` app** (confirmed
by inspecting both codebases — not inferred):
- Per-person login with owner/editor/viewer roles, enforced at the database
  level via RLS — `app/admin/` has none of this; every person who knows the
  one shared password has full, unrestricted (service-role) access.
- An append-only, trigger-written audit log (`audit_log` table) — nothing
  in `app/admin/` records who changed what.
- A browser-side PDF → product importer using pdf.js + OCR, with per-crop
  review, duplicate-code detection, and a "PDF defaults only fill empty
  fields" merge rule. `app/admin/`'s import path
  (`lib/admin/importActions.ts`, `components/admin/ImportReviewGrid.tsx`,
  `scripts/import/bulkImport.ts`) is a simpler, non-visual bulk pipeline
  with no OCR and no page-crop review UI.
- A PDF library with content-hash dedup, retry-after-failure upload, and
  usage tracking (which products reference which PDF).
- Enquiry triage (status, staff notes) — `app/admin/` has no enquiries UI
  at all; enquiries only exist as raw rows today.
- Team & permissions management, a media library across both storage
  buckets with broken-link detection, and homepage-catalogue curation.

Functionality that exists **only in `app/admin/`** and has no equivalent
found in `admin/`:
- Nothing distinct was found. Every `app/admin/` capability (product form,
  category form, catalogue form, password change) has a corresponding,
  more capable equivalent in `admin/`. The one operational difference is
  that `app/admin/`'s auth model needs no new migration and no Supabase
  Auth setup — it already works against today's schema, which is
  presumably why it's what's actually deployed and in use right now.

**Why not retire `app/admin/` immediately:** it is (per Laptop 1, and
consistent with it being reachable from `origin/main`) the admin panel
currently live in production. Removing it before `admin/` is deployed,
migrated, and has a working first owner would leave no way to manage the
site. This is a sequencing question, not a code-quality one.

## 7. Safe local checks

Not re-run in this pass: the working tree is unchanged since the last
verification in this same session lineage (commit `9e154f8`, clean tree),
and re-running identical checks against identical code would add nothing.
For the record, the most recent results (same commit as right now):

| Check | App | Result |
|---|---|---|
| `npm test` (63 tests incl. RLS/role simulation against PGlite) | `admin/` | ✅ pass |
| `npm run typecheck` | `admin/` | ✅ clean |
| `npm run lint` | `admin/` | ✅ clean |
| `npm run build` (no/partial env vars) | `admin/` | ✅ clean — degrades gracefully |
| `tsc --noEmit` | root (`app/admin/` included) | ✅ clean |
| `npm run lint` | root | ✅ clean |

No test, build, or lint step touches the real Supabase project — all
against local code or the in-memory PGlite simulation.

## Recommendations

1. **Push `feat/admin-app` to `origin` soon**, even before it's ready to
   merge. Right now it is a single point of failure — the entire `admin/`
   app and its migration only exist on this laptop's disk. A branch push
   is not a merge and not a deploy; it just gets the work backed up and
   visible to Laptop 1 / anyone else on the team. (Not done in this
   session — it's a Git push to a remote, which falls under actions this
   audit was told not to take without your separate go-ahead; flagging it
   here as the single highest-value next step.)
2. **Don't touch `app/admin/` yet.** It's live, it works independently of
   the new admin app's migration, and nothing found here changes that.
3. **Keep following the existing sequencing plan** in
   `docs/admin-integration-pending.md` §9 / `admin-integration-report.md`
   Phase 6: verify migration status → apply migration 6 (with backup) →
   create first owner → deploy `admin/` → *then*, as a separate, later
   decision, retire `app/admin/`'s routes (and eventually its `admin_auth`
   table) once the team has actually switched over.
4. **Share `docs/laptop2-admin-audit.md` and the two existing
   `admin-integration-*.md` files with whoever is coordinating Laptop 1 and
   Laptop 2's work** — Laptop 1's "whether Laptop 2 contains a separate
   admin codebase" question is answered (yes) and this file is the
   evidence trail.

## What was explicitly not done in this session

No Supabase project created, no production migration applied, no
production data or permission changed, no admin account created, no
branch merged, nothing pushed or deployed, no secret printed or requested.
`git status` is clean except untracked files under `docs/`.
