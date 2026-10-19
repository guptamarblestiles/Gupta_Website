# Final activation checklist — production-changing steps only

Everything that could be built, fixed, and verified locally has been.
This document is deliberately short: it is **only** the steps that
genuinely require production access, a decision only the project owner
can make, or both. Each step names its exact prerequisite and the
verification to run immediately after. None of these were executed to
produce this checklist — see `docs/admin-integration-report.md` and
`docs/admin-release-checklist.md` for everything that *was* run, and
exactly what evidence backs each claim.

## 1. Confirm backup/recovery is real, not assumed

- Open Supabase Dashboard → Database → Backups for the `gvwaqvdhranchtzfgfiu`
  project. Confirm what the current plan actually provides (scheduled
  daily backup vs. Point-in-Time Recovery) — don't infer it.
- Trigger a fresh backup (or confirm the most recent one is recent enough
  that you'd accept losing everything since it ran).
- **Verification:** you can state, in one sentence, what you'd do and how
  much data you'd lose if migration 6 somehow went wrong. If you can't,
  stop here.

## 2. Apply migration 6 to production

- Prerequisite: step 1 done.
- Run the pre-flight validation SQL in `docs/migration-6-production-review.md`
  §4 (read-only) first.
- Apply `supabase/migrations/20261012090000_admin_app_roles_status_audit.sql`
  via the SQL editor — **not** `supabase db push`, per the migration-history
  risk in `docs/admin-integration-report.md` Phase 3 (an un-reconciled
  CLI history could replay migration 3's `DROP TABLE`).
- **Verification:** re-run the Phase 8-style existence probes (or the SQL
  in the migration review §4) and confirm `admin_users`,
  `pdf_import_candidates`, `audit_log` now exist, `products.status` now
  exists, and every table's row count is unchanged from before. This
  session additionally proved — on an isolated database seeded with
  realistic pre-existing data — that this exact migration preserves every
  row untouched; this step is the same migration run for real.

## 3. Create the first production owner account

- Prerequisite: step 2 done and verified.
- Either `admin/scripts/create-owner.ts` (needs `SUPABASE_SECRET_KEY`
  pasted into `admin/.env.local` directly in your own editor, never in
  chat, blanked again right after) or the manual SQL in `admin/README.md`
  §5 (no secret key needed at all, but needs Dashboard access).
- **Verification:** sign in with that account at the admin app's own URL
  (not yet the shared domain) and confirm it lands on the dashboard, not
  `/login`.

## 4. Real authenticated smoke test (CRUD, uploads, public sync)

- Prerequisite: step 3 done.
- Run `docs/admin-release-checklist.md` §5 in order, using a clearly
  labeled test product (`"TEST — delete me"`) and a throwaway test image —
  never a real catalogue item.
- Specifically confirm: publish requires an image (migration 6's trigger),
  the audit log records the actions with the right actor, and — once step
  6 below is also done — a change is visible on the public site.
- **Verification:** every artifact created in this step is deleted again
  before moving on. Nothing fake stays in production.

## 5. Deploy the admin app and the public site's `/api/revalidate` route

- Push `feat/admin-app` to `origin` first (it currently exists only on
  this laptop — a backup risk independent of readiness).
- Vercel: new project, Root Directory `admin`, framework Next.js. Set the
  env vars from the table below (values from your own secure source,
  never from this conversation).
- Merge `feat/admin-app` to `main` (it also carries `app/api/revalidate/route.ts`)
  and deploy the public site's project as usual.
- Set `REVALIDATE_SECRET` on the public site's Vercel project and the
  matching `PUBLIC_REVALIDATE_SECRET` on the admin project — a real random
  value (e.g. `openssl rand -hex 32`), not the test string used locally
  this session.
- **Verification:** `curl -X POST https://www.guptainterior.in/api/revalidate`
  with the real secret returns `200`, not `404`/`401`/`503` — the same
  three states already proven correct locally with a throwaway secret.

### Env vars needed (names only — get values from your own secure source)

| Var | Vercel project | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | both | `https://gvwaqvdhranchtzfgfiu.supabase.co` — public, not a secret |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | both | from Supabase Dashboard → API Keys |
| `SUPABASE_SECRET_KEY` | admin only | server-only; never set on the public site's project |
| `NEXT_PUBLIC_ADMIN_URL` | admin | the admin app's own deployment URL |
| `PUBLIC_SITE_URL` | admin | `https://www.guptainterior.in` |
| `PUBLIC_REVALIDATE_SECRET` | admin | must equal `REVALIDATE_SECRET` below |
| `REVALIDATE_SECRET` | public site | must equal `PUBLIC_REVALIDATE_SECRET` above |
| `ADMIN_ZONE_ORIGIN` | **public site**, not admin | the admin project's real production URL — **this is the switch that turns on `/admin` routing to the new app; leave it unset until step 6** |

## 6. Activate and verify `https://www.guptainterior.in/admin`

- Prerequisite: steps 4 and 5 done and verified independently.
- Set `ADMIN_ZONE_ORIGIN` on the **public site's** Vercel project to the
  admin project's real deployment URL. Redeploy the public site (env var
  changes need a redeploy — rewrites are baked in at build time, confirmed
  this session; the first attempt at local testing failed for exactly this
  reason).
- **Verification — repeat the exact same requests proven locally this
  session, against the real domain:**
  ```
  curl -i https://www.guptainterior.in/admin             # expect 307 -> /admin/login, no dashboard content
  curl -i https://www.guptainterior.in/admin/products     # expect 307 -> /admin/login?next=%2Fproducts
  curl -i https://www.guptainterior.in/admin/login        # expect 200
  curl -i https://www.guptainterior.in/                   # expect 200, homepage unaffected
  ```
  Then sign in for real and confirm the dashboard renders and a save
  works.
- If anything differs from the local result, **do not proceed** — revert
  by unsetting `ADMIN_ZONE_ORIGIN` and redeploying; the legacy panel
  resumes immediately (confirmed this session: with the env var absent,
  behavior is byte-identical to today).

## 7. Rollback/recovery, and when to retire the legacy panel

- **Database:** no automatic rollback for migration 6 exists — restoring
  from the step-1 backup is the only path if something is wrong after
  step 2. See `docs/migration-6-production-review.md` §6 for exactly what
  a manual reverse-migration would and wouldn't recover.
- **Routing:** reversible in seconds — unset `ADMIN_ZONE_ORIGIN` and
  redeploy the public site; the legacy panel resumes exactly as it works
  today (verified this session).
- **Deployment:** Vercel's Instant Rollback to the previous deployment
  covers both projects independently.
- **Retiring `app/admin/`:** not part of this checklist. Only consider it
  once the new admin app has been the one actually used in production for
  as long as you're comfortable with — a separate, later, deliberate
  decision, never automatic.

---

Everything above this line requires your explicit approval at the time it
happens. Nothing on this list has been executed.
