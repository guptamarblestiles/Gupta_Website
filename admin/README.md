# Gupta Interior — Admin

The private management website for **guptainterior.in**. It is a separate
Next.js app that lives in this folder (`admin/`) and is deployed as its own
Vercel project (e.g. `admin.guptainterior.in`). It uses the **same Supabase
project, tables and Storage buckets** as the public site — there is no second
database and no copy of the catalogue.

| | Public site (repo root) | Admin (this folder) |
|---|---|---|
| Who uses it | Customers | Owner and staff |
| Sign-in | none | Supabase Auth (email + password) |
| Database access | publishable key, RLS: published products only | the signed-in user's own session, RLS by role |
| Deploy | existing Vercel project | new Vercel project, Root Directory = `admin` |

---

## What it does

- **Overview** — live counts (published / needs review / drafts / PDFs), problems that affect customers (published products without images, broken image links, PDFs missing their file, near-duplicate product codes), recent changes, latest enquiries.
- **Products** — server-side search, filters, sorting and paging; add/edit with images, specs, source PDF + page; statuses **Draft → Needs review → Published → Archived**; preview (drafts too); bulk publish / unpublish / archive / set category; owner-only permanent delete with type-to-confirm.
- **PDF library** — guided upload straight to Storage with progress, page count and title read from the file, duplicate detection by content (SHA-256), retry after failure, rename title without touching the file, archive, owner-only delete when nothing links to it.
- **Import products from a PDF** — see below.
- **Images** — every stored file with where it's used (live / in use / unused), add to a product, upload, broken-link report; owner-only delete of files nothing uses (re-checked at delete time).
- **Categories** and **Filters & collections** — manage the customer-facing categories; rename or merge filter values (sizes, finishes, collections, …) across all products in one reviewed step, with near-duplicate suggestions; find live products missing a value.
- **Homepage catalogues** — choose which library PDFs appear in the homepage's Catalogues section, order, cover image, visibility.
- **Enquiries** — the website's enquiry form submissions with status (New / Contacted / In progress / Closed), staff notes, call / WhatsApp / email buttons. Owners and editors only.
- **Activity log** — who changed what and when, written by database triggers (the app can't forge or skip it).
- **Team & permissions** (owners) and **My account**.

### Roles

| Role | Can |
|---|---|
| **Owner** | Everything, including permanent deletes and managing the team. |
| **Editor** | Products, PDFs, images, categories, filters, homepage catalogues, enquiries. No permanent deletes, no team changes. |
| **Read-only** | View catalogue, PDFs, images, activity. No changes. No customer enquiries. |

These are enforced **in the database** (RLS policies + triggers in
`supabase/migrations/20261012090000_admin_app_roles_status_audit.sql`), and
again on the server for every action. Nobody can change their own role, and
the last active owner can't be removed or demoted.

---

## How the PDF import works

Everything runs in the admin's browser (pdf.js), so a 50 MB PDF never passes
through a server function and no extra service is needed.

1. **Upload** the PDF to the library (or pick one already there).
2. **Find tiles.** For each page the importer:
   - finds the raster artwork drawn on the page (tile photos embedded in the PDF), skipping logos/icons and large backdrops;
   - for **flat pages** — one scanned picture per page, which is how Gupta's own catalogue is made — you draw a box around the tile once and press **“Use this box on every page”**. Each page then gets its own crop, automatically **snapped to the tile's edges** (tested on the live catalogue: all four edges found on every page tried);
   - reads the text next to each tile (design number, size, finish, thickness, material, collection, faces). If a page has no text layer, it can **read the printed text with OCR** (Tesseract, in the browser). The design number is taken from the page's most prominent number only when the page has a single tile, and is flagged for checking;
   - re-renders each crop from the original PDF at high resolution (≈1600 px), uploads it to `tiles/pdf-imports/<pdf>/…` and saves it as a candidate.
3. **Review.** Each candidate shows the crop, page, suggested values and warnings (no code found, value taken from elsewhere on the page, low resolution, full-page picture, **code already exists**). Edit, then **Create product**, **Skip** or **Not a tile**. *PDF defaults* (e.g. size 600x600mm, material Porcelain, a name prefix) fill only fields left empty.
4. **Products are created as “Needs review”**, linked to the exact PDF and page, and are **never published automatically**. Use *Review & publish* to check and publish them.

Guarantees: the original PDF is never modified; nothing is invented (no match → empty + warning); re-scanning a page doesn't duplicate crops or overwrite your edits; approving the same tile twice returns the same product; a duplicate code needs an explicit choice to add the image to the existing product, which then **only fills empty fields**.

Scanning runs in the open browser tab. If the tab is closed the scan stops, but everything found so far is saved and the next scan continues with the remaining pages.

---

## First-time setup

### 1. Apply the database migration (once)

The migration is **additive** — no table, column or row is dropped — but it
changes live permissions, so apply it deliberately:

1. In Supabase, take a backup (Database → Backups) or test on a branch/copy first.
2. Check the earlier migration `20261011160000_catalogue_curation_filters_and_source_pdfs.sql` is already applied (the live site's Series/Rooms/Thickness filters and PDF downloads depend on it, so it very likely is).
3. Run `supabase/migrations/20261012090000_admin_app_roles_status_audit.sql` in the SQL editor (or `supabase db push`).

What it adds: `admin_users` + role functions; `products.status` (back-filled from today's `is_visible`, kept in sync with it, so the public site needs no change); PDF-library columns on `source_pdfs`; `pdf_import_candidates`; enquiry `status`/`staff_notes`; `audit_log` + triggers; RLS policies for admin roles; Storage write policies for the existing `tiles` and `catalogues` buckets; and a few admin RPCs. It was tested against all repo migrations in an in-memory Postgres (`npm test`).

### 2. Supabase Auth settings

- **Authentication → Sign In / Providers → Email:** keep enabled. **Turn off “Allow new users to sign up”.** Team members are created by an owner; nobody can register themselves. (Even if sign-up stayed on, a self-registered account has no `admin_users` row and therefore no access.)
- **Authentication → URL Configuration:** add `https://<admin-domain>/auth/confirm` (and `http://localhost:3001/auth/confirm` for local dev) to **Redirect URLs**.
- **Recommended — Email Templates → Reset password:** use this link so reset emails also work when opened in a different browser or on another device:
  ```html
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a>
  ```
  With the default template, the link must be opened in the same browser where “Forgot password” was pressed.
- Supabase's built-in email sender is rate-limited (a few emails per hour). For regular use, set up custom SMTP (Project Settings → Authentication → SMTP).

### 3. Storage

No new buckets. The admin writes to the existing public buckets:

- `tiles` — product, category and cover images (WebP/JPEG, ≤1600 px). Imported crops go under `pdf-imports/`, uploads under `products/`, `library/`, `categories/`, `catalogue-covers/`. File names are content hashes, so the same image is never stored twice.
- `catalogues` — PDFs. Library uploads go under `source-pdfs/<slug>-<hash>.pdf` (same folder the existing `uploadSourcePdfs.ts` script uses).

The free plan limits a single file to 50 MB (`NEXT_PUBLIC_MAX_PDF_MB`). Save a “reduced size” copy of larger PDFs.

### 4. Environment variables

Copy `.env.example` to `.env.local` for local use; set the same names in the
admin's Vercel project. Names only are committed — never values.

| Name | Where it's used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same values as the public site. |
| `SUPABASE_SECRET_KEY` | Server only. Used solely to create logins for new team members. Verified absent from all browser bundles. |
| `NEXT_PUBLIC_ADMIN_URL` | The admin's own URL (reset-email links). |
| `PUBLIC_SITE_URL` | e.g. `https://www.guptainterior.in` |
| `PUBLIC_REVALIDATE_SECRET` | Must equal `REVALIDATE_SECRET` on the public site. |
| `NEXT_PUBLIC_MAX_PDF_MB` | Optional, default 50. |

### 5. Create the first owner (once, from your computer)

```bash
cd admin
npm install
npm run create-owner -- you@example.com "Your Name"
```

Then open the admin, press **Forgot password**, enter that email and choose
your password. (If email isn't working yet, run the command with
`OWNER_PASSWORD=...` set in the environment to set it directly; it is never
printed or stored.) Alternative without Node: create the user in Supabase →
Authentication → Add user, then in the SQL editor:

```sql
insert into public.admin_users (user_id, email, role)
select id, email, 'owner' from auth.users where email = 'you@example.com';
```

Everyone after that is added from **Team & permissions**; they set their own
password with **Forgot password**.

### 6. Keep the public site in sync

Product listing and product pages read Supabase on every request, so edits
show immediately. The **homepage** (catalogue section) and **sitemap.xml** are
prerendered at build time, so the admin calls the public site's
`POST /api/revalidate` (added in `app/api/revalidate/route.ts`) after every
public-facing change. To enable it:

1. Deploy the public site from a branch that includes `app/api/revalidate/route.ts`.
2. Set `REVALIDATE_SECRET` on the public site's Vercel project and `PUBLIC_REVALIDATE_SECRET` (same value) on the admin's.

After each save the admin says whether the website was refreshed. If the
refresh fails, the database change has still been saved and product pages
already show it.

---

## Running and deploying

```bash
cd admin
npm install          # also copies the pdf.js worker into public/
npm run dev          # http://localhost:3001
npm run lint
npm run typecheck
npm test             # unit tests + database policy tests (in-memory Postgres)
npm run build
```

**Vercel:** New Project → import this repository → **Root Directory: `admin`**
→ framework Next.js → add the environment variables above → deploy. Then add
the domain (e.g. `admin.guptainterior.in`) in the project's Domains settings
and create the DNS record Vercel shows you. Don't share the URL until the
migration is applied and the first owner exists — until then nobody can sign
in, but there's nothing useful behind it either.

**Dev tool:** `npx tsx scripts/try-extract.ts "<file.pdf>" --verbose` prints
what the importer would find on each page of a local PDF, without uploading
anything.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| “This account doesn't have access to the admin panel” | The login exists but has no active row in `admin_users`. An owner adds them in Team & permissions (or use the SQL above). |
| Reset link says expired | Links work once, for one hour. With the default email template they must be opened in the same browser; switch to the recommended template above. |
| “Your account can't upload files” | The user is Read-only, or the migration's Storage policies weren't applied. |
| Upload stops at a percentage | Connection dropped. Press **Retry upload** — the same record and path are reused, nothing is duplicated. |
| “Not published: Add at least one product image…” | Publishing needs an image. Details were saved; add an image and publish again. |
| Website not updated after a save | The toast says whether the refresh worked. Check `PUBLIC_SITE_URL`, both secrets, and that the public site is deployed with `/api/revalidate`. |
| OCR doesn't start | The OCR engine downloads from cdn.jsdelivr.net on first use; a firewall/ad-blocker may block it. Turn OCR off in *PDF defaults* and type the codes. |
| PDF too large | Free plan: 50 MB per file. Save a “reduced size” copy. |
