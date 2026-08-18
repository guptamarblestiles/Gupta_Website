-- Gupta Interior enhancements: optional pricing, category management,
-- PDF catalogues, and DB-backed admin auth.
--
-- All additive — no existing column, table, or row is renamed or dropped.
-- `products.category` stays the free-text column it already was (see
-- 20260816154500_rebuild_catalogue_schema.sql's comment on why it's not an
-- enum); `categories` is a separate lookup/management table that the admin
-- UI curates (name, image, visibility, sort order) and that the public
-- catalogue can join against by name to know whether a category with
-- products should render. This avoids a risky backfill of a new FK column
-- across existing product rows while still giving admins a real place to
-- manage category metadata and add categories with zero products yet.

-- 1. Optional pricing on products -------------------------------------------------

alter table public.products
  add column if not exists price numeric(12, 2),
  add column if not exists price_unit text,
  add column if not exists price_note text;

comment on column public.products.price is
  'Optional. Null/absent means no price is shown publicly — never render as 0.';
comment on column public.products.price_unit is
  'Optional short unit label, e.g. "per sq. ft." or "per slab".';
comment on column public.products.price_note is
  'Optional short admin note shown alongside the price, e.g. "starting from".';

-- 2. Categories ---------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categories is
  'Admin-managed product categories (Tiles, Marble, Bathware, ...). Matched
   to products.category by name for display purposes; a category with no
   matching products is never shown on the public site regardless of
   is_visible, but remains editable in admin so it can be prepared ahead of
   real content.';

create index if not exists categories_is_visible_idx on public.categories(is_visible);
create index if not exists categories_sort_order_idx on public.categories(sort_order);

alter table public.categories enable row level security;

create policy "Visible categories are publicly readable"
  on public.categories for select to anon, authenticated using (is_visible = true);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- 3. PDF catalogues -------------------------------------------------------------

create table if not exists public.catalogues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  pdf_url text not null,
  pdf_size_bytes bigint,
  thumbnail_url text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.catalogues is
  'PDF lookbooks/catalogues uploaded by admin, stored in the "catalogues"
   Supabase Storage bucket. Public site only ever lists rows with
   is_visible = true.';

create index if not exists catalogues_is_visible_idx on public.catalogues(is_visible);
create index if not exists catalogues_sort_order_idx on public.catalogues(sort_order);

alter table public.catalogues enable row level security;

create policy "Visible catalogues are publicly readable"
  on public.catalogues for select to anon, authenticated using (is_visible = true);

create trigger catalogues_set_updated_at
  before update on public.catalogues
  for each row execute function public.set_updated_at();

-- 4. DB-backed admin auth --------------------------------------------------------
--
-- Replaces the single ADMIN_PASSWORD env-var check with a hashed password
-- stored in the database so it can be changed from the admin UI. No RLS
-- select policy for anon/authenticated is added on purpose — this table is
-- only ever touched via the service-role client from server-only code
-- (lib/admin/session.ts), the same trust boundary the rest of /admin
-- already relies on.

create table if not exists public.admin_auth (
  id uuid primary key default gen_random_uuid(),
  username text not null unique default 'admin',
  password_hash text not null,
  updated_at timestamptz not null default now()
);

comment on table public.admin_auth is
  'Single-row (in practice) admin credential store. password_hash is a
   bcrypt hash — never plaintext. Seeded once via scripts/seed-admin-auth.ts
   with the initial password; changed thereafter via the admin "Change
   Password" form (lib/admin/passwordActions.ts).';

alter table public.admin_auth enable row level security;

create trigger admin_auth_set_updated_at
  before update on public.admin_auth
  for each row execute function public.set_updated_at();
