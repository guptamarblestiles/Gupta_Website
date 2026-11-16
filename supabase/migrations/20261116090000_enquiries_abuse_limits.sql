-- Enquiries abuse limits.
--
-- NOT APPLIED. Review, then run manually in the Supabase SQL editor.
-- Do NOT use `supabase db push` for this project (an older migration
-- contains DROP TABLE).
--
-- What it does:
--   1. CHECK constraints on public.enquiries mirroring the zod limits in
--      lib/enquiry/schema.ts (name<=120, email<=254, phone<=30,
--      message<=2000, product_id<=64, product_name<=200; name/message
--      non-empty; email contains '@').
--   2. Column-level INSERT privilege for anon: the public API can only set
--      name, email, phone, product_id, product_name, message. status,
--      staff_notes, handled_by, id, created_at, updated_at use defaults.
--      (The server action inserts exactly those six columns.)
--
-- Existing rows: constraints are added NOT VALID so old rows can never block
-- this migration; they still apply to every new insert/update. Run
-- `alter table public.enquiries validate constraint <name>;` later if
-- you want them checked against old data too.
--
-- The existing insert policy "Anyone can submit an enquiry" (anon,
-- authenticated; with check (true)) is left unchanged and still permits the
-- six-column insert. Table-level INSERT is also revoked from `authenticated`
-- and re-granted with the same column list, so signed-in staff cannot
-- pre-set staff fields via the REST API either (staff edit via UPDATE,
-- which is unaffected). The service role bypasses all of this.

begin;

alter table public.enquiries drop constraint if exists enquiries_name_check;
alter table public.enquiries
  add constraint enquiries_name_check
  check (char_length(btrim(name)) between 1 and 120) not valid;

alter table public.enquiries drop constraint if exists enquiries_email_check;
alter table public.enquiries
  add constraint enquiries_email_check
  check (char_length(email) <= 254 and position('@' in email) > 1) not valid;

alter table public.enquiries drop constraint if exists enquiries_phone_check;
alter table public.enquiries
  add constraint enquiries_phone_check
  check (phone is null or char_length(phone) <= 30) not valid;

alter table public.enquiries drop constraint if exists enquiries_message_check;
alter table public.enquiries
  add constraint enquiries_message_check
  check (char_length(btrim(message)) between 1 and 2000) not valid;

alter table public.enquiries drop constraint if exists enquiries_product_id_check;
alter table public.enquiries
  add constraint enquiries_product_id_check
  check (product_id is null or char_length(product_id) <= 64) not valid;

alter table public.enquiries drop constraint if exists enquiries_product_name_check;
alter table public.enquiries
  add constraint enquiries_product_name_check
  check (product_name is null or char_length(product_name) <= 200) not valid;

-- Column-level insert: only the intended public columns.
revoke insert on public.enquiries from anon;
grant insert (name, email, phone, product_id, product_name, message)
  on public.enquiries to anon;

revoke insert on public.enquiries from authenticated;
grant insert (name, email, phone, product_id, product_name, message)
  on public.enquiries to authenticated;

commit;

-- ROLLBACK (run manually only if needed) -----------------------------------
-- begin;
-- alter table public.enquiries drop constraint if exists enquiries_name_check;
-- alter table public.enquiries drop constraint if exists enquiries_email_check;
-- alter table public.enquiries drop constraint if exists enquiries_phone_check;
-- alter table public.enquiries drop constraint if exists enquiries_message_check;
-- alter table public.enquiries drop constraint if exists enquiries_product_id_check;
-- alter table public.enquiries drop constraint if exists enquiries_product_name_check;
-- revoke insert (name, email, phone, product_id, product_name, message)
--   on public.enquiries from anon, authenticated;
-- grant insert on public.enquiries to anon, authenticated;
-- commit;
