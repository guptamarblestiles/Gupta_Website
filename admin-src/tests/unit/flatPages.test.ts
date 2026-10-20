/**
 * Behaviour on "flat" catalogue pages — one scanned picture per page with
 * the design number printed in the artwork, which is how Gupta's own
 * source catalogue (gupta-marble-tiles-and-cement-05-08-2026.pdf) is made.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { snapRect, type Pixels } from "@admin/lib/pdf/snap";
import { findFaces, findMaterial, findSeries, groupLines, suggestForBox, type TextItem } from "@admin/lib/pdf/textHints";

/** 400x600 page: grey vertical gradient background, a 200x200 "tile" at
 *  (60,90) with a bold inner border line at 12px inset (the trap). */
function syntheticPage(): Pixels {
  const width = 400;
  const height = 600;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 120 + Math.round((x / width) * 60); // smooth gradient
      const inTile = x >= 60 && x < 260 && y >= 90 && y < 290;
      if (inTile) {
        v = (x * 7 + y * 13) % 50 > 25 ? 230 : 190; // busy artwork
        const inner = x === 72 || x === 247 || y === 102 || y === 277;
        if (inner) v = 20;
      }
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("snap to tile edges", () => {
  test("a rough box lands on the outer tile boundary, not the inner border line", () => {
    const page = syntheticPage();
    const rough = { x: 70 / 400, y: 100 / 600, w: 185 / 400, h: 185 / 600 };
    const { rect, snappedSides } = snapRect(page, rough);
    assert.equal(snappedSides, 4);
    assert.equal(Math.round(rect.x * 400), 60);
    assert.equal(Math.round(rect.y * 600), 90);
    assert.equal(Math.round((rect.x + rect.w) * 400), 260);
    assert.equal(Math.round((rect.y + rect.h) * 600), 290);
  });

  test("leaves the box alone on a blank page", () => {
    const blank: Pixels = { data: new Uint8ClampedArray(200 * 200 * 4).fill(255), width: 200, height: 200 };
    const rough = { x: 0.2, y: 0.2, w: 0.5, h: 0.5 };
    const { rect, snappedSides } = snapRect(blank, rough);
    assert.equal(snappedSides, 0);
    assert.deepEqual(rect, rough);
  });
});

describe("OCR text on a flat page", () => {
  // Word boxes as Tesseract returned them for page 6 of the live catalogue
  // (positions as page fractions; tile at left, specs to the right).
  const words: [string, number, number, number, number][] = [
    ["117", 0.81, 0.2, 0.12, 0.035],
    ["600", 0.72, 0.258, 0.05, 0.015],
    ["X", 0.78, 0.258, 0.015, 0.015],
    ["600", 0.8, 0.258, 0.05, 0.015],
    ["MM", 0.86, 0.258, 0.04, 0.015],
    ["PORCELAIN", 0.76, 0.288, 0.09, 0.011],
    ["TILES", 0.86, 0.288, 0.05, 0.011],
    ["8MM", 0.77, 0.31, 0.04, 0.011],
    ["THICKNESS", 0.82, 0.31, 0.11, 0.011],
    ["SURFACE", 0.06, 0.585, 0.12, 0.012],
    ["CARVING", 0.08, 0.61, 0.17, 0.018],
    ["SERIES", 0.12, 0.638, 0.13, 0.018],
    ["FACES", 0.06, 0.845, 0.1, 0.016],
    ["01", 0.09, 0.885, 0.04, 0.016],
  ];
  const items: TextItem[] = words.map(([str, x, y, w, h]) => ({ str, x, y, w, h }));
  const tile = { x: 0.0843, y: 0.1415, w: 0.495, h: 0.3234 };

  test("reads the design number, size, thickness, finish, material and faces", () => {
    const { suggested, warnings } = suggestForBox(tile, groupLines(items), [], true);
    assert.equal(suggested.product_code, "117");
    assert.equal(suggested.size, "600x600mm");
    assert.equal(suggested.thickness, "8 mm");
    assert.equal(suggested.finish, "Carving");
    assert.equal(suggested.material, "Porcelain");
    assert.equal(suggested.series, null, "'Surface Carving Series' is a finish, not a collection");
    assert.ok(warnings.includes("code_from_page"));
  });

  test("the prominent code is only used when the page has a single tile", () => {
    const { suggested, warnings } = suggestForBox(tile, groupLines(items), [], false);
    assert.equal(suggested.product_code, null);
    assert.ok(warnings.includes("no_code"));
  });

  test("helpers", () => {
    assert.equal(findSeries("KITCHEN SERIES 300x450"), "Kitchen Series");
    assert.equal(findSeries("Surface Matt Series"), null);
    assert.equal(findMaterial("Double Charge Vitrified Tiles"), "Double Charge Vitrified");
    assert.equal(findFaces("FACES 01"), 1);
    assert.equal(findFaces("4 Faces"), 4);
  });
});
