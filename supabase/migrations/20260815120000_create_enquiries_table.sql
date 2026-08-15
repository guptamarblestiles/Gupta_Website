-- Enquiry form submissions (brief section 40 / build task 10).
--
-- Written to be applied later with `supabase db push` (or the SQL editor)
-- once real project credentials exist — NOT applied automatically. The
-- shape here matches the insert payload built by
-- lib/enquiry/actions.ts#submitEnquiry.
--
-- RLS is public-INSERT-only: anyone can submit an enquiry (it's a public
-- lead-gen form), but nobody can read, update, or delete rows through the
-- public API. Reading enquiries is an admin/service-role concern (Supabase
-- Studio, or a future authenticated admin view), which bypasses RLS.

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  product_id text,
  product_name text,
  message text not null,
  created_at timestamptz not null default now()
);

comment on table public.enquiries is
  'Customer enquiries submitted from the site enquiry form (product detail pages).';

alter table public.enquiries enable row level security;

-- Public (anon + authenticated) may insert their own enquiry. No select,
-- update, or delete policy exists for these roles, so submissions are
-- write-only from the client's perspective.
create policy "Anyone can submit an enquiry"
  on public.enquiries
  for insert
  to anon, authenticated
  with check (true);
