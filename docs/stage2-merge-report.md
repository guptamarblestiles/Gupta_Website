# Stage 2 — merge new admin app, verify, no production effect

Date: 2026-10-19
Branch: `feat/admin-integration`, merge commit `c05e980` (two parents:
`782c73f` Stage 1 baseline, `4041709` tip of `origin/feat/admin-app`)

## Merge

- `git merge origin/feat/admin-app` into `feat/admin-integration`.
- Conflicts only in `tsconfig.json` and `eslint.config.mjs` (both exclusion
  lists), resolved by keeping **both** entries:
  - `tsconfig.json` → `"exclude": ["node_modules", "admin panel", "admin"]`
  - `eslint.config.mjs` → `globalIgnores([..., "admin panel/**", "admin/**"])`
  - **Action needed from you later:** once `admin panel/` is deleted (Stage
    6), remove the `"admin panel"` / `"admin panel/**"` entries from these
    two files — they'll be dead weight once that folder is gone.
- `next.config.ts` / `proxy.ts` merged cleanly (no conflict): both carry the
  `ADMIN_ZONE_ORIGIN` rewrite/gate, **unset**, confirmed inert (see below).
- One correction during the merge: my first attempt at resolving the
  conflicts went through a `git stash`/`git stash pop` to temporarily check
  something against the pre-merge tree, which silently dropped the
  in-progress `MERGE_HEAD` and produced a single-parent commit instead of a
  real merge. Caught it, reset, and rebuilt the commit properly with
  `git commit-tree` so history correctly shows both parents.
- No `.env*` (other than the two untouched `.env.local.example` /
  `admin/.env.example` key-name templates — no real values in either), no
  `.vercel`, no `.next`, no `node_modules` from the clone entered git.
  `"admin panel/"` itself never appeared in `git status` throughout (stays
  excluded via `.git/info/exclude` from Stage 0).

## Root checks (public site), post-merge

- `npx tsc --noEmit` — pass.
- `npm run lint` — pass.
- `npm run build` — pass. Route list identical to `docs/baseline-check.md`
  plus the one expected addition, `ƒ /api/revalidate`.
- `next start`, same route table as the baseline — **identical status codes**,
  including `/admin` → 307 → `/admin/login` (confirms `ADMIN_ZONE_ORIGIN`
  being unset means the legacy gate is still fully in control).
- Headless-browser (Playwright) re-check of the homepage at 768×1024,
  1280×720 and 1920×1080 (the three sizes the resize tool couldn't confirm in
  Stage 1):
  - No console errors at any of the three.
  - No broken images once lazy-loaded images are scrolled into view (the
    first pass flagged some as "incomplete" before scrolling — a lazy-loading
    false positive, not a bug).
  - Found a **pre-existing, minor** horizontal-scroll quirk (~58px) at
    768px width, caused by a marquee/ticker-style animated strip. Verified
    with the same script against the pre-merge Stage-1 commit — present
    there too, so **not introduced by this merge**. Left untouched per the
    "don't change public-site UI" rule; flagging for your awareness only.

## admin/ app checks

- `npm install` — clean (6 npm-audit advisories in third-party deps,
  unrelated to this app's own code; not addressed here).
- `npm run typecheck` — pass.
- `npm run lint` — pass.
- `npm test` — **83/83 pass, 0 failures** (you expected 63 — the suite has
  grown since; all green, nothing skipped).
- `npm run build` — pass, 20 routes, all under the app's own `/admin`
  basePath (confirmed via root build note below).

### Demo mode click-through

Two things to flag about getting demo mode running, in case you hit them
again:
1. `ADMIN_DEMO=1 npm run start` does **not** work — `next start` always sets
   `NODE_ENV=production`, and demo mode is intentionally hard-disabled in
   production builds (`lib/demo/mode.ts`). Must use `npm run dev`.
2. Demo mode still requires `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to be *set* (any value) —
   `signIn()` in `actions/auth.ts` checks `isSupabaseConfigured` before ever
   reaching the demo fake-client swap. Used harmless placeholder values
   (`http://localhost:54321` / `demo-key`) for this local check only; not
   committed anywhere.

With `ADMIN_DEMO=1 NEXT_PUBLIC_ADMIN_DEMO=1` plus those two placeholders,
signed in as the demo owner (`owner@demo.local`) and clicked through every
screen:

| Screen | Result |
|---|---|
| Login | OK |
| Dashboard (Overview) | OK — counts, needs-attention, latest enquiries |
| Products: list | OK — filters (status/category/size/finish/collection/source PDF), search |
| Products: new | OK — basics + visibility (draft/review/published/archived) |
| Products: edit | OK — specs, image manager (reorder/primary/delete), price/per/note, source PDF link |
| Products: preview | OK — renders the live-site-style product page |
| Categories | OK — visibility toggle, order, merge, "labels used but not managed" adoption flow |
| Filters & collections | OK — per-facet counts, **near-duplicate detection** ("Possibly the same: Glossy / glossy") |
| Homepage catalogues | OK — show/hide, reorder, edit |
| PDF library | OK — list, detail, import-count badges |
| PDF detail → Import products | Shows "The PDF couldn't be loaded" — **expected in demo mode**, no file actually exists in the in-memory store; no console error, graceful message, not a bug |
| Images (media library) | OK — unused/in-use/broken-link tabs |
| Enquiries | OK — status filters, detail expand |
| Team & permissions | OK — role changes, pause/remove (add-person needs `SUPABASE_SECRET_KEY`, correctly flagged) |
| Activity log | OK — filterable by area, shows actor + diff |
| My account | OK — display name, change password form |

No broken pages. No console errors anywhere except the one documented,
expected demo-mode PDF-file message above.

## Feature-parity table: legacy admin vs new admin

| Feature | Status | Notes |
|---|---|---|
| Price / price unit / price note | MATCH | New admin: "Price (₹) / Per / Note" fields, same three-part model |
| Category management + visibility | REPLACED-BY-BETTER | New admin adds a visibility toggle, explicit sort order, merge tool, and a flow to "adopt" legacy free-text category labels into managed categories. Legacy had none of this (categories table is empty in production today — screen starts empty either way) |
| Catalogue PDFs | MATCH | Both: upload, link to homepage display, product cross-links. New admin's library adds status badges (import progress, file-missing) |
| Bulk import (PDF → products) | REPLACED-BY-BETTER | Same core idea (detect tiles, OCR, review, create), but the new importer adds box-snapping ("Use this box on every page"), low-res/duplicate/full-page warnings, and "code already exists" detection that the legacy `lib/import/` scanner didn't have |
| Image ordering / primary image | MATCH | Both use `sort_order`; new admin's `ImageManager` has explicit up/down + a star for primary, same as legacy's `components/admin/ImageManager.tsx` |
| WebP conversion on upload | MATCH | Legacy: server-side via `sharp` (`lib/admin/imageUpload.ts`, quality 82, resize cap). New admin: client-side canvas resize to the same 1600px cap, re-encoded before upload (`admin/lib/client/files.ts`) — same effective outcome, different place it happens |
| Password change | MATCH | Both have a change-password form; new admin's is part of the richer "My account" page |
| Delete behaviour | MATCH | Both: hard delete available, cascades to `product_images` rows (files are left in storage either way). New admin adds a typed-confirmation guard and restricts hard delete to owners (RLS-enforced), which legacy didn't have |
| Enquiries (contact-form leads) | MISSING → now present | Legacy admin had **no** enquiries screen at all (the public contact form wrote to the table but nothing in `app/admin` read it back) — this is a new capability, not a replacement |
| Team / roles / permissions | MISSING → now present | Legacy had one shared `ADMIN_PASSWORD`, no concept of individual accounts or roles. New admin adds Owner/Editor/Read-only with per-row RLS |
| Activity / audit log | MISSING → now present | Legacy had nothing recording who changed what. New admin records every product/PDF/category/homepage/enquiry/team change with actor + diff, written by the database itself (not the app), so it can't be tampered with from the UI |
| Filter facet management | MISSING → now present | Legacy's filters were implicit in whatever values existed on `products`; no screen to rename, merge-near-duplicates, or see per-value live/published counts |
| Media library (unused/broken-link detection) | MISSING → now present | Legacy had no cross-product image browser; this is new |

**No MATCH or REPLACED-BY-BETTER item regressed.** No important capability is
MISSING in the new admin relative to the old one — every legacy capability
has at least a MATCH, and several areas (enquiries, team/roles, audit log,
filter management, media library) are genuinely new, not replacements, since
the legacy admin never had them. Clear to proceed past this gate per your
Stage 2 step 5 instruction (no MISSING blockers).

Categories and catalogues tables being empty in production (confirmed in
Stage 1) means those two screens will start empty in real use, same as they
would have in the legacy admin — not a regression, just worth expecting.

## Commit / push

Committed on `feat/admin-integration` as commit `c05e980` (proper two-parent
merge commit). Pushed to `origin/feat/admin-integration`.

**Vercel preview URL:** not available — this repository isn't connected to a
Vercel project I have access to trigger/inspect from here (no `vercel` CLI
auth, no project link found in this environment). You'll need to check the
Vercel dashboard for the preview deployment URL for this branch/PR, or tell
me how you'd like that connected.
