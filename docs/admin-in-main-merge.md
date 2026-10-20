# Admin merged into the main app

The separate `admin/` Next.js app (previously its own Vercel project,
stitched in via `ADMIN_ZONE_ORIGIN`/rewrites) now lives inside this app:

- Routes: `admin/app/*` → `app/admin/*`. No `basePath` — `/admin/*` URLs are
  real file-based routes now, not a rewrite target.
- Everything else (`lib`, `components`, `actions`, `scripts`, `tests`) →
  `admin-src/*`, kept as one tree with its own path alias (`@admin/*` →
  `./admin-src/*` in `tsconfig.json`) so it can never collide with the
  public site's own `lib/`/`components/` folders — a real collision was
  found and avoided: both had `lib/supabase/server.ts`,
  `components/ui/Button.tsx`, and `components/ui/Field.tsx` with different
  implementations.
- `proxy.ts`: one combined file. Public routes pass straight through
  (zero behavior change). `/admin/*` is gated by a real Supabase Auth
  session, replacing the legacy password-cookie gate entirely.
- `app/admin/layout.tsx`: a nested layout, not a second root layout — Next
  only allows one `<html>`/`<body>` (owned by `app/layout.tsx`, untouched).
  Admin's own look comes from a wrapper `<div>` plus its own `globals.css`,
  scoped to `/admin/*` by Next's per-route CSS loading.
- CSS token collision found and fixed: both design systems defined
  `--color-surface` with different values. Renamed admin's to
  `--color-admin-surface`/`--color-admin-surface-muted` (and the matching
  `bg-admin-surface`/etc. utility classes across admin's own components)
  rather than touching the public site's tokens.
- `app/api/revalidate/route.ts` and the `REVALIDATE_SECRET`/
  `PUBLIC_REVALIDATE_SECRET` env vars are gone — admin's server actions call
  `revalidatePath()` directly now (same process, no HTTP round trip needed).
- The legacy admin (`app/admin/(protected)/*`, `lib/admin/*`,
  `components/admin/*`, `app/api/admin/import-image`, `lib/import/*`) is
  deleted outright — confirmed via full-repo grep that nothing public
  imported from any of it before removing it.
- Three now-orphaned one-time scripts deleted too (their only dependency
  was the deleted legacy code, and each was already a completed one-time
  job per its own docstring): `scripts/admin/seedAdminAuth.ts`,
  `scripts/import/bulkImport.ts`, `scripts/import/importCurated.ts`.

## Env vars

No new ones needed. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY` already exist on the one Vercel project both halves
now share. `NEXT_PUBLIC_ADMIN_URL`, `PUBLIC_SITE_URL`,
`PUBLIC_REVALIDATE_SECRET`/`REVALIDATE_SECRET` are gone — they only existed
for the two-app, two-origin setup.

## Local demo mode

`ADMIN_DEMO=1 NEXT_PUBLIC_ADMIN_DEMO=1 npm run dev`, then visit
`/admin/login` (demo owner: `owner@demo.local`, any password). Demo mode
still requires `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
to be *set* (any value, including a placeholder) — `signIn()` checks
`isSupabaseConfigured` before the demo fake-client swap ever runs.
