-- Admin app (admin/): Supabase Auth roles, publication status, PDF library
-- metadata, PDF import candidates, enquiry follow-up, and an audit log.
--
-- ADDITIVE ONLY. No table, column or row is dropped. Existing public reads
-- keep working unchanged: the public site still filters on
-- products.is_visible through the existing RLS policy, and is_visible is
-- now kept in sync with the new products.status column by a trigger.
--
-- Trust model: the admin app talks to Postgres as the signed-in user (the
-- `authenticated` role + their JWT), so every permission below is enforced
-- by RLS, not by the app. The service-role key is only used for creating
-- staff logins (auth.admin API). Existing service-role scripts
-- (scripts/import/*) bypass RLS exactly as before.
--
-- Requires: 20261011160000_catalogue_curation_filters_and_source_pdfs.sql

-- 1. Admin users + role helpers ---------------------------------------------

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Who may use the admin app and with what role. A Supabase Auth login with no
   active row here has no admin access at all. Only owners can change rows
   (RLS); the first owner is inserted from the SQL editor or
   admin/scripts/create-owner.ts — see admin/README.md.';

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- Role of the calling user, or null. SECURITY DEFINER so policies on
-- admin_users itself can call it without recursing through RLS.
create or replace function public.admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admin_users
  where user_id = auth.uid() and is_active
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$ select public.admin_role() is not null $$;

create or replace function public.is_admin_editor()
returns boolean language sql stable as $$ select public.admin_role() in ('owner', 'editor') $$;

create or replace function public.is_admin_owner()
returns boolean language sql stable as $$ select public.admin_role() = 'owner' $$;

revoke all on function public.admin_role() from public, anon;
grant execute on function public.admin_role() to authenticated;

alter table public.admin_users enable row level security;

drop policy if exists "Admins read own row, owners read all" on public.admin_users;
create policy "Admins read own row, owners read all"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid() or public.is_admin_owner());

drop policy if exists "Owners manage admin users" on public.admin_users;
create policy "Owners manage admin users"
  on public.admin_users for all to authenticated
  using (public.is_admin_owner())
  with check (public.is_admin_owner());

-- Anyone may edit their own display name; admin_users_guard below rejects
-- any change to their own role, access, or email.
drop policy if exists "Admins update own profile" on public.admin_users;
create policy "Admins update own profile"
  on public.admin_users for update to authenticated
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid());

-- Guard rails no policy can express: never leave the shop without an active
-- owner, and never let anyone change their own role/active flag (an owner
-- demoting themself by accident is the realistic failure here).
create or replace function public.admin_users_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if tg_op in ('UPDATE', 'DELETE') and auth.uid() is not null and old.user_id = auth.uid() then
    if tg_op = 'DELETE' or new.role <> old.role or new.is_active <> old.is_active
       or new.email <> old.email or new.user_id <> old.user_id then
      raise exception 'You cannot change your own role or access. Ask another owner.'
        using errcode = 'P0001';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner' and old.is_active then
    select count(*) into remaining from public.admin_users
    where role = 'owner' and is_active and user_id <> old.user_id;
    if remaining = 0 and (tg_op = 'DELETE' or new.role <> 'owner' or not new.is_active) then
      raise exception 'There must always be at least one active owner.' using errcode = 'P0001';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists admin_users_guard on public.admin_users;
create trigger admin_users_guard
  before update or delete on public.admin_users
  for each row execute function public.admin_users_guard();

-- 2. Product publication status ---------------------------------------------

alter table public.products
  add column if not exists status text,
  add column if not exists archived_at timestamptz,
  add column if not exists tiles_per_box integer check (tiles_per_box is null or tiles_per_box > 0),
  add column if not exists coverage_per_box text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

-- Backfill from the existing curation columns, once. Visible rows are what
-- the public site shows today, so they are 'published'; hidden rows the
-- curation pass rejected are 'archived'; anything else hidden needs review.
update public.products
set status = case
  when is_visible then 'published'
  when review_status in ('hide', 'duplicate', 'invalid') then 'archived'
  else 'review'
end
where status is null;

alter table public.products alter column status set default 'published';
alter table public.products alter column status set not null;
alter table public.products drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check check (status in ('draft', 'review', 'published', 'archived'));

comment on column public.products.status is
  'draft / review / published / archived. Only published rows are public:
   is_visible is derived from this by products_sync_status (the public RLS
   policy still reads is_visible, so the public site needs no change).
   Default stays published so existing service-role import scripts that
   only set is_visible keep their behaviour.';

create index if not exists products_status_idx on public.products(status);
create index if not exists products_updated_at_idx on public.products(updated_at desc);

-- Keeps status <-> is_visible consistent whichever one a writer sets, and
-- stamps who made the change. Publishing from the admin app (a signed-in
-- user) additionally requires the minimum a customer needs to see: an image.
create or replace function public.products_sync_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'published' then
      new.is_visible := false;
    elsif new.is_visible = false then
      new.status := 'draft';
    end if;
    new.created_by := coalesce(new.created_by, auth.uid());
  else
    if new.status is distinct from old.status then
      new.is_visible := (new.status = 'published');
    elsif new.is_visible is distinct from old.is_visible then
      new.status := case when new.is_visible then 'published' else 'draft' end;
    end if;
  end if;

  if new.status = 'archived' and (tg_op = 'INSERT' or old.status <> 'archived') then
    new.archived_at := now();
  elsif new.status <> 'archived' then
    new.archived_at := null;
  end if;

  if auth.uid() is not null then
    new.updated_by := auth.uid();
    if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
      if tg_op = 'INSERT' or not exists (select 1 from public.product_images where product_id = new.id) then
        raise exception 'Add at least one product image before publishing.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists products_sync_status on public.products;
create trigger products_sync_status
  before insert or update on public.products
  for each row execute function public.products_sync_status();

-- 3. PDF library metadata ------------------------------------------------------

alter table public.source_pdfs
  add column if not exists description text,
  add column if not exists storage_path text,
  add column if not exists sha256 text,
  add column if not exists status text not null default 'ready',
  add column if not exists import_status text not null default 'not_started',
  add column if not exists archived_at timestamptz,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

alter table public.source_pdfs drop constraint if exists source_pdfs_status_check;
alter table public.source_pdfs
  add constraint source_pdfs_status_check check (status in ('uploading', 'ready', 'failed', 'archived'));
alter table public.source_pdfs drop constraint if exists source_pdfs_import_status_check;
alter table public.source_pdfs
  add constraint source_pdfs_import_status_check
  check (import_status in ('not_started', 'in_progress', 'reviewed'));

-- Same bytes = same document: a retried or repeated upload finds the
-- existing row instead of creating a second one.
create unique index if not exists source_pdfs_sha256_key on public.source_pdfs(sha256) where sha256 is not null;
create unique index if not exists source_pdfs_storage_path_key on public.source_pdfs(storage_path) where storage_path is not null;

comment on column public.source_pdfs.title is 'Display title. Renaming it never touches the stored file.';
comment on column public.source_pdfs.storage_path is 'Object path inside the "catalogues" bucket. Null for rows registered before the admin app.';
comment on column public.source_pdfs.sha256 is 'Hex SHA-256 of the uploaded file, computed in the browser before upload; used to detect re-uploads.';

-- Archived PDFs stay downloadable from products that already link them
-- (the public product page reads the row by FK), they just leave the
-- admin's active library. Public read policy is unchanged.

-- Homepage lookbooks can point at a library PDF instead of a second copy.
alter table public.catalogues
  add column if not exists source_pdf_id uuid references public.source_pdfs(id) on delete set null;

-- 4. PDF import candidates -----------------------------------------------------

create table if not exists public.pdf_import_candidates (
  id uuid primary key default gen_random_uuid(),
  source_pdf_id uuid not null references public.source_pdfs(id) on delete cascade,
  page integer not null check (page > 0),
  -- Crop rectangle as fractions (0..1) of the rendered page, so it can be
  -- re-rendered at any resolution from the untouched original PDF.
  crop jsonb not null,
  -- Stable identity of an auto-detected crop (page + embedded image box);
  -- null for manual crops. Re-running detection upserts on it.
  crop_key text,
  image_path text,
  image_url text,
  image_width integer,
  image_height integer,
  detection text not null default 'embedded_image' check (detection in ('embedded_image', 'manual')),
  suggested jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'skipped', 'created')),
  product_id uuid references public.products(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pdf_import_candidates is
  'Tile crops found in a source PDF, waiting for human review. Created by the
   admin app''s in-browser extractor. Nothing here is public; a product is
   only created when a reviewer approves a candidate, and it starts as a draft.';

create index if not exists pdf_import_candidates_pdf_idx on public.pdf_import_candidates(source_pdf_id, page);
create index if not exists pdf_import_candidates_status_idx on public.pdf_import_candidates(status);
-- Re-running detection on a page must not duplicate crops it already found.
alter table public.pdf_import_candidates drop constraint if exists pdf_import_candidates_crop_key_key;
alter table public.pdf_import_candidates
  add constraint pdf_import_candidates_crop_key_key unique (source_pdf_id, crop_key);

drop trigger if exists pdf_import_candidates_set_updated_at on public.pdf_import_candidates;
create trigger pdf_import_candidates_set_updated_at
  before update on public.pdf_import_candidates
  for each row execute function public.set_updated_at();

alter table public.pdf_import_candidates enable row level security;

-- 5. Enquiry follow-up ------------------------------------------------------------

alter table public.enquiries
  add column if not exists status text not null default 'new',
  add column if not exists staff_notes text,
  add column if not exists handled_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.enquiries drop constraint if exists enquiries_status_check;
alter table public.enquiries
  add constraint enquiries_status_check check (status in ('new', 'contacted', 'in_progress', 'closed'));

create index if not exists enquiries_created_at_idx on public.enquiries(created_at desc);
create index if not exists enquiries_status_idx on public.enquiries(status);

drop trigger if exists enquiries_set_updated_at on public.enquiries;
create trigger enquiries_set_updated_at
  before update on public.enquiries
  for each row execute function public.set_updated_at();

-- 6. Audit log ------------------------------------------------------------------------

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_label text,
  changes jsonb
);

comment on table public.audit_log is
  'Append-only record of admin-relevant changes, written only by database
   triggers (never by the app), so an entry cannot be forged or skipped by
   client code. actor_id is null for service-role scripts.';

create index if not exists audit_log_occurred_at_idx on public.audit_log(occurred_at desc);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id);

alter table public.audit_log enable row level security;

drop policy if exists "Admins read the audit log" on public.audit_log;
create policy "Admins read the audit log"
  on public.audit_log for select to authenticated using (public.is_admin());
-- No insert/update/delete policy: only the SECURITY DEFINER trigger writes.

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_row jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  row_data jsonb := coalesce(new_row, old_row);
  diff jsonb := '{}'::jsonb;
  key text;
  verb text := lower(tg_op);
  label text;
  -- Noise and anything credential-shaped never reaches the log.
  ignored text[] := array['updated_at', 'created_at', 'updated_by', 'password_hash'];
begin
  if tg_op = 'UPDATE' then
    for key in select jsonb_object_keys(new_row) loop
      if key <> all(ignored) and (old_row -> key) is distinct from (new_row -> key) then
        diff := diff || jsonb_build_object(key, jsonb_build_array(old_row -> key, new_row -> key));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return null;
    end if;
    if tg_table_name = 'products' and diff ? 'status' then
      verb := case new_row ->> 'status'
        when 'published' then 'published'
        when 'archived' then 'archived'
        else case when old_row ->> 'status' = 'archived' then 'restored'
                  when old_row ->> 'status' = 'published' then 'unpublished'
                  else 'updated' end
      end;
    else
      verb := 'updated';
    end if;
  elsif tg_op = 'INSERT' then
    verb := 'created';
  else
    verb := 'deleted';
  end if;

  label := coalesce(
    row_data ->> 'name', row_data ->> 'title', row_data ->> 'email',
    row_data ->> 'original_filename', row_data ->> 'image_url'
  );

  insert into public.audit_log (actor_id, actor_email, action, entity_type, entity_id, entity_label, changes)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    verb,
    tg_table_name,
    coalesce(row_data ->> 'id', row_data ->> 'user_id'),
    left(label, 200),
    case
      when tg_op = 'UPDATE' then diff
      when tg_table_name = 'product_images' then jsonb_build_object('product_id', row_data -> 'product_id')
      else null
    end
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['products', 'product_images', 'source_pdfs', 'categories', 'catalogues', 'admin_users'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$I
       for each row execute function public.audit_row_change()', t);
  end loop;
  -- Enquiries: log staff follow-up only, not every public submission.
  execute 'drop trigger if exists audit_enquiries on public.enquiries';
  execute 'create trigger audit_enquiries after update or delete on public.enquiries
           for each row execute function public.audit_row_change()';
end;
$$;

-- 7. Admin RLS policies on existing tables --------------------------------------------
-- Permissive policies are OR'd with the existing public read policies, so
-- anonymous visitors see exactly what they saw before.

-- products
drop policy if exists "Admins read all products" on public.products;
create policy "Admins read all products"
  on public.products for select to authenticated using (public.is_admin());
drop policy if exists "Editors insert products" on public.products;
create policy "Editors insert products"
  on public.products for insert to authenticated with check (public.is_admin_editor());
drop policy if exists "Editors update products" on public.products;
create policy "Editors update products"
  on public.products for update to authenticated
  using (public.is_admin_editor()) with check (public.is_admin_editor());
drop policy if exists "Owners delete products" on public.products;
create policy "Owners delete products"
  on public.products for delete to authenticated using (public.is_admin_owner());

-- product_images (public policy is using(true); hidden products' images are
-- harmless URLs, unchanged from today)
drop policy if exists "Editors manage product images" on public.product_images;
create policy "Editors manage product images"
  on public.product_images for all to authenticated
  using (public.is_admin_editor()) with check (public.is_admin_editor());

-- source_pdfs
drop policy if exists "Editors manage source PDFs" on public.source_pdfs;
create policy "Editors manage source PDFs"
  on public.source_pdfs for insert to authenticated with check (public.is_admin_editor());
drop policy if exists "Editors update source PDFs" on public.source_pdfs;
create policy "Editors update source PDFs"
  on public.source_pdfs for update to authenticated
  using (public.is_admin_editor()) with check (public.is_admin_editor());
drop policy if exists "Owners delete source PDFs" on public.source_pdfs;
create policy "Owners delete source PDFs"
  on public.source_pdfs for delete to authenticated using (public.is_admin_owner());

-- categories (public sees visible only; admins see all)
drop policy if exists "Admins read all categories" on public.categories;
create policy "Admins read all categories"
  on public.categories for select to authenticated using (public.is_admin());
drop policy if exists "Editors manage categories" on public.categories;
create policy "Editors manage categories"
  on public.categories for insert to authenticated with check (public.is_admin_editor());
drop policy if exists "Editors update categories" on public.categories;
create policy "Editors update categories"
  on public.categories for update to authenticated
  using (public.is_admin_editor()) with check (public.is_admin_editor());
drop policy if exists "Owners delete categories" on public.categories;
create policy "Owners delete categories"
  on public.categories for delete to authenticated using (public.is_admin_owner());

-- catalogues
drop policy if exists "Admins read all catalogues" on public.catalogues;
create policy "Admins read all catalogues"
  on public.catalogues for select to authenticated using (public.is_admin());
drop policy if exists "Editors manage catalogues" on public.catalogues;
create policy "Editors manage catalogues"
  on public.catalogues for all to authenticated
  using (public.is_admin_editor()) with check (public.is_admin_editor());

-- pdf_import_candidates
drop policy if exists "Admins read import candidates" on public.pdf_import_candidates;
create policy "Admins read import candidates"
  on public.pdf_import_candidates for select to authenticated using (public.is_admin());
drop policy if exists "Editors manage import candidates" on public.pdf_import_candidates;
create policy "Editors manage import candidates"
  on public.pdf_import_candidates for all to authenticated
  using (public.is_admin_editor()) with check (public.is_admin_editor());

-- enquiries: customer contact details are visible to owners and editors
-- only, never to read-only staff or the public.
drop policy if exists "Editors read enquiries" on public.enquiries;
create policy "Editors read enquiries"
  on public.enquiries for select to authenticated using (public.is_admin_editor());
drop policy if exists "Editors update enquiries" on public.enquiries;
create policy "Editors update enquiries"
  on public.enquiries for update to authenticated
  using (public.is_admin_editor()) with check (public.is_admin_editor());
drop policy if exists "Owners delete enquiries" on public.enquiries;
create policy "Owners delete enquiries"
  on public.enquiries for delete to authenticated using (public.is_admin_owner());

-- 8. Storage policies (buckets "tiles" and "catalogues" already exist and are
-- public-read). These only add write access for admin roles; the buckets'
-- own settings and existing objects are untouched.

drop policy if exists "Admin editors upload catalogue media" on storage.objects;
create policy "Admin editors upload catalogue media"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('tiles', 'catalogues') and public.is_admin_editor());

drop policy if exists "Admin editors update catalogue media" on storage.objects;
create policy "Admin editors update catalogue media"
  on storage.objects for update to authenticated
  using (bucket_id in ('tiles', 'catalogues') and public.is_admin_editor());

drop policy if exists "Admin owners delete catalogue media" on storage.objects;
create policy "Admin owners delete catalogue media"
  on storage.objects for delete to authenticated
  using (bucket_id in ('tiles', 'catalogues') and public.is_admin_owner());

-- Admins need SELECT on objects for list()/upsert checks in these buckets.
drop policy if exists "Admins list catalogue media" on storage.objects;
create policy "Admins list catalogue media"
  on storage.objects for select to authenticated
  using (bucket_id in ('tiles', 'catalogues') and public.is_admin());

-- 9. Admin RPCs ------------------------------------------------------------------------
-- SECURITY INVOKER unless noted, so RLS and the audit triggers apply to the
-- caller exactly as if they had run the statements themselves.

-- Replace a product's gallery (order + membership) in one transaction.
create or replace function public.admin_set_product_images(p_product_id uuid, p_image_urls text[])
returns void
language plpgsql
as $$
declare
  i integer;
begin
  if not public.is_admin_editor() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  delete from public.product_images
  where product_id = p_product_id and image_url <> all(coalesce(p_image_urls, '{}'));
  for i in 1 .. coalesce(array_length(p_image_urls, 1), 0) loop
    update public.product_images set sort_order = i - 1
    where product_id = p_product_id and image_url = p_image_urls[i];
    if not found then
      insert into public.product_images (product_id, image_url, sort_order)
      values (p_product_id, p_image_urls[i], i - 1);
    end if;
  end loop;
end;
$$;

-- Rename/merge one filter value across every product, as one reviewed
-- statement. Column is whitelisted; `rooms` is an array column.
create or replace function public.admin_rename_filter_value(p_column text, p_from text, p_to text)
returns integer
language plpgsql
as $$
declare
  affected integer;
begin
  if not public.is_admin_editor() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if p_column not in ('category', 'finish', 'size', 'color', 'application', 'pattern', 'thickness', 'series', 'material', 'rooms') then
    raise exception 'Unsupported filter: %', p_column using errcode = '22023';
  end if;
  if coalesce(trim(p_to), '') = '' then
    raise exception 'The new value cannot be empty.' using errcode = '22023';
  end if;

  if p_column = 'category' then
    update public.products set category = trim(p_to) where category = p_from;
    get diagnostics affected = row_count;
    -- Carry the managed category row (image, visibility, order) across a
    -- rename, unless the target name already has its own row.
    if not exists (select 1 from public.categories where name = trim(p_to)) then
      update public.categories set name = trim(p_to) where name = p_from;
    end if;
    return affected;
  elsif p_column = 'series' then
    -- series falls back to the legacy collection column on the public site.
    update public.products set series = trim(p_to) where coalesce(series, collection) = p_from;
  elsif p_column = 'rooms' then
    update public.products
    set rooms = (select array_agg(distinct r order by r) from unnest(array_replace(rooms, p_from, trim(p_to))) r)
    where p_from = any(rooms);
  elsif p_column = 'application' then
    -- application falls back to wall_or_floor on the public site; keep both aligned.
    update public.products
    set application = trim(p_to),
        wall_or_floor = case when trim(p_to) in ('Wall', 'Floor', 'Both') then trim(p_to) else wall_or_floor end
    where coalesce(application, wall_or_floor) = p_from;
  else
    execute format('update public.products set %1$I = $1 where %1$I = $2', p_column) using trim(p_to), p_from;
  end if;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Usage of every filter value (admin view, all statuses) in one round trip.
create or replace function public.admin_filter_values()
returns table (filter text, value text, total bigint, published bigint)
language sql
stable
as $$
  with p as (select * from public.products where public.is_admin())
  select 'category', category, count(*), count(*) filter (where status = 'published') from p group by category
  union all select 'finish', finish, count(*), count(*) filter (where status = 'published') from p where finish is not null group by finish
  union all select 'size', size, count(*), count(*) filter (where status = 'published') from p where size is not null group by size
  union all select 'color', color, count(*), count(*) filter (where status = 'published') from p where color is not null group by color
  union all select 'application', coalesce(application, wall_or_floor), count(*), count(*) filter (where status = 'published') from p where coalesce(application, wall_or_floor) is not null group by coalesce(application, wall_or_floor)
  union all select 'pattern', pattern, count(*), count(*) filter (where status = 'published') from p where pattern is not null group by pattern
  union all select 'thickness', thickness, count(*), count(*) filter (where status = 'published') from p where thickness is not null group by thickness
  union all select 'series', coalesce(series, collection), count(*), count(*) filter (where status = 'published') from p where coalesce(series, collection) is not null group by coalesce(series, collection)
  union all select 'material', material, count(*), count(*) filter (where status = 'published') from p where material is not null group by material
  union all select 'rooms', r, count(*), count(*) filter (where status = 'published') from p, unnest(p.rooms) r group by r
$$;

-- Media library: list objects in the two public buckets with where each is
-- used. Reads storage.objects (never writes it). SECURITY DEFINER because
-- `authenticated` can't read storage.objects across buckets otherwise; it
-- checks is_admin() itself.
create or replace function public.admin_media_objects(
  p_bucket text,
  p_search text default null,
  p_unused_only boolean default false,
  p_limit integer default 60,
  p_offset integer default 0
)
returns table (
  name text,
  size_bytes bigint,
  mime_type text,
  created_at timestamptz,
  product_refs bigint,
  published_refs bigint,
  other_refs bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if p_bucket not in ('tiles', 'catalogues') then
    raise exception 'Unsupported bucket.' using errcode = '22023';
  end if;

  return query
  with objs as (
    select o.name, o.created_at,
           (o.metadata ->> 'size')::bigint as size_bytes,
           o.metadata ->> 'mimetype' as mime_type
    from storage.objects o
    where o.bucket_id = p_bucket
      and (p_search is null or o.name ilike '%' || p_search || '%')
  ),
  refs as (
    select objs.*,
      (select count(*) from public.product_images pi where pi.image_url like '%/' || p_bucket || '/' || objs.name) as product_refs,
      (select count(*) from public.product_images pi join public.products pr on pr.id = pi.product_id
        where pr.status = 'published' and pi.image_url like '%/' || p_bucket || '/' || objs.name) as published_refs,
      (select count(*) from public.categories c where c.image_url like '%/' || p_bucket || '/' || objs.name)
      + (select count(*) from public.catalogues c where c.pdf_url like '%/' || p_bucket || '/' || objs.name or c.thumbnail_url like '%/' || p_bucket || '/' || objs.name)
      + (select count(*) from public.source_pdfs s where s.storage_path = objs.name or s.file_url like '%/' || p_bucket || '/' || objs.name)
      + (select count(*) from public.pdf_import_candidates c where c.image_path = objs.name and c.status in ('pending', 'approved'))
        as other_refs
    from objs
  ),
  filtered as (
    select * from refs where not p_unused_only or (refs.product_refs = 0 and refs.other_refs = 0)
  )
  select f.name, f.size_bytes, f.mime_type, f.created_at,
         f.product_refs, f.published_refs, f.other_refs,
         count(*) over ()
  from filtered f
  order by f.created_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end;
$$;

revoke all on function public.admin_media_objects(text, text, boolean, integer, integer) from public, anon;
grant execute on function public.admin_media_objects(text, text, boolean, integer, integer) to authenticated;

-- Product images whose URL points into one of our public buckets but whose
-- storage object no longer exists (shows as a broken image publicly).
-- External URLs are not checked. Read-only; SECURITY DEFINER for the same
-- reason as admin_media_objects.
create or replace function public.admin_broken_product_images()
returns table (image_id uuid, product_id uuid, product_name text, product_status text, image_url text)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  return query
  select pi.id, p.id, p.name, p.status, pi.image_url
  from public.product_images pi
  join public.products p on p.id = pi.product_id
  where pi.image_url ~ '/storage/v1/object/public/(tiles|catalogues)/'
    and not exists (
      select 1 from storage.objects o
      where o.bucket_id = substring(pi.image_url from '/storage/v1/object/public/([^/]+)/')
        and o.name = substring(pi.image_url from '/storage/v1/object/public/[^/]+/(.+)$')
    )
  order by p.name;
end;
$$;

revoke all on function public.admin_broken_product_images() from public, anon;
grant execute on function public.admin_broken_product_images() to authenticated;
