# Owner actions checklist

Things only the site owner can do. No secrets belong in this file.

## Secrets and environment (Vercel)
- [ ] Rotate the exposed Supabase secret key (Supabase > Project Settings > API Keys), update `SUPABASE_SECRET_KEY` on Vercel for **all environments**, then redeploy.
- [ ] Check env var names for **Production and Preview**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `..._ANON_KEY`), `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL` (https://www.guptainterior.in), `NEXT_PUBLIC_ADMIN_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
- [ ] Delete the dead `ADMIN_PASSWORD` variable (and `ADMIN_SESSION_SECRET` / `REVALIDATE_SECRET` if present) from Vercel. The code no longer reads them.

## Database (Supabase SQL editor)
- [ ] Review, then run `supabase/migrations/20261116090000_enquiries_abuse_limits.sql` in the SQL editor. Do **not** run `supabase db push`: an older migration contains `DROP TABLE`.
- [ ] After confirming nothing uses it, drop the legacy table:
  ```sql
  -- drop table public.admin_auth;
  ```

## Supabase Auth settings
- [ ] Site URL and Redirect URLs restricted to the production domain only.
- [ ] Enable CAPTCHA protection.
- [ ] Enable leaked-password protection.
- [ ] Require MFA for owner accounts.

## Account security and cost control
- [ ] Turn on 2FA for Vercel, GitHub, Supabase and GoDaddy.
- [ ] Set spend/usage alerts on Supabase and Vercel.
- [ ] Consider Supabase Pro (backups, no project pausing, higher limits).
- [ ] Move source PDFs that are not meant to be published to a private storage bucket.

## After deploy
- [ ] Send one real test enquiry and one newsletter sign-up from the live site; confirm both rows appear in the admin Enquiries list and the email arrives.
- [ ] Confirm with the client that public claims are accurate before keeping them on the site: 15+ years, 5,000+ projects, ISO certified.
