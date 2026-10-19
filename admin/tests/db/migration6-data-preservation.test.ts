import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Workstream 1 (migration 6 schema readiness): proves — against a fresh,
 * isolated PGlite database, not production — that applying migration 6
 * to a database that already looks like today's live project (real
 * products with images, a category, a catalogue, a source PDF, a real
 * customer enquiry, and the legacy `admin_auth` row) does not lose,
 * rename, or alter any of that pre-existing data, and that the backfill
 * lands on the expected `status` value in each case.
 *
 * Builds the schema in two stages — migrations 1-5, then a realistic
 * seed, then migration 6 — unlike tests/db/harness.ts, which applies the
 * full history before any test data exists. That ordering matters here:
 * it's the only way to actually exercise the backfill UPDATE against
 * rows that predate it, the way production's real history would.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "..", "supabase", "migrations");
const MIGRATION_6 = "20261012090000_admin_app_roles_status_audit.sql";

const PLATFORM_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

async function createPreMigration6Db() {
  const db = new PGlite();
  await db.exec(PLATFORM_STUBS);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && f < MIGRATION_6)
    .sort();
  assert.ok(files.length >= 4, "expected at least migrations 1-5 to sort before migration 6");
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf-8"));
  }
  return db;
}

async function applyMigration6(db: PGlite) {
  await db.exec(readFileSync(join(MIGRATIONS_DIR, MIGRATION_6), "utf-8"));
}

describe("migration 6 against pre-existing, production-shaped data", () => {
  test("a published product with images keeps every value, and backfills status = published", async () => {
    const db = await createPreMigration6Db();
    const productId = "10000000-0000-0000-0000-000000000001";
    await db.query(
      `insert into public.products (id, slug, name, product_code, category, finish, size, is_visible, description)
       values ($1, 'roman-white', 'Roman White', 'GT-2001', 'Marble Slabs', 'Polished', '600x1200mm', true, 'A real description')`,
      [productId],
    );
    await db.query(`insert into public.product_images (product_id, image_url, sort_order) values ($1, 'https://x/tiles/roman-white/image-0.webp', 0)`, [productId]);

    await applyMigration6(db);

    const { rows } = await db.query(`select * from public.products where id = $1`, [productId]);
    const p = rows[0] as Record<string, unknown>;
    assert.equal(p.slug, "roman-white");
    assert.equal(p.name, "Roman White");
    assert.equal(p.product_code, "GT-2001");
    assert.equal(p.category, "Marble Slabs");
    assert.equal(p.description, "A real description");
    assert.equal(p.is_visible, true);
    assert.equal(p.status, "published"); // backfill rule: is_visible=true -> published
    assert.equal(p.archived_at, null);

    const { rows: imgs } = await db.query(`select * from public.product_images where product_id = $1`, [productId]);
    const img0 = imgs[0] as Record<string, unknown>;
    assert.equal(imgs.length, 1);
    assert.equal(img0.image_url, "https://x/tiles/roman-white/image-0.webp");
  });

  test("a hidden/rejected product backfills to archived, a hidden-but-unclassified one to review", async () => {
    const db = await createPreMigration6Db();
    await db.query(
      `insert into public.products (id, slug, name, product_code, category, is_visible, review_status)
       values ('20000000-0000-0000-0000-000000000001', 'bad-dupe', 'Bad Dupe', 'GT-9999', 'Tiles', false, 'duplicate')`,
    );
    await db.query(
      `insert into public.products (id, slug, name, product_code, category, is_visible)
       values ('20000000-0000-0000-0000-000000000002', 'needs-a-look', 'Needs A Look', 'GT-8888', 'Tiles', false)`,
    );

    await applyMigration6(db);

    const { rows } = await db.query(`select id, status from public.products order by id`);
    const [r0, r1] = rows as Record<string, unknown>[];
    assert.equal(r0.status, "archived");
    assert.equal(r1.status, "review");
  });

  test("categories, catalogues, source PDFs, and a real customer enquiry survive untouched", async () => {
    const db = await createPreMigration6Db();
    await db.query(`insert into public.categories (id, name, slug, is_visible, sort_order) values ('30000000-0000-0000-0000-000000000001', 'Marble Slabs', 'marble-slabs', true, 1)`);
    await db.query(
      `insert into public.source_pdfs (id, slug, title, original_filename, file_url) values
       ('30000000-0000-0000-0000-000000000002', 'brand-catalogue', 'Brand Catalogue', 'brand.pdf', 'https://x/catalogues/brand.pdf')`,
    );
    await db.query(
      `insert into public.catalogues (id, title, pdf_url, is_visible, sort_order) values
       ('30000000-0000-0000-0000-000000000003', 'Brand Catalogue', 'https://x/catalogues/brand.pdf', true, 1)`,
    );
    await db.query(
      `insert into public.enquiries (id, name, email, message) values
       ('30000000-0000-0000-0000-000000000004', 'Real Customer', 'customer@example.com', 'I would like a quote')`,
    );

    await applyMigration6(db);

    const cat = (await db.query(`select * from public.categories where id = '30000000-0000-0000-0000-000000000001'`)).rows[0] as Record<string, unknown>;
    assert.equal(cat.name, "Marble Slabs");
    assert.equal(cat.is_visible, true);

    const pdf = (await db.query(`select * from public.source_pdfs where id = '30000000-0000-0000-0000-000000000002'`)).rows[0] as Record<string, unknown>;
    assert.equal(pdf.title, "Brand Catalogue");
    assert.equal(pdf.file_url, "https://x/catalogues/brand.pdf");
    assert.equal(pdf.status, "ready"); // migration 6's new default for pre-existing rows

    const cata = (await db.query(`select * from public.catalogues where id = '30000000-0000-0000-0000-000000000003'`)).rows[0] as Record<string, unknown>;
    assert.equal(cata.title, "Brand Catalogue");
    assert.equal(cata.source_pdf_id, null); // new nullable column, not silently linked

    const enq = (await db.query(`select * from public.enquiries where id = '30000000-0000-0000-0000-000000000004'`)).rows[0] as Record<string, unknown>;
    assert.equal(enq.name, "Real Customer");
    assert.equal(enq.email, "customer@example.com");
    assert.equal(enq.message, "I would like a quote");
    assert.equal(enq.status, "new"); // new column, correct default for a pre-existing unhandled row
  });

  test("the legacy admin_auth row (shared password hash) is untouched — migration 6 never references it", async () => {
    const db = await createPreMigration6Db();
    await db.query(`insert into public.admin_auth (id, username, password_hash) values ('40000000-0000-0000-0000-000000000001', 'admin', '$2b$fakehash')`);

    await applyMigration6(db);

    const row = (await db.query(`select * from public.admin_auth`)).rows[0] as Record<string, unknown>;
    assert.equal(row.username, "admin");
    assert.equal(row.password_hash, "$2b$fakehash");
  });

  test("the public anon read policy still shows only is_visible rows, unchanged by migration 6", async () => {
    const db = await createPreMigration6Db();
    await db.query(`insert into public.products (slug, name, product_code, category, is_visible) values ('visible-one', 'Visible One', 'GT-1', 'Tiles', true)`);
    await db.query(`insert into public.products (slug, name, product_code, category, is_visible) values ('hidden-one', 'Hidden One', 'GT-2', 'Tiles', false)`);
    await applyMigration6(db);

    await db.exec("set role anon");
    const { rows } = await db.query(`select slug from public.products order by slug`);
    await db.exec("reset role");

    assert.deepEqual((rows as Record<string, unknown>[]).map((r) => r.slug), ["visible-one"]);
  });

  test("a legacy-admin-style write (service-role, no status/is_visible in the payload) still succeeds and keeps the row published", async () => {
    const db = await createPreMigration6Db();
    await db.query(`insert into public.products (id, slug, name, product_code, category) values ('50000000-0000-0000-0000-000000000001', 'legacy-edit', 'Legacy Edit', 'GT-5', 'Tiles')`);
    await applyMigration6(db);

    // lib/admin/products.ts's updateProduct() payload shape: never includes status/is_visible.
    await db.exec("set role service_role");
    await db.query(`update public.products set name = 'Legacy Edit (renamed)' where id = '50000000-0000-0000-0000-000000000001'`);
    await db.exec("reset role");

    const row = (await db.query(`select name, status, is_visible from public.products where id = '50000000-0000-0000-0000-000000000001'`)).rows[0] as Record<string, unknown>;
    assert.equal(row.name, "Legacy Edit (renamed)");
    assert.equal(row.status, "published"); // default, untouched by the rename
    assert.equal(row.is_visible, true);
  });

  test("row counts are identical before and after — migration 6 adds columns, it does not add or remove rows", async () => {
    const db = await createPreMigration6Db();
    for (let i = 0; i < 5; i++) {
      await db.query(`insert into public.products (slug, name, product_code, category) values ($1, $2, $3, 'Tiles')`, [`p${i}`, `Product ${i}`, `GT-${i}`]);
    }
    const before = Number(((await db.query(`select count(*) from public.products`)).rows[0] as Record<string, unknown>).count);
    await applyMigration6(db);
    const after = Number(((await db.query(`select count(*) from public.products`)).rows[0] as Record<string, unknown>).count);
    assert.equal(before, 5);
    assert.equal(after, 5);
  });
});
