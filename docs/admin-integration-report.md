# Admin app ↔ production Supabase — integration report (Laptop 2)

Branch: **`feat/admin-app`** (confirmed via `git branch --show-current`; this
work stayed on it, nothing merged to `main`). Builds on
`docs/admin-integration-pending.md` (§1–§9) — read that first; this file
adds what changed in this follow-up session and does not repeat it verbatim.

**Headline: no production write, migration, or account creation happened.**
Everything below is either a local-only change (gitignored), a read-only
network probe, or a prepared-but-not-executed plan awaiting your approval.

---

## Phase 1 — Audit (confirmed, no new contradictions)

- Branch: `feat/admin-app`. `git status`: clean except two untracked,
  gitignored files added this session (`admin/.env.local`,
  `docs/admin-integration-report.md`) — see Phase 2.
- Re-inspected `admin/lib/supabase/{server,browser,service}.ts`,
  `admin/lib/auth.ts`, `admin/lib/env.ts`, `admin/scripts/create-owner.ts`,
  `admin/proxy.ts`, all 6 files in `supabase/migrations/`, and
  `admin/tests/db/{harness.ts,policies.test.ts}`. Findings match
  `admin-integration-pending.md` exactly — nothing on disk changed since
  that audit (same commit, same working tree).
- **Env var names, confirmed from `admin/.env.example` and root
  `.env.local.example`** (values never printed — none exist locally to print):

  | Var | App | Purpose |
  |---|---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | both | Project URL |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | both | anon/publishable key, browser-safe |
  | `SUPABASE_SECRET_KEY` | both | server-only, service-role |
  | `NEXT_PUBLIC_ADMIN_URL` | admin | admin's own URL, for reset-email links |
  | `PUBLIC_SITE_URL` | admin | public site's URL |
  | `PUBLIC_REVALIDATE_SECRET` / `REVALIDATE_SECRET` | admin / root | shared secret, must match across both apps |
  | `NEXT_PUBLIC_MAX_PDF_MB` | admin | upload limit, default 50 |
  | `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` | root | legacy root `/admin` only, unrelated to the new admin app |

- **Laptop 1's public-site integration report: not available.** Checked
  `docs/**` (only this repo's own two files exist), checked
  `git log --all` and `git fetch origin` for any new branches/commits —
  none beyond what was already known. **This is a documented dependency,
  not an invented finding**: Phase 5's "verify changes appear on the public
  website" and the revalidation wiring cannot be confirmed until Laptop 1
  reports its own status.

## Phase 2 — Local dev config (done, local-only, no secret touched)

- Created **`admin/.env.local`** (confirmed gitignored —
  `git check-ignore -v` matches `admin/.gitignore:4:.env*`; `git status`
  shows it as untracked and ignored, not stageable). Pre-filled only the
  **non-secret** value: `NEXT_PUBLIC_SUPABASE_URL=https://gvwaqvdhranchtzfgfiu.supabase.co`
  (verified in the prior audit, re-confirmed below). The publishable key,
  secret key, and revalidate secret fields are **left blank** with inline
  comments telling you to paste them directly into the file in your own
  editor — not into chat.
- **Read-only, unauthenticated connectivity probe** (no key used or
  needed — this only proves the project is alive and reachable, not that
  any table/RLS/auth works):

  ```
  GET https://gvwaqvdhranchtzfgfiu.supabase.co/rest/v1/        -> HTTP 401 {"message":"No API key found in request"}
  GET https://gvwaqvdhranchtzfgfiu.supabase.co/auth/v1/health  -> {"message":"No API key found in request"}
  GET .../storage/v1/object/public/tiles/2x4-glossy-d-m-roman-white/image-0.webp -> HTTP 200
  ```

  **Interpretation:** the project is live and DNS/TLS-reachable (a wrong or
  deleted project would show a network/DNS error or a Cloudflare error
  page, not a structured Supabase 401). The 401s are Supabase correctly
  demanding an API key — this is the expected "configuration incomplete"
  response, not a network failure, and not an RLS or table-missing error
  (those can only appear *after* a key is presented). The 200 on the public
  storage object reconfirms the bucket is public and serving real files,
  independent of the browser-based check from the prior audit.
- **What's still blocked:** any authenticated check (does `admin_users`
  exist? does RLS behave as the policies say? can a real session be
  created?) needs the publishable key, which only you can add — see the
  checklist at the end of this report.

## Phase 3 — Database verification: migration checklist, risks, rollback

**No SQL was run against any database.** This is a read-only analysis of
the 6 files in `supabase/migrations/`, in filename (chronological) order.

### ⚠️ Most important finding: do not run `supabase link` + `supabase db push` blindly

Two of the older migrations physically **drop and recreate** the catalogue
tables:

```sql
-- 20260816154500_rebuild_catalogue_schema.sql, lines 15-16:
drop table if exists public.product_images;
drop table if exists public.products;
```

This already ran once, deliberately, against production (the public site's
526 live products exist *because* of it — see migration comment: "The old
products/product_images tables... are dropped entirely per an explicit
decision to start fresh"). **If it is ever executed again against the
current database, it will permanently delete every live product and image
row, with no undo except restoring a backup.**

The risk is not that anyone would type that SQL on purpose — it's how the
Supabase CLI tracks "already applied." The CLI only knows a migration ran
if it's recorded in the hidden `supabase_migrations.schema_migrations`
table, which is only populated when a migration was applied *through the
CLI* (`supabase db push`/`migration up`). If some or all of the 5
pre-existing migrations were instead applied by pasting SQL into Supabase
Studio's SQL editor by hand (plausible — this repo has no
`supabase/config.toml` and no `.temp/` link, meaning the CLI has likely
never been linked to this project from here), then `schema_migrations`
has **no record of them**, and a first-time `supabase link && supabase db
push` would see all 6 local files as "pending" and try to run every one —
including the `DROP TABLE` above — against the live database.

**Do not run `supabase db push` on this project until this is ruled out.**
Safer alternatives, in order of preference:
1. Check Supabase Studio's own **Database → Migrations** tab first — if it
   already lists all 5 old migration names, the CLI's history is intact
   and `db push` would correctly apply only the 6th (new) one.
2. If that tab is empty or doesn't exist for this project, apply only the
   **new, needed SQL** (migration 6, and 5 if not yet applied) by pasting
   its contents directly into the SQL editor — bypassing the CLI's
   apply-everything behavior entirely. This is also what `admin/README.md`
   itself recommends.
3. If you do want to use the CLI going forward, first run
   `supabase migration repair --status applied <version>` for each
   already-applied migration (confirmed via the checks in §7 of
   `admin-integration-pending.md`) so the CLI's history matches reality
   *before* ever running `db push`.

### Full checklist

| # | File | Needed for admin app? | Idempotent / safe to re-run as-is? | Rollback |
|---|---|---|---|---|
| 1 | `20260815120000_create_enquiries_table.sql` | No (enquiries already work without the admin app) | Yes — `create table if not exists`, additive | `drop table public.enquiries` — loses any submitted enquiries; irreversible without a backup |
| 2 | `20260815193000_create_products_tables.sql` | No — superseded by #3 | Technically yes (`if not exists`) but pointless: superseded, and #3 immediately drops its result anyway | N/A (superseded) |
| 3 | `20260816154500_rebuild_catalogue_schema.sql` | No — historical, assumed already applied | **No.** Unconditional `DROP TABLE`. Must never be re-run against a database that already holds real data | **None.** A dropped table with no recent backup is permanently gone |
| 4 | `20260818200000_add_pricing_categories_catalogues_admin_auth.sql` | Partially (categories/catalogues used by admin UI) | Yes — all `add column if not exists` / `create table if not exists` | Drop the added columns/tables — only loses data if they were already populated |
| 5 | `20261011160000_catalogue_curation_filters_and_source_pdfs.sql` | **Yes** — admin's filters, PDF linking, and `is_visible`/`status` groundwork depend on it; migration 6 explicitly requires it first | Yes — additive, and policy/trigger statements use `drop ... if exists` before recreating, so re-running is a no-op | Drop added columns/`source_pdfs` table, and restore the public read policy to its pre-migration form (`using (true)` instead of `using (is_visible = true)`) — would make currently-hidden rows public again, so verify none exist before rolling back |
| 6 | `20261012090000_admin_app_roles_status_audit.sql` | **Yes — this is the admin app's migration.** `admin_users`, `products.status`, `pdf_import_candidates`, `audit_log`, admin RLS policies, storage write policies, admin RPCs | Yes — every `create table`/`add column` is `if not exists`, every policy/trigger is `drop if exists` first, and the one-time `status` backfill (`update ... where status is null`) is itself a no-op on a second run | No automatic rollback script exists. A manual reverse migration would need to: drop `admin_users`, `pdf_import_candidates`, `audit_log`; drop the 4 new storage policies; drop the admin RLS policies added to `products`/`categories`/`catalogues`/`source_pdfs`/`enquiries`; drop the `status`/`archived_at`/etc. columns. Doing so would discard any admin role assignments, audit history, and import candidates recorded since it was applied — there's no way to recover those except a backup taken before the rollback |

**Schema conflicts with the public website:** none found. Migration 6's
`products_sync_status` trigger only enforces "needs an image to publish"
and tracks `updated_by` **when `auth.uid()` is non-null** — i.e. only for
requests made as a signed-in admin user. The existing `scripts/import/*`
service-role scripts have no `auth.uid()`, so their behavior is explicitly
unchanged (confirmed by the migration's own comment, not assumed). The
public read policy's dependency on `is_visible` was already in place
before this session (migration 5); migration 6 keeps it in sync with the
new `status` column rather than replacing it.

**Backup requirement:** `admin/README.md` already says to take a Database
backup (or test on a branch) before applying migration 6 — this report
confirms that's necessary and additionally recommends doing the same
before touching migration 5 if it turns out not to be applied yet, since
it changes the public products RLS policy.

## Phase 4 — Auth and admin access

**Not verified — no dashboard access from this laptop.** What's described
below is what the *code* expects and enforces; whether Supabase's actual
project settings match it is unknown until someone checks the dashboard
(see `admin-integration-pending.md` §5.6 and §7).

- **Sign-in implementation** (`admin/proxy.ts` + `admin/lib/auth.ts`,
  re-confirmed this session): three independent layers —
  1. `proxy.ts` middleware: refreshes the Supabase session cookie, redirects
     unauthenticated requests to `/login` for every path except
     `/login`, `/forgot-password`, `/auth/confirm`.
  2. `getAdminSession()`/`requireRole()`/`assertRole()` (`admin/lib/auth.ts`):
     validates the JWT via `supabase.auth.getClaims()` (never trusts a
     cookie's mere presence), then looks up the caller's row in
     `admin_users` — no row, or `is_active = false`, means no access
     regardless of having a valid Supabase Auth login.
  3. RLS policies (migration 6, §Phase 3 above) enforce the same role
     checks again at the database level, so even a bug in the app code
     can't grant access the database wouldn't also allow.
- **Provisioning the first owner — two options, neither run:**
  - `admin/scripts/create-owner.ts`: needs `SUPABASE_SECRET_KEY` locally.
    Itself performs a safe existence check first (`select user_id from
    admin_users head:true` at line 57) and refuses with a clear message if
    the migration isn't applied — so running it doubles as a safe
    migration-status probe, but only once you're ready to actually create
    the account (it may also create the Supabase Auth login in the same
    step).
  - Manual SQL in `admin/README.md` §5: needs Studio dashboard + SQL editor
    access, and a login already created via Authentication → Add User —
    no secret key needs to touch this laptop at all. Prefer this route if
    you'd rather not put the service-role key in a local file, even
    temporarily.
- **No administrator was created.** Per your instruction, this waits for
  explicit approval plus confirmation that migration 6 is actually applied.
- **If/when you do run `create-owner.ts`:** paste `SUPABASE_SECRET_KEY`'s
  value directly into `admin/.env.local` in your own editor (never into
  this chat, never as a shell command argument, which would land in shell
  history). After the one-time run succeeds, you can blank that line again
  — the admin app's day-to-day operation never needs the secret key, only
  the publishable key.

## Phase 5 — Real integration tests: NOT TESTED

None of the following were run, because none of their prerequisites are
met yet (no publishable key in this environment's actual runtime, no
confirmed-applied migration, no owner account, and — correctly — no
approval was given to create one):

- [ ] Login / logout, denied access for unauthenticated users
- [ ] Role-gated access (owner / editor / viewer differences)
- [ ] Product CRUD (create/edit/publish/archive)
- [ ] Category management
- [ ] Filters & collections (rename/merge)
- [ ] PDF library (upload, dedup, rename, archive)
- [ ] Image upload and product-image association
- [ ] Enquiries list and status updates
- [ ] Team management (invite, role change, deactivate)
- [ ] RLS enforcement against the real project (vs. the PGlite simulation)
- [ ] Storage write policies against the real buckets
- [ ] Audit log entries written by real actions
- [ ] Public website reflecting an admin change (additionally blocked on
      Laptop 1's `/api/revalidate` deployment — see
      `admin-integration-pending.md` §6)

**What *was* verified instead (safe substitutes):** the PGlite-backed test
suite (63/63 passing) proves the migration SQL is internally consistent and
the RLS/trigger *logic* is correct against a schema built from the same
migration files — it is explicitly not a substitute for testing against the
real project, as `admin/tests/db/harness.ts`'s own comment says.

## Phase 6 — Final delivery

### Local checks (this session, same commit as the prior audit — `9e154f8`)

| Check | App | Result |
|---|---|---|
| `npm test` | admin | ✅ 63/63 passing |
| `npm run typecheck` | admin | ✅ clean |
| `npm run lint` | admin | ✅ clean (exit 0) |
| `npm run build` | admin | ✅ clean (succeeds with `NEXT_PUBLIC_SUPABASE_URL` set but no key — confirms graceful degradation holds even in this partially-configured state, not just the fully-unconfigured one tested previously) |
| `tsc --noEmit` | root | ✅ clean (exit 0) |
| `npm run lint` | root | ✅ clean (exit 0) |

### Coordination with Laptop 1

Not available this session (checked — see Phase 1). The admin app's
remaining real blockers that depend specifically on Laptop 1's work:
the `/api/revalidate` route's deployment to `main`/production, and
`REVALIDATE_SECRET` being set on the public site's Vercel project. Until
Laptop 1 reports on these, Phase 5's public-sync test item stays NOT TESTED
regardless of anything done on this laptop.

### Deployment & rollback checklist (prepared, not executed)

**Admin app, first deploy:**
1. Vercel → New Project → this repo → Root Directory `admin` → framework
   Next.js.
2. Set env vars from the table in Phase 1 (values from your own secure
   source, never from chat).
3. Apply migration 6 (and 5 if needed) first — Phase 3 order matters.
4. Create the first owner (Phase 4) — only after migration confirmed.
5. Deploy. Add the `admin.guptainterior.in` domain and its DNS record.
6. **Rollback:** Vercel keeps every deployment; "Instant Rollback" to the
   previous deployment from the project's Deployments list requires no
   git action. A bad *migration*, by contrast, has no instant rollback —
   see the backup requirement in Phase 3.

**Public site change (merging `feat/admin-app`'s `/api/revalidate` route):**
1. Confirmed still not live (HTTP 404, re-checked this session — see
   `admin-integration-pending.md` §6).
2. Merging `feat/admin-app` to `main` carries the *entire* admin app and
   migration file into the public site's history too (they share this
   repo) — review the diff scope with that in mind before merging, or
   cherry-pick just the route file if you want a smaller, earlier change.
3. Set `REVALIDATE_SECRET` on the public site's Vercel project to match
   `PUBLIC_REVALIDATE_SECRET` on admin's.
4. **Rollback:** same Vercel Instant Rollback; the route itself has no
   destructive effect (it only calls `revalidatePath`), so there's no
   data-level rollback concern here, unlike the database migrations.

### Files changed this session

- `admin/.env.local` — new, gitignored, local-only, no secret present.
- `docs/admin-integration-pending.md` — unchanged this session (already
  up to date from the prior audit).
- `docs/admin-integration-report.md` — this file, new.

Nothing staged, committed, merged, or deployed.

---

## Phase 7 — Follow-up verification: the key is still not present

**Stop-the-line finding, reported honestly rather than proceeding as if it
were true:** you said the publishable/anon key had been entered into
`admin/.env.local`. Checked directly — **it has not landed in the file.**

- `admin/.env.local` on disk right now is 28 lines, 1271 bytes, last
  modified 2026-10-12 23:11 — parsing it line by line (names and value
  *lengths* only, never values) shows `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  at line 12 with **0 characters** after the `=`. `SUPABASE_SECRET_KEY` is
  also 0 characters.
- Searched the whole project tree for any `.env*` file modified in the last
  day: only `admin/.env.local` qualifies, and it's the one just described.
  No stray duplicate, no OneDrive conflict copy, no second `admin/`
  directory elsewhere.
- So either the edit didn't get saved, it was made to a different file/path
  than `C:\Users\umesh\OneDrive\Desktop\Gupta_Website\admin\.env.local`, or
  it hasn't synced yet. **Please re-check in your editor that you're
  editing exactly that path, that the line reads
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<the key, no quotes needed>` with
  nothing after it on the same line getting cut off, and that you saved the
  file (Ctrl+S).** Once saved, tell me again and I'll re-check before doing
  anything further.

### Checks requested this round — PASS / FAIL / NOT TESTED

**1. Env var present, value/secret not printed**
❌ **FAIL** — `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is present as a line in
the file but its value is empty (0 characters). Not a pass with the value
hidden — genuinely absent. (`SUPABASE_SECRET_KEY` is also empty, as
expected/desired until you're ready for owner creation.)

**2. Authenticated, read-only connectivity checks**
⬜ **NOT TESTED** — blocked by #1. No key exists to authenticate with, so
none were attempted (no partial/guessed key was used).

**3. Read-only SQL checks from `admin-integration-pending.md` §7, via
Dashboard**
⬜ **NOT TESTED** — this laptop has no Supabase Dashboard session/browser
login for this project, and no CLI link, so there is no way to run SQL
from here at all, key or no key. **Exact SQL for you to run yourself** in
Supabase Studio → SQL Editor (read-only `select`s; they inspect the
schema, they change nothing):

```sql
select to_regclass('public.admin_users')            as admin_users,
       to_regclass('public.pdf_import_candidates')  as pdf_import_candidates,
       to_regclass('public.audit_log')               as audit_log,
       to_regclass('public.enquiries')                as enquiries,
       to_regclass('public.admin_auth')               as admin_auth,
       to_regclass('public.source_pdfs')              as source_pdfs;
-- Each column is null if that table doesn't exist yet, or shows its name if it does.

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'products'
  and column_name in ('status', 'archived_at', 'created_by', 'updated_by', 'is_visible');
-- status/archived_at/created_by/updated_by only exist if migration 6 is applied;
-- is_visible should already exist from migration 5.
```

Paste the output back (it's schema metadata, not data — safe to share) and
I'll record the result here as PASS/FAIL per table, with evidence, instead
of guessing.

**4. Existence of `admin_users`, `pdf_import_candidates`, `audit_log`,
`enquiries`, `admin_auth`, `source_pdfs`; `products` columns**
⬜ **NOT TESTED** — same blocker as #3. This is exactly what that query
answers; I have not run it, assumed its result, or guessed at it.

**5. Migration history vs. actual schema**
⬜ **NOT TESTED (live comparison)** — requires #3/#4's results to compare
against the 6 local migration files. The **local-file side** of this
comparison is already done (Phase 3 above: what each of the 6 files would
create/change). Once you run the SQL in #3, I can do the actual comparison
and tell you exactly which migrations are live and which aren't — with
evidence, not inference. **No migration was run, and `supabase db push`
was not invoked**, consistent with your instruction and the risk flagged
in Phase 3.

**6. Storage bucket names and policies**
🟡 **PARTIAL — PASS for one thing, NOT TESTED for the rest.**
- ✅ **PASS**: `tiles` is a real, public bucket serving real files — the
  same unauthenticated check as before: `GET
  https://gvwaqvdhranchtzfgfiu.supabase.co/storage/v1/object/public/tiles/2x4-glossy-d-m-roman-white/image-0.webp`
  → `HTTP 200`.
- ⬜ **NOT TESTED**: whether `catalogues` bucket exists/is public (no known
  object URL to probe blindly without risking a wrong guess at a path), and
  whether the *write* policies from migration 6 (`"Admin editors upload
  catalogue media"` etc. on `storage.objects`) exist — listing policies
  needs either Dashboard access (Storage → Policies, or `select policyname
  from pg_policies where schemaname = 'storage'` in the SQL editor) or an
  authenticated key, neither available here.

### What's unchanged from before this round

No admin account created, no production permissions or data changed, no
file uploaded, no migration applied, nothing merged or deployed, nothing
pushed. `git status` still shows only the untracked `docs/` additions;
`admin/.env.local` remains gitignored and was never staged.

---

## Phase 8 — Key confirmed present; authenticated read-only checks run

You re-saved the file. Re-verified without printing the value, length, or
any secret:

- `NEXT_PUBLIC_SUPABASE_URL` — exact match to
  `https://gvwaqvdhranchtzfgfiu.supabase.co`. ✅ **PASS**
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — present, non-empty (boolean
  check only, no length/value printed). ✅ **PASS**
- `SUPABASE_SECRET_KEY` — still empty, as it should be until you're ready
  for owner creation. ✅ **PASS** (correct state)
- `git check-ignore -v admin/.env.local` → still matches
  `admin/.gitignore:4:.env*`. `git status --porcelain` → still doesn't list
  it. `git log --all -- admin/.env.local` → still empty (never committed).
  ✅ **PASS**

### Authenticated connectivity — ✅ PASS

Used the key only inside request headers (`apikey` / `Authorization:
Bearer`), never logged. `GET /auth/v1/health` with the key →
`HTTP 200 {"version":"v2.197.0","name":"GoTrue",...}` — the key
authenticates successfully against the real project. (`GET /rest/v1/`
alone returns `401 "Secret API key required"` — that's just this
project's root-listing endpoint refusing anon keys; it doesn't indicate a
problem, since every actual table query below succeeded or failed exactly
as the schema predicts.)

### Table/column existence — definitive, via PostgREST's own schema-cache errors

No dashboard access was needed for this after all: querying each table
with `select=<col>&limit=1` through the real REST API gives an
unambiguous signal — `HTTP 200` (table exists, even if RLS returns 0 rows)
vs. `HTTP 404 PGRST205 "Could not find the table ... in the schema cache"`
(table genuinely does not exist) vs. `HTTP 400 42703 "column ... does not
exist"` (table exists, column doesn't). This is the same distinction the
dashboard SQL in Phase 7 would have given, obtained safely through the
app's own normal read path instead.

| Target | Result | Verdict |
|---|---|---|
| `admin_users` | `404 PGRST205` — "Could not find the table 'public.admin_users'" (hint suggested `admin_auth` instead) | ❌ **Does not exist — migration 6 NOT applied** |
| `pdf_import_candidates` | `404 PGRST205` | ❌ **Does not exist — migration 6 NOT applied** |
| `audit_log` | `404 PGRST205` | ❌ **Does not exist — migration 6 NOT applied** |
| `enquiries` | `200`, 0 rows | ✅ **Exists** (migration 1). 0 rows is RLS working as designed — anon can insert but not read; not evidence of missing data |
| `admin_auth` | `200`, 0 rows | ✅ **Exists** (migration 4). No RLS select policy exists for this table by design (per its own migration comment), so 0 rows tells us nothing about whether it's seeded — genuinely unknown, not inferred either way |
| `source_pdfs` | `200`, 1 row | ✅ **Exists** (migration 5), publicly readable, has at least one real row |
| `categories` | `200`, 0 rows | ✅ **Exists** (migration 4). Public policy only shows `is_visible = true` rows — 0 visible is possible even with rows present |
| `catalogues` | `200`, 0 rows | ✅ **Exists** (migration 4), same visibility caveat |
| `products.status`, `.archived_at`, `.created_by`, `.updated_by` | `400 42703` — "column products.status does not exist" | ❌ **Columns don't exist — migration 6 NOT applied** (consistent with every other migration-6 result above) |
| `products.is_visible`, `.review_status`, `.application`, `.thickness`, `.series` | `200`, 1 row | ✅ **All exist — migration 5 fully applied** |

### Storage buckets — confirmed via real objects, not metadata listing

Listing bucket metadata (`GET /storage/v1/bucket`, `GET
/storage/v1/bucket/tiles`) returned an empty list / `404 "Bucket not
found"` respectively — this is RLS hiding `storage.buckets` rows from the
anon role, **not** evidence the buckets don't exist (contradicted by the
next two checks, which are positive proof):

- `tiles` bucket: ✅ **PASS** — fetched a real, known object
  (`tiles/2x4-glossy-d-m-roman-white/image-0.webp`) → `HTTP 200`.
- `catalogues` bucket: ✅ **PASS** — queried `source_pdfs.file_url` for a
  real row (returned a `.../storage/v1/object/public/catalogues/...` URL),
  then fetched it → `HTTP 200`, `content-type: application/pdf`. Confirmed
  with a real production file, not a guessed path.
- **Storage *write* policies** (the 4 added by migration 6) remain
  ⬜ **NOT TESTED** — listing `pg_policies` needs SQL access this laptop
  doesn't have, and migration 6 being unapplied (above) means they likely
  don't exist yet anyway, consistent with everything else found.

### Migration status — now definitive, not inferred

| # | Migration | Status |
|---|---|---|
| 1 | `20260815120000_create_enquiries_table` | ✅ **Applied** |
| 2 | `20260815193000_create_products_tables` | N/A — superseded by #3 |
| 3 | `20260816154500_rebuild_catalogue_schema` | ✅ **Applied** (products/product_images live and working) |
| 4 | `20260818200000_add_pricing_categories_catalogues_admin_auth` | ✅ **Applied** |
| 5 | `20261011160000_catalogue_curation_filters_and_source_pdfs` | ✅ **Applied** |
| 6 | `20261012090000_admin_app_roles_status_audit` | ❌ **NOT applied** |

This matches the prediction in `admin-integration-pending.md` §3 exactly —
nothing here contradicts the earlier audit, it just upgrades "likely" to
"confirmed."

### What this unblocks and what's still ahead

- The admin app's sign-in **will not work yet** even with this key alone —
  `admin/lib/auth.ts`'s `getAdminSession()` queries `admin_users`, which
  doesn't exist. This isn't a bug to fix; it's the expected state until
  migration 6 is applied.
- Products/categories/catalogues/source_pdfs browsing in the admin UI
  (read-only parts that don't need `admin_users`) could now theoretically
  render against real data — but Phase 5's actual UI/login walkthrough is
  still ⬜ **NOT TESTED** in this session; only direct REST calls were made.
- **Still not done, per your instructions:** no migration applied, no
  admin account created, no production data/permissions changed, no file
  uploaded, nothing pushed, merged, or deployed.
