# Migration 6 production review — `20261012090000_admin_app_roles_status_audit.sql`

**No SQL was executed against production to produce this review.** Everything
below comes from reading the file itself
(`supabase/migrations/20261012090000_admin_app_roles_status_audit.sql`, 725
lines), its stated dependency
(`supabase/migrations/20261011160000_catalogue_curation_filters_and_source_pdfs.sql`),
and the read-only Phase 8 findings in `docs/admin-integration-report.md`
(real schema state, confirmed via authenticated REST probes).

**File:** `supabase/migrations/20261012090000_admin_app_roles_status_audit.sql`
**Depends on:** `20261011160000_catalogue_curation_filters_and_source_pdfs.sql` — confirmed **already applied** (Phase 8).

## 1. Every operation in the file, nothing omitted

### CREATE
- `public.admin_users` (table) — owner/editor/viewer role per Supabase Auth user.
- `public.pdf_import_candidates` (table) — PDF-import review queue.
- `public.audit_log` (table) — append-only change log.
- Functions: `admin_role()`, `is_admin()`, `is_admin_editor()`, `is_admin_owner()`, `admin_users_guard()`, `products_sync_status()`, `audit_row_change()`, `admin_set_product_images()`, `admin_rename_filter_value()`, `admin_filter_values()`, `admin_media_objects()`, `admin_broken_product_images()`.
- Triggers: `admin_users_set_updated_at`, `admin_users_guard`, `products_sync_status`, `pdf_import_candidates_set_updated_at`, `enquiries_set_updated_at`, and — via a loop — `audit_products`, `audit_product_images`, `audit_source_pdfs`, `audit_categories`, `audit_catalogues`, `audit_admin_users`, plus `audit_enquiries` added separately.
- Policies (RLS): 3 on `admin_users`, 1 on `audit_log`, 4 on `products`, 1 on `product_images`, 2 on `source_pdfs`, 3 on `categories`, 2 on `catalogues`, 2 on `pdf_import_candidates`, 2 on `enquiries`, 4 on `storage.objects` — **21 new policies total**, all `create policy` preceded by `drop policy if exists` (idempotent, not a sign anything currently exists to drop).
- Indexes: `products_status_idx`, `products_updated_at_idx`, `source_pdfs_sha256_key` (unique), `source_pdfs_storage_path_key` (unique), `pdf_import_candidates_pdf_idx`, `pdf_import_candidates_status_idx`, `enquiries_created_at_idx`, `enquiries_status_idx`, `audit_log_occurred_at_idx`, `audit_log_entity_idx`.

### ALTER
- `public.products`: **add column** `status`, `archived_at`, `tiles_per_box`, `coverage_per_box`, `created_by`, `updated_by`; then `alter column status set default 'published'`, `set not null`; add constraint `products_status_check`.
- `public.source_pdfs`: **add column** `description`, `storage_path`, `sha256`, `status` (`not null default 'ready'`), `import_status` (`not null default 'not_started'`), `archived_at`, `uploaded_by`; add 2 check constraints.
- `public.catalogues`: **add column** `source_pdf_id` (nullable FK).
- `public.enquiries`: **add column** `status` (`not null default 'new'`), `staff_notes`, `handled_by`, `updated_at` (`not null default now()`); add check constraint.
- `public.admin_users`, `public.pdf_import_candidates`, `public.audit_log`: **enable row level security**.

### DROP
Every `drop` in the file is `drop trigger/policy/constraint **if exists**`, immediately followed by `create` of the same object in the same statement block. None of these removes a currently-existing, in-use object permanently — they're the standard "make this idempotent" pattern, confirmed by reading each one in context. **No table, column, or row is ever dropped by this file.**

### UPDATE — the one real data-modifying statement
```sql
update public.products
set status = case
  when is_visible then 'published'
  when review_status in ('hide', 'duplicate', 'invalid') then 'archived'
  else 'review'
end
where status is null;
```
This runs once, against **every existing product row** (the live catalogue).
It is idempotent (re-running it is a no-op once `status` is no longer
null), but it **is a write to current production data**, not merely a
schema change — see Risk #1 below for its real side effect.

### DELETE / INSERT
No bare `delete`/`insert` statement runs *during migration apply*. The only
`delete`/`insert` in the file are **inside function bodies**
(`admin_set_product_images`'s `delete from product_images`,
`audit_row_change`'s `insert into audit_log`) — these execute later, only
when the admin app calls them, not when this migration is applied.

### GRANT / REVOKE
- `admin_role()`, `admin_media_objects()`, `admin_broken_product_images()`:
  `revoke all ... from public, anon` then `grant execute ... to authenticated`.
  Nothing is revoked from any role that currently has access to anything
  else — these are brand-new functions.

### Storage policy changes
4 new policies on `storage.objects`, scoped to `bucket_id in ('tiles',
'catalogues')`, gating **insert/update/delete/select for the `authenticated`
role only**, each requiring `is_admin_editor()` or `is_admin_owner()`. They
**add** write access for admin roles; they do not touch, narrow, or remove
the buckets' existing public-read configuration.

## 2. Dependency check against the real schema (Phase 8 evidence, not assumed)

| Migration 6 depends on | Phase 8 finding |
|---|---|
| `products.is_visible`, `products.review_status` (used in the backfill `case`) | ✅ Confirmed to exist (`200` on a column-select probe) |
| `public.categories`, `public.catalogues`, `public.source_pdfs` | ✅ Confirmed to exist |
| `public.enquiries` | ✅ Confirmed to exist |
| `public.set_updated_at()` function (reused by 3 new triggers here) | **Not independently re-confirmed this pass** — it was created in migration 3 and is almost certainly present (today's `products.updated_at` already auto-updates in production, which that function is what makes happen), but no direct probe of function existence was run. Add to pre-flight validation (§4) before applying. |
| `public.collection`, `public.wall_or_floor` columns (read by `admin_rename_filter_value`) | Not directly probed this pass (not in the Phase 8 query list) but documented as present since migration 3; add to pre-flight validation. |
| `auth.users` (Supabase Auth's own table) | Always present on a Supabase project; not a risk. |

**Nothing migration 6 depends on was found missing.** The one true
prerequisite called out in the file's own header comment —
`20261011160000` — is confirmed applied.

## 3. Effect on existing data, the public website, `admin_auth`, and permissions

- **Existing products:** every row's `status` is set once (backfill above),
  and — because the already-existing `products_set_updated_at` trigger
  (from migration 3) fires on *any* update — **every product's
  `updated_at` timestamp will change to the migration's run time.**
  Checked, not assumed: grepped the public site's code
  (`lib/products/queries.ts`, every `.tsx` file) — nothing sorts or
  displays `updated_at`/`updatedAt` anywhere. This side effect is real but
  **invisible to customers**.
- **Existing images, categories, catalogues:** no existing values change.
  New columns are nullable or have safe defaults; new admin-only RLS
  policies are additive and `OR`'d with the existing public policies.
- **Public website access:** the public `"Products are publicly readable"`
  policy (added in migration 5, keyed on `is_visible`) is **not touched**
  by migration 6 at all — no public-facing policy is replaced or narrowed.
- **`admin_auth` (legacy password table):** **not referenced anywhere in
  this file.** Confirmed by reading the full 725 lines — the string
  `admin_auth` does not appear. Completely unaffected.
- **Legacy `app/admin/`'s existing read/write code (`lib/admin/products.ts`,
  checked directly, not assumed):** its `ProductInput` type and every
  `insert`/`update` call **never sets `status` or `is_visible`**. Traced
  through `products_sync_status()`'s logic with that fact:
  - `createProduct` (insert, no `status`/`is_visible` given): both take
    their table defaults (`status = 'published'`, `is_visible = true`) —
    the trigger's own branches both evaluate to "no change needed." Same
    outcome as today (new legacy products are immediately live).
  - `updateProduct` (update, no `status`/`is_visible` in the payload):
    both `new.status is distinct from old.status` and `new.is_visible is
    distinct from old.is_visible` are false — the trigger takes no action,
    raises no exception. **The legacy admin's save flow is unaffected.**
  - Every legacy write to `products`/`product_images`/`categories`/
    `catalogues` will, after this migration, **also silently write a row
    to `audit_log`** (via the new `audit_*` triggers, which fire for any
    role including service-role). This is a real, new side effect —
    harmless (an extra append-only log row, invisible to the legacy app,
    visible only inside the new admin app), but worth knowing about rather
    than discovering later.
- **Existing permissions:** nothing is revoked from `anon` or from the
  service-role path the legacy admin uses. All new RLS policies are scoped
  to `authenticated` (real Supabase Auth sessions) and are additive.

## 4. Pre-migration validation — read-only, safe to run, changes nothing

Run these in Supabase Studio's SQL editor (or via the same authenticated
REST-probe technique used in Phase 8) **before** applying, to close the two
"not independently re-confirmed" gaps above and get a final snapshot:

```sql
-- Confirms the function migration 6's new triggers depend on exists.
select proname from pg_proc where proname = 'set_updated_at';

-- Confirms the columns admin_rename_filter_value() reads exist.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'products'
  and column_name in ('collection', 'wall_or_floor', 'is_visible', 'review_status');

-- Snapshot of current policies on the tables migration 6 will add policies
-- to, so you can compare before/after and confirm nothing unexpected
-- was already there under a colliding name.
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('products', 'product_images', 'source_pdfs', 'categories', 'catalogues', 'enquiries')
order by tablename, policyname;

-- Snapshot of existing triggers on the same tables, same reason.
select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;

-- Row counts right now, to compare against after applying (should be identical).
select
  (select count(*) from public.products) as products,
  (select count(*) from public.product_images) as product_images,
  (select count(*) from public.categories) as categories,
  (select count(*) from public.catalogues) as catalogues,
  (select count(*) from public.source_pdfs) as source_pdfs,
  (select count(*) from public.enquiries) as enquiries;
```

## 5. Backup requirements — specific, not generic

1. **Supabase Dashboard → Database → Backups.** Confirm what's available on
   this project's plan (daily backups on free/Pro, Point-in-Time Recovery
   only on higher tiers) and trigger/confirm a fresh backup immediately
   before applying — don't rely on the most recent scheduled one.
2. **Belt-and-suspenders:** export the row-count query's tables via the SQL
   editor's CSV export, or a `pg_dump` of at minimum `products`,
   `product_images`, `categories`, `catalogues`, `source_pdfs`,
   `enquiries`, `admin_auth` using the connection string from Database →
   Settings → Connection string, *before* applying. This is cheap insurance
   specifically against the `updated_at` bump (§3) being something you
   later wish you could compare against.
3. Do this **even though the migration is additive** — the backfill `UPDATE`
   in §1 is the one statement that writes to existing rows, and "additive
   schema, but one real UPDATE" is exactly the situation a backup is for.

## 6. Rollback limitations — stated plainly, not minimized

**There is no automatic rollback/down-migration in this repo.** If this
needs to be undone after applying, it would require a hand-written reverse
migration that:
- Drops `admin_users`, `pdf_import_candidates`, `audit_log` and their
  triggers/functions/policies.
- Drops the 4 new storage policies.
- Drops the 21 new RLS policies on existing tables.
- Drops the new columns on `products`, `source_pdfs`, `catalogues`,
  `enquiries`.

**What that rollback cannot restore:**
- The `updated_at` bump on every product row (§3) — the old values are
  gone unless recovered from the backup in §5.
- Any admin role assignments, audit-log history, or PDF-import-candidate
  rows created *between* applying and rolling back — those are discarded
  entirely, with no partial-recovery path.
- If the first owner was created and used the admin app to publish/
  archive/edit products in that window, those product-level changes
  (which went through the *normal* products table, not a migration-6-only
  table) would **not** be undone by dropping migration 6's objects — a
  rollback of the migration does not roll back subsequent application use.

**Conclusion: rollback is possible but not "easy" or complete.** Treat
applying this migration as a decision made with the backup in §5 as the
real safety net, not the ability to cleanly reverse it afterward.

## 7. Verdict

**Safe to apply as written, with no SQL modification needed**, once:
- The two unconfirmed dependencies (`set_updated_at()` function,
  `collection`/`wall_or_floor` columns) are checked via §4 — they are
  almost certainly fine (products already auto-update their `updated_at`
  today, which implies the function exists), but "almost certainly" should
  become "confirmed" before a production write.
- A backup per §5 is taken immediately beforehand.
- You've accepted the two disclosed side effects: every product's
  `updated_at` will change (cosmetically invisible to customers, confirmed
  by code search) and the legacy `app/admin/`'s future writes will start
  silently creating `audit_log` rows (harmless, additive, confirmed by
  tracing its actual insert/update code).

No destructive operation, no narrowing of existing public access, and no
effect on `admin_auth` or the legacy admin's correctness was found. The
evidence for each claim above is cited inline rather than asserted.

**This review does not itself apply anything.** Applying migration 6 is a
separate, explicit action for you to approve — see
`docs/admin-integration-next-steps.md` for exactly where that sits in the
overall sequence.
