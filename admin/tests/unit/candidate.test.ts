import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fillOnlyEmpty, mergeWithDefaults } from "@/lib/catalogue/candidate";
import { friendlyError, syncNote } from "@/lib/actionResult";

describe("PDF import merge rules", () => {
  test("tile values win; PDF defaults only fill gaps; nothing is invented", () => {
    const merged = mergeWithDefaults(
      { product_code: "117", size: "", finish: "Carving" },
      { size: "600x600mm", finish: "Glossy", material: "Porcelain", namePrefix: "Gupta" },
    );
    assert.equal(merged.size, "600x600mm");
    assert.equal(merged.finish, "Carving");
    assert.equal(merged.material, "Porcelain");
    assert.equal(merged.name, "Gupta 117");
    assert.equal(merged.thickness, null);
  });

  test("no name prefix and no name means no name (the reviewer must type one)", () => {
    assert.equal(mergeWithDefaults({ product_code: "117" }, {}).name, null);
  });

  test("adding to an existing product never overwrites what's there", () => {
    const patch = fillOnlyEmpty(
      { size: "600x600mm", finish: null, rooms: [], source_pdf_id: "pdf-1", source_page: null },
      { size: "600x1200mm", finish: "Matte", rooms: ["Kitchen"], source_pdf_id: "pdf-2", source_page: 6 },
    );
    assert.deepEqual(patch, { finish: "Matte", rooms: ["Kitchen"], source_page: 6 });
  });

  test("empty extraction results don't blank out fields", () => {
    assert.deepEqual(fillOnlyEmpty({ finish: null }, { finish: "" }), {});
    assert.deepEqual(fillOnlyEmpty({ finish: null }, { finish: null }), {});
  });
});

describe("messages", () => {
  test("database errors become actionable sentences", () => {
    assert.equal(friendlyError({ code: "23505", message: 'duplicate key value violates unique constraint "products_product_code_key"' }), "Another product already uses this product code.");
    assert.equal(friendlyError({ code: "P0001", message: "Add at least one product image before publishing." }), "Add at least one product image before publishing.");
    assert.equal(friendlyError({ code: "42501", message: "permission denied" }), "You don't have permission to do this.");
  });

  test("website refresh status is reported honestly", () => {
    assert.match(syncNote("refreshed"), /updated/);
    assert.match(syncNote("failed"), /couldn't be refreshed/);
    assert.match(syncNote("not_configured"), /isn't set up/);
  });
});
