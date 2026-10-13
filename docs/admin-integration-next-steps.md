# Admin integration — safe next-steps plan

No production change was made to produce this plan. It sequences what's
left, stage by stage, each tagged **[READ-ONLY]**, **[LOCAL-ONLY]**, or
**[PRODUCTION-CHANGING]** so it's never ambiguous what a given step
actually touches. Production-changing stages require your explicit
approval at the time, not just agreement with this plan in the abstract.

## 0. Branch and file-level audit (done now, for this document)

**[READ-ONLY]**

```
git diff origin/main...feat/admin-app --stat
git log origin/main..feat/admin-app --oneline
```

Result: **128 files changed, 2 commits ahead of `origin/main`**
(`1a261fa`, `9e154f8`), **+21,247 / −1 lines**. Every changed file is
either inside `admin/` (the new app, its own `package-lock.json`, tests,
scripts), the one new migration file, `app/api/revalidate/route.ts`, or
two one-line tooling excludes:

```diff
 eslint.config.mjs:  + "admin/**",            (so root ESLint ignores the separate app)
 tsconfig.json:       "exclude": [..., "admin"]  (so root tsc ignores the separate app)
```

**No file under `app/admin/`, `lib/admin/`, or `components/admin/` (the
live, legacy admin panel) differs between the two branches at all.**
Nothing was changed, nothing deleted, nothing overwritten — confirmed by
its total absence from the diff, not inferred.

**The one real conflict found, and it's not a file conflict:** migration
6 attaches audit-logging and status-sync triggers to tables the legacy
`app/admin/` already writes to via its service-role client. Traced through
`lib/admin/products.ts`'s actual code in `docs/migration-6-production-review.md`
§3 — confirmed harmless (the legacy code never touches the columns the new
triggers care about), but it's a real behavioral coupling, not a file-level
merge conflict, so `git` alone would never show it to you.

## 1. Back up and verify recovery options

**[READ-ONLY]**

- Open Supabase Dashboard → Database → Backups. Note what's actually
  available on this project's plan (daily backup vs. PITR) — don't assume.
- Trigger (or confirm the recency of) a backup.
- Optionally export `products`, `product_images`, `categories`,
  `catalogues`, `source_pdfs`, `enquiries`, `admin_auth` via the SQL
  editor or `pg_dump` (connection string from Database → Settings).

**Stop condition:** if backups aren't available or can't be confirmed
working on this plan, stop here and resolve that first — everything after
this point assumes a real recovery option exists.

## 2. Reconcile Supabase's migration history without rerunning anything destructive

**[READ-ONLY]**

Per `docs/admin-integration-report.md` Phase 3's warning: do not run
`supabase link && supabase db push` blindly. Instead:

- Check Supabase Studio's **Database → Migrations** tab. If it already
  lists migrations 1, 3, 4, 5 by name, the CLI's history is intact.
- If that tab is empty (plausible — this repo has no local
  `supabase/config.toml`/`.temp/` link, suggesting past migrations were
  pasted into the SQL editor by hand rather than pushed via CLI), **do not
  use `supabase db push` for migration 6 either.** Paste migration 6's SQL
  directly into the SQL editor instead — this sidesteps the CLI's
  "apply everything pending" behavior entirely, which is what matters here
  (migration 3 contains a `DROP TABLE` that must never run again).

**Expected result:** a clear picture of whether the CLI thinks anything is
pending, and a decision to use the SQL editor for migration 6 regardless,
unless the Migrations tab independently confirms migrations 1–5 are
already tracked.

**Stop condition:** if you want to use `supabase db push` going forward,
stop and run `supabase migration repair --status applied <version>` for
each already-applied migration *first* — do not push until the CLI's
history matches what Phase 8 already confirmed is live.

## 3. Review and apply migration 6 — only after your explicit approval

**[PRODUCTION-CHANGING — requires your go-ahead at the time]**

- Run the pre-flight validation SQL from `migration-6-production-review.md`
  §4 first (read-only).
- Apply `supabase/migrations/20261012090000_admin_app_roles_status_audit.sql`
  via the SQL editor (not `db push`, per Stage 2).
- Re-run the Phase 8-style existence probes (or the row-count query from
  §4) immediately after, to confirm: `admin_users`, `pdf_import_candidates`,
  `audit_log` now exist; `products.status` now exists; row counts for
  `products`/`product_images`/etc. are unchanged (only `updated_at`
  should differ, per the disclosed side effect).

**Expected result:** migration 6's objects exist; nothing else changed
except every product's `updated_at` timestamp (invisible to the public
site, confirmed in the review doc).

**Stop condition:** if the pre-flight validation in §4 turns up anything
unexpected (a function or column missing, an existing policy with a
colliding name not accounted for), stop and resolve that before applying.

## 4. Create the first owner account securely

**[PRODUCTION-CHANGING — requires your go-ahead]**

Two options (from `docs/admin-integration-report.md` Phase 4), neither
needs a secret pasted into chat:

- **Option A — `admin/scripts/create-owner.ts`:** paste
  `SUPABASE_SECRET_KEY` directly into `admin/.env.local` in your own
  editor, run `npm run create-owner -- you@example.com "Your Name"` from
  `admin/`, then blank that line again (the app's daily operation never
  needs the secret key). The script itself refuses safely if
  `admin_users` doesn't exist yet, so it also re-confirms Stage 3 worked.
- **Option B — manual, no secret key on this laptop at all:** create the
  Auth user via Dashboard → Authentication → Add User, then run the
  one-line SQL from `admin/README.md` §5 in the SQL editor to insert the
  `admin_users` row.

**Expected result:** exactly one `admin_users` row with `role = 'owner'`.

**Stop condition:** do not proceed to Stage 5 until you can actually sign
in with that account.

## 5. Test login, roles, product CRUD, uploads, enquiries, audit log, public-site compatibility

**[PRODUCTION-CHANGING once any write test runs — read the caveats below]**

This is where `docs/admin-release-checklist.md` takes over in detail. In
sequence:
1. Login/logout and denied-access checks (no write).
2. Role checks: confirm a viewer/editor account (create one via Team &
   Permissions, or temporarily demote the owner to test, then restore)
   really can't do what its role forbids — **[READ-ONLY]** if you only
   attempt and observe denial; the moment a write succeeds, it's
   production-changing.
3. Product CRUD using a **clearly fake, clearly labeled test product**
   (e.g. name `"TEST — delete me"`, a product code that can't collide with
   real inventory) — never edit or delete a real catalogue item to test.
4. Image/PDF upload using a throwaway test file, not a customer asset.
5. Enquiries: use a real-looking but clearly marked test enquiry, or
   observe the list without changing status if no safe test row exists.
6. Audit log: confirm the test actions above actually appear.
7. Public-site compatibility: confirm the test product, since it starts as
   **draft/review** (not published, per migration 6's trigger), never
   appears on the public site — and confirm publishing a *different*,
   already-real, already-published product's edit still shows correctly
   (pick one you can revert immediately, and revert it).

**Stop condition:** delete/revert every test artifact (`TEST — delete me`
product, test image, test PDF, test enquiry) before calling this stage
done. Do not leave test data in production.

## 6. Prepare a rollback/recovery plan (done now, read-only)

**[READ-ONLY]** — Already written in `migration-6-production-review.md`
§6: no automatic rollback exists; recovery beyond "drop the new objects"
depends entirely on the backup from Stage 1. Re-read that section before
Stage 3, not after.

## Routing decision for `www.guptainterior.in/admin` — bug found, fixed, and verified

**Update (follow-up session): the bug below has been fixed.** Root cause,
fix, and full verification are in the next section. The original
investigation is kept below unedited as the record of how it was found.

### What was fixed

Two changes in `admin/proxy.ts` (diff is 9 lines; `git diff --stat` on
`admin/next.config.ts` is empty — `basePath` itself is still **not**
enabled by default, see "Decision" below):

1. **The matcher.** `config.matcher` now explicitly lists `"/"` as its own
   entry, in addition to the existing broad pattern:
   ```ts
   matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|icon.svg|pdf.worker.min.mjs|.*\\.(?:png|jpg|svg|webp|mjs)$).*)"]
   ```
   Root cause, confirmed with Next's own matcher-testing engine
   (`unstable_doesMiddlewareMatch` from `next/experimental/testing/server`,
   used in the new regression tests): when `basePath` is configured, Next
   compiles the matcher with the basePath baked in, and the original
   single negative-lookahead pattern did not match the bare basePath root
   on its own — so the request never reached the proxy at all. The second,
   independent gate (`requireRole("viewer")`, called separately in both
   `admin/app/(app)/layout.tsx` and `admin/app/(app)/page.tsx`) also did
   not stop it; exactly why that second gate didn't fire wasn't root-caused
   to the same precision as the matcher issue, but is now moot: with the
   matcher fixed, proxy runs first and redirects before either page-level
   check is ever reached.
2. **The redirects.** Every `NextResponse.redirect(new URL("/login", ...))`
   (and the two others) now builds from `request.nextUrl.basePath + "/login"`
   (an official, documented property — `node_modules/next/dist/docs/.../next-request.md`
   — read before using it, per `AGENTS.md`), so the destination is
   basePath-prefixed whenever a basePath is active, and identical to
   before (empty-string prefix) when it isn't.

### Verification — real HTTP requests against a real production build, basePath temporarily re-enabled for testing only

```
GET /admin                      (unauth) -> 307 /admin/login                 [was: 200, served the dashboard]
GET /admin/                     (unauth) -> 308 /admin  (-> 307 /admin/login on the next hop)
GET /admin/products             (unauth) -> 307 /admin/login?next=%2Fproducts
GET /admin/team                 (unauth) -> 307 /admin/login?next=%2Fteam
GET /admin/login                         -> 200 (public, correctly not redirected)
GET /admin/login/                        -> 308 /admin/login
GET /admin/forgot-password               -> 200 (public, correctly not redirected)
GET /admin/_next/static/*.css   (unauth) -> 200, verified genuine CSS body (Content-Type: text/css, real content, not a disguised redirect)
GET /admin                      (garbage/invalid session cookie) -> 307 /admin/login
GET /admin                      (demo/authenticated-equivalent)  -> 200, real Overview dashboard content
GET /admin/products              (demo/authenticated-equivalent) -> 200, real Products page content
```

Every unauthenticated/invalid-session response body was checked for
protected markers (`grep` for the dashboard's own `<title>`, "Add product",
etc.) and found clean — not just a redirect status with a leaked body.

Then rebuilt and re-ran the **baseline** (no `basePath`, today's real
config) to confirm zero regression: `GET /` unauth → `307 /login`,
`GET /products` unauth → `307 /login?next=%2Fproducts`, `GET /login` → `200`
— byte-identical to pre-fix behavior, as expected since
`request.nextUrl.basePath` is `""` when no basePath is configured.

### Update (second follow-up session): `basePath` is now enabled, and the full same-domain path was built and verified end-to-end

Earlier in this document, `basePath` was deliberately left disabled after
the bug fix, as a separate deployment decision. That decision has now
been made and implemented, with the full chain built and tested — not
just the admin app in isolation:

1. **`admin/next.config.ts`**: `basePath: "/admin"` is enabled, plus
   `experimental.serverActions.allowedOrigins` (`www.guptainterior.in`,
   `guptainterior.in`, and both localhost ports for local testing) — required
   for Server Actions under Multi-Zones per
   `node_modules/next/dist/docs/01-app/02-guides/multi-zones.md`, read
   before adding it.
2. **Root `next.config.ts`**: a `rewrites()` function, **inert by
   default** — it returns `[]` unless `ADMIN_ZONE_ORIGIN` is set, in which
   case it adds `beforeFiles` rewrites sending `/admin` and `/admin/:path+`
   to that origin's own `/admin` paths. Confirmed empty
   (`.next/routes-manifest.json`'s `beforeFiles: []`) in a build with the
   env var unset.
3. **Root `proxy.ts`** (the legacy panel's own gate): now returns
   `NextResponse.next()` immediately for everything when `ADMIN_ZONE_ORIGIN`
   is set, handing `/admin/*` off to the rewrite instead of redirecting to
   the legacy login — otherwise unchanged. **Without** the env var, the
   legacy gate's behavior is byte-identical to before (re-verified below).

**Full end-to-end verification — two real servers, real HTTP requests through the public-facing port:**

Built root with `ADMIN_ZONE_ORIGIN=http://localhost:3001` **at build
time** (rewrites are baked into `routes-manifest.json` at `next build`,
not re-read from env at `next start` — learned the hard way: the first
attempt set the env var only at `next start` and got a 404/500, because
the manifest had no rewrite in it). Built admin with `basePath` enabled.
Ran both (`next start`, ports 3000 and 3001), then hit **port 3000 only**
(root site):

```
GET localhost:3000/admin            (unauth) -> 307 /admin/login                 [via the admin zone's own gate, not the legacy one]
GET localhost:3000/admin/           (unauth) -> 308 /admin
GET localhost:3000/admin/products   (unauth) -> 307 /admin/login?next=%2Fproducts
GET localhost:3000/admin/login               -> 200
GET localhost:3000/admin/_next/static/*.css  -> 200, real CSS (Content-Type: text/css)
GET localhost:3000/                           -> 200 (root site's own homepage, unaffected)
GET localhost:3000/products                   -> 200 (root site's own catalogue, unaffected)
GET localhost:3000/admin  (demo/authenticated)-> 200, real "Overview · Gupta Interior Admin"
GET localhost:3000/admin/products (demo/auth) -> 200, real "Products · Gupta Interior Admin"
```

Then **rebuilt root without `ADMIN_ZONE_ORIGIN`** (today's real default)
and re-confirmed the legacy panel is completely unaffected:

```
GET localhost:3000/admin                (unauth) -> 307 /admin/login?from=%2Fadmin              [the LEGACY gate's own param style — proves this is the old path, not a leftover new one]
GET localhost:3000/admin/products/new   (unauth) -> 307 /admin/login?from=%2Fadmin%2Fproducts%2Fnew
GET localhost:3000/admin/login                   -> 200
```
and `.next/routes-manifest.json`'s `beforeFiles` is `[]` in this build.

**This is the real, working, same-domain path-based routing** — proven
locally with two real production builds talking to each other, not
inferred from the admin app's standalone behavior. Still outstanding
before production: actually deploying two Vercel projects and setting
`ADMIN_ZONE_ORIGIN` to the admin project's real URL there (not
`localhost:3001`) — see the final-activation checklist.

### What is intentionally NOT claimed as fixed

The exact internal reason `requireRole()`'s own `redirect()` call (the
independent, second layer) didn't fire for the one bad request shape was
not fully root-caused — only shown to be moot now that the first layer
(proxy) correctly intercepts the request before the page ever renders.
If `basePath` is adopted later and proxy is ever bypassed for any other
reason, that second layer's behavior under `basePath` specifically has
not been independently proven — re ran the same empirical test method
again at that time, don't assume.

---

## Original investigation (unedited, for the record)

**[LOCAL-ONLY, fully reverted — no lasting code change]** Tested this
session, not just planned. The requested URL (`guptainterior.in/admin`)
means two independently-deployed Next.js apps need to share one path on
one domain — Next.js calls this pattern **Multi-Zones**
(`node_modules/next/dist/docs/01-app/02-guides/multi-zones.md`, read before
touching anything, per `AGENTS.md`). The standard mechanism: the *public
site* adds a `rewrites()` entry forwarding `/admin/:path*` to the admin
app's own deployment URL, and the *admin app* sets `basePath: "/admin"` so
its own routes/links/assets resolve under that prefix automatically.

**Found a reproducible bug with the standard approach, and did not ship
it.** Steps taken:
1. Temporarily set `basePath: "/admin"` in `admin/next.config.ts`.
2. Ran a full production build (`npm run build && npm run start`, not just
   dev mode, to rule out a dev-only artifact).
3. Sent real, unauthenticated HTTP requests:
   - `GET /admin/products` → correctly `307` to `/login?next=%2Fproducts`
     (the auth gate works for sub-paths).
   - `GET /admin` (the zone's own root — i.e. the dashboard) → **`200 OK`,
     serving the actual Overview dashboard page, title `"Overview · Gupta
     Interior Admin"`, to a completely unauthenticated request.** Both of
     the app's independent auth layers (`proxy.ts`'s matcher *and*
     `app/(app)/layout.tsx`'s own `requireRole("viewer")` call) failed to
     block this specific request.
   - Confirmed reproducible: `GET /admin/` (trailing slash) 308-redirects
     to `/admin`, which then serves the same unauthenticated dashboard.

**This is a genuine blocker, not a guess.** Also found, separately: even
without the bug, `proxy.ts`'s own `new URL("/login", request.url)`
redirect construction does **not** come out `basePath`-prefixed either
(confirmed: it redirected unauthenticated `/admin/products` to bare
`/login`, not `/admin/login`) — a second, independent issue with naive
`basePath` adoption on this specific codebase.

**Reverted immediately** (`git diff --stat admin/next.config.ts` shows no
difference from the committed version) and stopped both test servers.
Nothing from this experiment remains in the tree.

### Recommendation

Do not adopt bare `basePath: "/admin"` until the root cause is found and
re-tested — both bugs sit at the intersection of this framework version's
`proxy`/layout auth pattern and `basePath`, not in the admin app's own
auth logic (which is independently proven correct via 63 passing RLS/role
tests and works correctly without `basePath`). Two ways forward, neither
executed:
1. **Debug and fix**, then re-run the exact same 4 empirical checks above
   before trusting it.
2. **Avoid `basePath` entirely**: have the public site's rewrite strip the
   `/admin` prefix at the boundary (`destination` omits it, so the admin
   app receives ordinary unprefixed paths exactly as it does today,
   unchanged), and instead hardcode the `/admin` prefix only in the small,
   grep-able set of absolute-URL redirects (`proxy.ts`, `lib/auth.ts`) —
   more manual, but avoids whatever interaction causes the bug above, and
   is easier to verify exhaustively (there are few call sites).
3. A pragmatic fallback if neither is resolved before launch: deploy at a
   subdomain (`admin.guptainterior.in`) instead — no rewrite, no
   `basePath`, no risk — and revisit path-based routing later. This
   deviates from the requested URL and would need your explicit sign-off,
   not a unilateral substitution.

**Either way:** this must be fixed and **re-verified with the same kind of
real HTTP request testing done here** before any rewrite pointing at a
real admin deployment goes live — not assumed safe from documentation
alone, which is exactly what this test disproved.

## 7. Merge the feature branch, deploy the admin app, verify production

**[PRODUCTION-CHANGING — requires your go-ahead, and should come last]**

- Decide merge scope: `feat/admin-app` carries the entire separate `admin/`
  app *and* the public site's `app/api/revalidate/route.ts` together,
  since they live in one repo. Merging the whole branch is simplest;
  cherry-picking just the revalidate route first (so it's live sooner,
  independent of the admin app's own readiness) is the smaller, earlier
  alternative — your call, not a safety question either way.
- Push `feat/admin-app` to `origin` first, as its own step — it currently
  exists only on this laptop (per `docs/laptop2-admin-audit.md`), which is
  a backup/visibility risk independent of merging.
- Only after Stage 5 passes: merge to `main`, deploy `admin/` as its own
  Vercel project (Root Directory `admin`), set
  `REVALIDATE_SECRET`/`PUBLIC_REVALIDATE_SECRET` on both Vercel projects,
  and only then consider retiring `app/admin/` — as a later, separate,
  deliberate decision, not part of this stage.
- **The routing bug is fixed, and `basePath` + the rewrite are now both
  implemented and verified end-to-end locally** (see the "Update" in the
  routing section above — two real local servers, real HTTP requests
  through the public-facing port). What's left for this stage is
  deploying both as real Vercel projects and pointing `ADMIN_ZONE_ORIGIN`
  (an env var on the **root** site's Vercel project) at the admin
  project's real production URL — then re-running the exact same
  real-HTTP checks against that actual deployment, the same way they were
  run against `localhost:3001` here, before considering it trustworthy.
  Full sequencing is in `docs/final-activation-checklist.md`.

**Stop condition:** do not retire or remove `app/admin/` as part of this
stage. It stays live until the new admin app has been used in production
for however long you're comfortable with.

---

## Summary table

| Stage | Type | Needs your approval at the time? |
|---|---|---|
| 0. Branch/file audit | READ-ONLY | No — already done |
| 1. Backup | READ-ONLY to verify; the backup action itself is a Dashboard click only you can make | You trigger it |
| 2. Reconcile migration history | READ-ONLY | No |
| 3. Apply migration 6 | **PRODUCTION-CHANGING** | **Yes** |
| 4. Create first owner | **PRODUCTION-CHANGING** | **Yes** |
| 5. Integration tests | Mixed — read-only until a write test runs | **Yes**, per test |
| 6. Rollback plan | READ-ONLY | No — already written |
| 7. Merge/deploy/push | **PRODUCTION-CHANGING** | **Yes** |

Nothing in stages 3, 4, 5 (write parts), or 7 was executed while preparing
this document.
