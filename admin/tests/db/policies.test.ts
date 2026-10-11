import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createDb, ids, seedUsers, type Db } from "./harness";

let db: Db;

async function product(code: string, extra: Record<string, unknown> = {}) {
  const cols = { slug: code.toLowerCase(), name: `Tile ${code}`, product_code: code, category: "Tiles", ...extra };
  const keys = Object.keys(cols);
  const { rows } = await db.query<{ id: string }>(
    `insert into public.products (${keys.join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
    Object.values(cols),
  );
  return rows[0].id;
}

async function rejects(fn: () => Promise<unknown>, pattern?: RegExp) {
  await assert.rejects(fn, (err: Error) => (pattern ? pattern.test(err.message) : true));
}

before(async () => {
  db = await createDb();
  await seedUsers(db);
});
after(async () => db.close());

describe("migrations", () => {
  test("legacy service-role style rows backfill to the right status", async () => {
    const visible = await product("LEGACY-1");
    const hidden = await product("LEGACY-2", { is_visible: false });
    const { rows } = await db.query<{ id: string; status: string; is_visible: boolean }>(
      "select id, status, is_visible from public.products where id in ($1, $2)",
      [visible, hidden],
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    assert.equal(byId[visible].status, "published");
    assert.equal(byId[hidden].status, "draft");
    assert.equal(byId[hidden].is_visible, false);
  });
});

describe("public visitors (anon)", () => {
  test("see only published products", async () => {
    await product("PUB-1");
    await product("DRAFT-1", { status: "draft" });
    const codes = await db.as(null, async () =>
      (await db.query<{ product_code: string }>("select product_code from public.products")).rows.map((r) => r.product_code),
    );
    assert.ok(codes.includes("PUB-1"));
    assert.ok(!codes.includes("DRAFT-1"));
  });

  test("cannot write products, read enquiries, or read the audit log", async () => {
    await rejects(() => db.as(null, () => db.query("insert into public.products (slug,name,product_code,category) values ('x','x','x','x')")));
    const enquiries = await db.as(null, () => db.query("select * from public.enquiries"));
    assert.equal(enquiries.rows.length, 0);
    const audit = await db.as(null, () => db.query("select * from public.audit_log"));
    assert.equal(audit.rows.length, 0);
  });

  test("can still submit an enquiry", async () => {
    await db.as(null, () =>
      db.query("insert into public.enquiries (name, email, message) values ('A', 'a@b.c', 'hello there friend')"),
    );
  });
});

describe("signed-in users with no admin row", () => {
  test("get nothing beyond public access", async () => {
    const draft = await product("DRAFT-2", { status: "draft" });
    const seen = await db.as(ids.stranger, () => db.query("select id from public.products where id = $1", [draft]));
    assert.equal(seen.rows.length, 0);
    const upd = await db.as(ids.stranger, () => db.query("update public.products set name = 'x' where id = $1", [draft]));
    assert.equal(upd.affectedRows, 0);
  });

  test("cannot promote themselves", async () => {
    await rejects(() =>
      db.as(ids.stranger, () =>
        db.query("insert into public.admin_users (user_id, email, role) values ($1, 'stranger@example.com', 'owner')", [ids.stranger]),
      ),
    );
  });
});

describe("roles", () => {
  test("viewer can read drafts but not change them", async () => {
    const draft = await product("DRAFT-3", { status: "draft" });
    const seen = await db.as(ids.viewer, () => db.query("select id from public.products where id = $1", [draft]));
    assert.equal(seen.rows.length, 1);
    const upd = await db.as(ids.viewer, () => db.query("update public.products set name = 'x' where id = $1", [draft]));
    assert.equal(upd.affectedRows, 0);
  });

  test("viewer cannot read customer enquiries; editor can", async () => {
    const v = await db.as(ids.viewer, () => db.query("select * from public.enquiries"));
    assert.equal(v.rows.length, 0);
    const e = await db.as(ids.editor, () => db.query("select * from public.enquiries"));
    assert.ok(e.rows.length > 0);
  });

  test("editor can create and edit, but not delete products", async () => {
    const id = await db.as(ids.editor, async () => {
      const { rows } = await db.query<{ id: string }>(
        "insert into public.products (slug,name,product_code,category,status) values ('ed-1','Ed 1','ED-1','Tiles','draft') returning id",
      );
      await db.query("update public.products set finish = 'Matte' where id = $1", [rows[0].id]);
      const del = await db.query("delete from public.products where id = $1", [rows[0].id]);
      assert.equal(del.affectedRows, 0);
      return rows[0].id;
    });
    const { rows } = await db.query<{ finish: string; created_by: string }>("select finish, created_by from public.products where id = $1", [id]);
    assert.equal(rows[0].finish, "Matte");
    assert.equal(rows[0].created_by, ids.editor);
  });

  test("owner can delete products", async () => {
    const id = await product("DEL-1", { status: "draft" });
    const del = await db.as(ids.owner, () => db.query("delete from public.products where id = $1", [id]));
    assert.equal(del.affectedRows, 1);
  });

  test("editor cannot change roles; owner can", async () => {
    await rejects(
      () => db.as(ids.editor, () => db.query("update public.admin_users set role = 'owner' where user_id = $1", [ids.editor])),
      /own role/,
    );
    const other = await db.as(ids.editor, () =>
      db.query("update public.admin_users set role = 'editor' where user_id = $1", [ids.viewer]),
    );
    assert.equal(other.affectedRows, 0);
    await db.as(ids.owner, () => db.query("update public.admin_users set role = 'editor' where user_id = $1", [ids.viewer]));
    await db.as(ids.owner, () => db.query("update public.admin_users set role = 'viewer' where user_id = $1", [ids.viewer]));
  });

  test("owner cannot demote or deactivate themself", async () => {
    await rejects(
      () => db.as(ids.owner, () => db.query("update public.admin_users set role = 'editor' where user_id = $1", [ids.owner])),
      /own role/,
    );
  });

  test("the last active owner can never be removed", async () => {
    // Even from the SQL editor (no auth.uid()), the guard keeps one owner.
    await rejects(() => db.query("delete from public.admin_users where user_id = $1", [ids.owner]), /at least one active owner/);
  });
});

describe("publication rules", () => {
  test("publishing from the admin app requires an image", async () => {
    const id = await product("PUBRULE-1", { status: "draft" });
    await rejects(
      () => db.as(ids.editor, () => db.query("update public.products set status = 'published' where id = $1", [id])),
      /at least one product image/,
    );
    await db.as(ids.editor, async () => {
      await db.query("insert into public.product_images (product_id, image_url, sort_order) values ($1, 'https://x/tiles/a.webp', 0)", [id]);
      await db.query("update public.products set status = 'published' where id = $1", [id]);
    });
    const { rows } = await db.query<{ is_visible: boolean }>("select is_visible from public.products where id = $1", [id]);
    assert.equal(rows[0].is_visible, true);
  });

  test("archive and restore keep is_visible in sync and stamp archived_at", async () => {
    const id = await product("ARCH-1");
    await db.as(ids.editor, () => db.query("update public.products set status = 'archived' where id = $1", [id]));
    let { rows } = await db.query<{ is_visible: boolean; archived_at: string | null }>(
      "select is_visible, archived_at from public.products where id = $1",
      [id],
    );
    assert.equal(rows[0].is_visible, false);
    assert.ok(rows[0].archived_at);
    await db.as(ids.editor, () => db.query("update public.products set status = 'draft' where id = $1", [id]));
    ({ rows } = await db.query<{ is_visible: boolean; archived_at: string | null }>("select is_visible, archived_at from public.products where id = $1", [id]));
    assert.equal(rows[0].archived_at, null);
  });

  test("legacy writers that only flip is_visible still update status", async () => {
    const id = await product("FLIP-1");
    await db.query("update public.products set is_visible = false where id = $1", [id]);
    const { rows } = await db.query<{ status: string }>("select status from public.products where id = $1", [id]);
    assert.equal(rows[0].status, "draft");
  });
});

describe("audit log", () => {
  test("records actor, verb and diff from the database, not the app", async () => {
    const id = await product("AUD-1", { status: "draft" });
    await db.as(ids.editor, () => db.query("update public.products set name = 'Renamed' where id = $1", [id]));
    const { rows } = await db.query<{ action: string; actor_email: string; changes: Record<string, unknown> }>(
      "select action, actor_email, changes from public.audit_log where entity_id = $1 order by id desc limit 1",
      [id],
    );
    assert.equal(rows[0].action, "updated");
    assert.equal(rows[0].actor_email, "editor@example.com");
    assert.deepEqual(rows[0].changes.name, ["Tile AUD-1", "Renamed"]);
  });

  test("names status transitions", async () => {
    const id = await product("AUD-2");
    await db.as(ids.editor, () => db.query("update public.products set status = 'archived' where id = $1", [id]));
    await db.as(ids.editor, () => db.query("update public.products set status = 'draft' where id = $1", [id]));
    const { rows } = await db.query<{ action: string }>(
      "select action from public.audit_log where entity_id = $1 and action <> 'created' order by id",
      [id],
    );
    assert.deepEqual(rows.map((r) => r.action), ["archived", "restored"]);
  });

  test("cannot be written or erased by admins directly", async () => {
    await rejects(() =>
      db.as(ids.owner, () => db.query("insert into public.audit_log (action, entity_type) values ('x', 'y')")),
    );
    const del = await db.as(ids.owner, () => db.query("delete from public.audit_log"));
    assert.equal(del.affectedRows, 0);
  });
});

describe("admin RPCs", () => {
  test("admin_set_product_images reorders and removes atomically", async () => {
    const id = await product("IMG-1", { status: "draft" });
    await db.as(ids.editor, () =>
      db.query("select public.admin_set_product_images($1, $2)", [id, ["https://x/tiles/a.webp", "https://x/tiles/b.webp"]]),
    );
    await db.as(ids.editor, () => db.query("select public.admin_set_product_images($1, $2)", [id, ["https://x/tiles/b.webp"]]));
    const { rows } = await db.query<{ image_url: string; sort_order: number }>(
      "select image_url, sort_order from public.product_images where product_id = $1",
      [id],
    );
    assert.deepEqual(rows, [{ image_url: "https://x/tiles/b.webp", sort_order: 0 }]);
  });

  test("viewer cannot call write RPCs", async () => {
    const id = await product("IMG-2", { status: "draft" });
    await rejects(() => db.as(ids.viewer, () => db.query("select public.admin_set_product_images($1, $2)", [id, []])), /Not allowed/);
    await rejects(() => db.as(ids.viewer, () => db.query("select public.admin_rename_filter_value('finish', 'a', 'b')")), /Not allowed/);
  });

  test("admin_rename_filter_value merges a value and rejects unknown columns", async () => {
    await product("MERGE-1", { finish: "Glossy", status: "draft" });
    await product("MERGE-2", { finish: "Gloss", status: "draft" });
    const { rows } = await db.as(ids.editor, () =>
      db.query<{ n: number }>("select public.admin_rename_filter_value('finish', 'Gloss', 'Glossy') as n"),
    );
    assert.equal(rows[0].n, 1);
    const left = await db.query("select 1 from public.products where finish = 'Gloss'");
    assert.equal(left.rows.length, 0);
    await rejects(() => db.as(ids.editor, () => db.query("select public.admin_rename_filter_value('slug', 'a', 'b')")), /Unsupported/);
  });

  test("renaming a category carries its managed category row", async () => {
    await db.query("insert into public.categories (name, slug) values ('Wall Tile', 'wall-tile')");
    await product("CAT-1", { category: "Wall Tile", status: "draft" });
    await db.as(ids.editor, () => db.query("select public.admin_rename_filter_value('category', 'Wall Tile', 'Wall Tiles')"));
    const { rows } = await db.query("select name from public.categories where slug = 'wall-tile'");
    assert.equal((rows[0] as { name: string }).name, "Wall Tiles");
  });

  test("admin_filter_values reports totals and published counts", async () => {
    const { rows } = await db.as(ids.viewer, () =>
      db.query<{ filter: string; value: string; total: number; published: number }>("select * from public.admin_filter_values()"),
    );
    const glossy = rows.find((r) => r.filter === "finish" && r.value === "Glossy");
    assert.ok(glossy);
    assert.equal(Number(glossy.total), 2);
    assert.equal(Number(glossy.published), 0);
    // Anonymous callers can't even evaluate the role check.
    await rejects(() => db.as(null, () => db.query("select * from public.admin_filter_values()")), /permission denied/);
    const strangerRows = await db.as(ids.stranger, () => db.query("select * from public.admin_filter_values()"));
    assert.equal(strangerRows.rows.length, 0);
  });

  test("admin_media_objects counts references and refuses non-admins", async () => {
    const id = await product("MEDIA-1");
    await db.query("insert into public.product_images (product_id, image_url) values ($1, 'https://p.supabase.co/storage/v1/object/public/tiles/media-1/a.webp')", [id]);
    await db.query("insert into storage.objects (bucket_id, name) values ('tiles', 'media-1/a.webp'), ('tiles', 'orphan/b.webp')");
    const { rows } = await db.as(ids.viewer, () =>
      db.query<{ name: string; product_refs: number; published_refs: number }>("select * from public.admin_media_objects('tiles')"),
    );
    const used = rows.find((r) => r.name === "media-1/a.webp");
    assert.equal(Number(used?.product_refs), 1);
    assert.equal(Number(used?.published_refs), 1);
    const unused = await db.as(ids.viewer, () => db.query<{ name: string }>("select name from public.admin_media_objects('tiles', null, true)"));
    assert.deepEqual(unused.rows.map((r) => r.name), ["orphan/b.webp"]);
    await rejects(() => db.as(ids.stranger, () => db.query("select * from public.admin_media_objects('tiles')")), /Not allowed/);
  });
});

describe("self-service profile", () => {
  test("anyone can rename themself but not change their own email or role", async () => {
    await db.as(ids.viewer, () => db.query("update public.admin_users set display_name = 'Vee' where user_id = $1", [ids.viewer]));
    const { rows } = await db.query<{ display_name: string }>("select display_name from public.admin_users where user_id = $1", [ids.viewer]);
    assert.equal(rows[0].display_name, "Vee");
    await rejects(
      () => db.as(ids.viewer, () => db.query("update public.admin_users set email = 'x@y.z' where user_id = $1", [ids.viewer])),
      /own role/,
    );
    await rejects(
      () => db.as(ids.viewer, () => db.query("update public.admin_users set role = 'owner' where user_id = $1", [ids.viewer])),
      /own role/,
    );
  });
});

describe("broken media", () => {
  test("flags product images whose storage object is missing", async () => {
    const id = await product("BROKEN-1");
    const base = "https://p.supabase.co/storage/v1/object/public/tiles/";
    await db.query("insert into storage.objects (bucket_id, name) values ('tiles', 'broken-1/ok.webp')");
    await db.query(
      "insert into public.product_images (product_id, image_url, sort_order) values ($1, $2, 0), ($1, $3, 1), ($1, 'https://elsewhere.example/x.jpg', 2)",
      [id, `${base}broken-1/ok.webp`, `${base}broken-1/gone.webp`],
    );
    const { rows } = await db.as(ids.viewer, () =>
      db.query<{ image_url: string }>("select image_url from public.admin_broken_product_images() where product_id = $1", [id]),
    );
    assert.deepEqual(rows.map((r) => r.image_url), [`${base}broken-1/gone.webp`]);
  });
});

describe("storage policies", () => {
  test("editors can upload to tiles; viewers and strangers cannot; only owners delete", async () => {
    await db.as(ids.editor, () => db.query("insert into storage.objects (bucket_id, name) values ('tiles', 'ed/x.webp')"));
    await rejects(() => db.as(ids.viewer, () => db.query("insert into storage.objects (bucket_id, name) values ('tiles', 'v/x.webp')")));
    await rejects(() => db.as(ids.stranger, () => db.query("insert into storage.objects (bucket_id, name) values ('tiles', 's/x.webp')")));
    await rejects(() => db.as(ids.editor, () => db.query("insert into storage.objects (bucket_id, name) values ('other', 'e/x.webp')")));
    const edDel = await db.as(ids.editor, () => db.query("delete from storage.objects where name = 'ed/x.webp'"));
    assert.equal(edDel.affectedRows, 0);
    const ownerDel = await db.as(ids.owner, () => db.query("delete from storage.objects where name = 'ed/x.webp'"));
    assert.equal(ownerDel.affectedRows, 1);
  });
});

describe("source PDFs and import candidates", () => {
  test("the same file bytes cannot be registered twice", async () => {
    await db.as(ids.editor, () =>
      db.query("insert into public.source_pdfs (slug, title, original_filename, sha256) values ('a', 'A', 'a.pdf', 'abc')"),
    );
    await rejects(() =>
      db.as(ids.editor, () =>
        db.query("insert into public.source_pdfs (slug, title, original_filename, sha256) values ('b', 'B', 'b.pdf', 'abc')"),
      ),
    );
  });

  test("detected crops are unique per PDF; manual crops are not limited", async () => {
    const { rows } = await db.query<{ id: string }>("select id from public.source_pdfs where slug = 'a'");
    const pdf = rows[0].id;
    const insert = (key: string | null) =>
      db.as(ids.editor, () =>
        db.query("insert into public.pdf_import_candidates (source_pdf_id, page, crop, crop_key) values ($1, 1, '{}', $2)", [pdf, key]),
      );
    await insert("p1-0");
    await rejects(() => insert("p1-0"));
    await insert(null);
    await insert(null);
  });
});
