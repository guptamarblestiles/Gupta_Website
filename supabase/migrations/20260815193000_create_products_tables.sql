-- Catalogue schema (build task: "switch data layer to live Supabase").
-- Column shapes mirror types/product.ts's Product / ProductImage exactly,
-- so lib/products/queries.ts can map a row straight onto the app's types.
--
-- RLS: both tables are public-readable (the catalogue has no auth), but
-- carry no insert/update/delete policy for anon/authenticated — writes
-- only happen server-side via the service-role key (seeding scripts,
-- future admin tooling), which bypasses RLS entirely.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  product_code text not null unique,
  category text not null check (category in ('Marble Slabs', 'Granite Slabs', 'GVT Tiles', 'Bathroom Tiles')),
  finish text not null check (finish in ('Polished', 'Honed', 'Matte', 'Leathered')),
  size text not null,
  origin text,
  material text,
  available_finishes text,
  description text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is
  'Catalogue products — marble/granite slabs, GVT tiles, bathroom tiles.';

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt text not null default '',
  sort_order integer not null default 0
);

comment on table public.product_images is
  'Gallery images for a product, ordered by sort_order. One row per image.';

create index if not exists product_images_product_id_idx on public.product_images(product_id);

alter table public.products enable row level security;
alter table public.product_images enable row level security;

create policy "Products are publicly readable"
  on public.products
  for select
  to anon, authenticated
  using (true);

create policy "Product images are publicly readable"
  on public.product_images
  for select
  to anon, authenticated
  using (true);
