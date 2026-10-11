-- Catalogue curation: reversible visibility, normalized filter columns,
-- and source-PDF linking.
--
-- ADDITIVE ONLY. Nothing is dropped, renamed or deleted. Existing rows keep
-- is_visible = true, so the public site is unchanged until rows are
-- explicitly hidden (reversible: set is_visible back to true).

-- 1. Visibility + review state ------------------------------------------------

alter table public.products
  add column if not exists is_visible boolean not null default true,
  add column if not exists review_status text
    check (review_status in ('keep', 'review', 'hide', 'duplicate', 'invalid')),
  add column if not exists review_note text;

comment on column public.products.is_visible is
  'Public visibility. false = hidden from catalogue/search/sitemap but the row and its images are kept (reversible).';
comment on column public.products.review_status is
  'Cleanup classification: keep / review / hide / duplicate / invalid. Informational; is_visible is what controls display.';

-- 2. Normalized filter columns -------------------------------------------------

alter table public.products
  add column if not exists application text,
  add column if not exists rooms text[] not null default '{}',
  add column if not exists pattern text,
  add column if not exists thickness text,
  add column if not exists material text,
  add column if not exists series text,
  add column if not exists finish_detail text,
  add column if not exists faces integer;

comment on column public.products.application is 'Wall / Floor / Both (mirrors wall_or_floor for new imports).';
comment on column public.products.rooms is 'Rooms the tile is suited for, e.g. {Bathroom,Kitchen}. Empty = not stated.';
comment on column public.products.series is 'Series / collection label printed in the source PDF (e.g. Kitchen Series).';
comment on column public.products.thickness is 'Printed thickness, e.g. "9 mm". Null = not stated.';

-- 3. Source PDFs -----------------------------------------------------------------

create table if not exists public.source_pdfs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  original_filename text not null unique,
  file_url text,
  file_size_bytes bigint,
  page_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.source_pdfs is
  'Original manufacturer/brand PDFs products were curated from. file_url is null until the PDF is uploaded; the product page then shows an "unavailable" state instead of a broken link.';

alter table public.products
  add column if not exists source_pdf_id uuid references public.source_pdfs(id) on delete set null,
  add column if not exists source_page integer;

alter table public.source_pdfs enable row level security;

drop policy if exists "Source PDFs are publicly readable" on public.source_pdfs;
create policy "Source PDFs are publicly readable"
  on public.source_pdfs for select to anon, authenticated using (true);

drop trigger if exists source_pdfs_set_updated_at on public.source_pdfs;
create trigger source_pdfs_set_updated_at
  before update on public.source_pdfs
  for each row execute function public.set_updated_at();

-- 4. Public read policy honours visibility ---------------------------------------

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select to anon, authenticated using (is_visible = true);

-- 5. Indexes for filtered columns ----------------------------------------------

create index if not exists products_is_visible_idx on public.products(is_visible);
create index if not exists products_application_idx on public.products(application);
create index if not exists products_pattern_idx on public.products(pattern);
create index if not exists products_thickness_idx on public.products(thickness);
create index if not exists products_series_idx on public.products(series);
create index if not exists products_rooms_gin_idx on public.products using gin (rooms);
create index if not exists products_source_pdf_idx on public.products(source_pdf_id);
