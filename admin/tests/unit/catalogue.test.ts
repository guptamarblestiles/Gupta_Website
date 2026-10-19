import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  findNearDuplicates,
  normalizeSize,
  normalizeThickness,
  phoneLinks,
  safeFileName,
  slugify,
  titleFromFileName,
  uniqueSlug,
} from "@/lib/catalogue/normalize";
import { productInputSchema, publishBlockers, toProductColumns } from "@/lib/catalogue/product";

describe("normalize", () => {
  test("sizes are reformatted, never reinterpreted", () => {
    assert.equal(normalizeSize("600 X 1200 MM"), "600x1200mm");
    assert.equal(normalizeSize("60 x 120 cm"), "60x120cm");
    assert.equal(normalizeSize("2 x 4 feet"), "2x4ft");
    assert.equal(normalizeSize(" 12x18 "), "12x18");
    assert.equal(normalizeSize("Random Size Pack"), "Random Size Pack");
    assert.equal(normalizeSize("   "), null);
  });

  test("thickness", () => {
    assert.equal(normalizeThickness("9MM"), "9 mm");
    assert.equal(normalizeThickness("9.0 mm"), "9 mm");
    assert.equal(normalizeThickness("approx 9"), "approx 9");
  });

  test("near-duplicate filter values are grouped for review", () => {
    const groups = findNearDuplicates(["Glossy", "glossy ", "Matte", "600x600mm", "600 X 600 MM", "Wall Tile", "Wall Tiles"]);
    const sets = groups.map((g) => g.values.length);
    assert.equal(groups.length, 3);
    assert.deepEqual(sets, [2, 2, 2]);
  });

  test("slugs and file names are storage-safe", () => {
    assert.equal(slugify("Gupta Marble — Tiles & Cement.pdf"), "gupta-marble-tiles-cement");
    assert.equal(uniqueSlug("Tile 1", ["tile-1", "tile-1-2"]), "tile-1-3");
    assert.equal(safeFileName("My Photo (1).JPG"), "my-photo-1.jpg");
    assert.equal(titleFromFileName("Gupta_Marble_Tiles_and_Cement_05-08-2026.pdf"), "Gupta Marble Tiles And Cement 05 08 2026");
  });

  test("phone links assume India for 10-digit numbers", () => {
    assert.deepEqual(phoneLinks("97119 44187"), { tel: "+919711944187", whatsapp: "https://wa.me/919711944187" });
    assert.deepEqual(phoneLinks("097119 44187")?.tel, "+919711944187");
    assert.equal(phoneLinks("123"), null);
  });
});

describe("product input", () => {
  const base = { name: " Statuario  Gold ", product_code: "GT-2001", slug: "statuario-gold", category: "GVT Tiles", status: "draft" as const };

  test("optional specs may be empty and are stored as null", () => {
    const parsed = productInputSchema.parse({ ...base, finish: "", size: "600 X 600 MM", rooms: ["Kitchen", " kitchen ", "Bathroom", "Kitchen"] });
    assert.equal(parsed.name, "Statuario Gold");
    assert.equal(parsed.finish, null);
    assert.equal(parsed.size, "600x600mm");
    assert.deepEqual(parsed.rooms, ["Bathroom", "Kitchen", "kitchen"]);
  });

  test("required fields and publishing rules are enforced", () => {
    const r = productInputSchema.safeParse({ ...base, name: "", status: "published" });
    assert.equal(r.success, false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    assert.ok(paths.includes("name"));
    assert.ok(paths.includes("images"));
  });

  test("bad numbers are rejected with a readable message", () => {
    const r = productInputSchema.safeParse({ ...base, tiles_per_box: "2.5", price: "-3" });
    assert.equal(r.success, false);
    assert.ok(!r.success && r.error.issues.some((i) => /whole number/.test(i.message)));
  });

  test("source page needs a source PDF", () => {
    const r = productInputSchema.safeParse({ ...base, source_page: 4 });
    assert.equal(r.success, false);
  });

  test("application keeps the legacy wall_or_floor column aligned", () => {
    const parsed = productInputSchema.parse({ ...base, application: "Floor" });
    assert.equal(toProductColumns(parsed).wall_or_floor, "Floor");
    const other = productInputSchema.parse({ ...base, application: "Facade" });
    assert.equal(toProductColumns(other).wall_or_floor, null);
  });

  test("publish blockers only list what customers actually need", () => {
    assert.deepEqual(publishBlockers({ name: "A", product_code: "B", category: "C", imageCount: 1 }), []);
    assert.deepEqual(publishBlockers({ name: "A", product_code: "", category: "C", imageCount: 0 }), ["a product code", "at least one image"]);
  });
});
