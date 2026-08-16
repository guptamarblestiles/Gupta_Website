-- Rebuild the catalogue schema for the fresh product dataset.
--
-- The old products/product_images tables (and their 526-row / 1,497-image
-- seed from the legacy CSV pipeline) are dropped entirely per an explicit
-- decision to start product data fresh from a new local image folder — see
-- Part 2's import workflow. `enquiries` is untouched (product_id there is
-- already a nullable free-text column, not an FK, so it's unaffected by
-- swapping the products table under it).
--
-- New columns (color, wall_or_floor, collection) support the admin panel
-- and filter system. RLS policy shape matches the old migration: public
-- read-only, all writes go through the service-role client (admin panel /
-- import scripts), which bypasses RLS.

drop table if exists public.product_images;
drop table if exists public.products;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  product_code text not null unique,
  category text not null,
  finish text,
  size text,
  color text,
  wall_or_floor text check (wall_or_floor in ('Wall', 'Floor', 'Both')),
  collection text,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is
  'Catalogue products, sourced from admin import of local image folders (see scripts/import).';

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.product_images is
  'Gallery images for a product (3-5 rows), ordered by sort_order; sort_order 0 is primary.';

create index product_images_product_id_idx on public.product_images(product_id);
create index products_category_idx on public.products(category);
create index products_finish_idx on public.products(finish);
create index products_wall_or_floor_idx on public.products(wall_or_floor);
create index products_collection_idx on public.products(collection);

alter table public.products enable row level security;
alter table public.product_images enable row level security;

create policy "Products are publicly readable"
  on public.products for select to anon, authenticated using (true);

create policy "Product images are publicly readable"
  on public.product_images for select to anon, authenticated using (true);

-- updated_at auto-touch, mirrors the pattern admin edits rely on.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
