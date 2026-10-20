import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { imageBoundsFromOps, iou, multiply, selectTileBoxes, type OpIds } from "@admin/lib/pdf/geometry";
import { captionLines, findCode, findFinish, findSize, groupLines, suggestForBox, type TextItem } from "@admin/lib/pdf/textHints";

const OPS: OpIds = {
  save: 10,
  restore: 11,
  transform: 12,
  paintFormXObjectBegin: 74,
  paintFormXObjectEnd: 75,
  paintImageXObject: 85,
  paintInlineImageXObject: 86,
};

describe("operator list geometry", () => {
  test("tracks save/transform/restore and form xobjects", () => {
    const fn = [OPS.save, OPS.transform, OPS.paintImageXObject, OPS.restore, OPS.paintFormXObjectBegin, OPS.transform, OPS.paintImageXObject, OPS.paintFormXObjectEnd, OPS.paintImageXObject];
    const args = [null, [200, 0, 0, 100, 50, 600], ["img1"], null, [[1, 0, 0, 1, 100, 100], [0, 0, 10, 10]], [50, 0, 0, 50, 0, 0], ["img2"], null, ["img3"]];
    const boxes = imageBoundsFromOps(fn, args, OPS);
    assert.deepEqual(boxes[0], { x0: 50, y0: 600, x1: 250, y1: 700 });
    assert.deepEqual(boxes[1], { x0: 100, y0: 100, x1: 150, y1: 150 });
    // After the form ends, the graphics state is back to identity.
    assert.deepEqual(boxes[2], { x0: 0, y0: 0, x1: 1, y1: 1 });
  });

  test("rotated/flipped images still get an axis-aligned box", () => {
    const boxes = imageBoundsFromOps([OPS.transform, OPS.paintImageXObject], [[0, 100, -100, 0, 300, 300], null], OPS);
    assert.deepEqual(boxes[0], { x0: 200, y0: 300, x1: 300, y1: 400 });
  });

  test("matrix multiply matches PDF order", () => {
    assert.deepEqual(multiply([2, 0, 0, 2, 10, 10], [1, 0, 0, 1, 5, 5]), [2, 0, 0, 2, 20, 20]);
  });

  test("selects tiles: drops icons, duplicates and backdrops, flags full-page art", () => {
    const tiles = selectTileBoxes(3, [
      { x: 0, y: 0, w: 1, h: 1 }, // backdrop containing the two tiles
      { x: 0.1, y: 0.1, w: 0.35, h: 0.35 },
      { x: 0.1005, y: 0.1, w: 0.35, h: 0.35 }, // same image drawn twice
      { x: 0.55, y: 0.1, w: 0.35, h: 0.35 },
      { x: 0.9, y: 0.95, w: 0.05, h: 0.03 }, // logo
    ]);
    assert.equal(tiles.length, 2);
    assert.ok(tiles[0].x < tiles[1].x);
    assert.match(tiles[0].key, /^p3-/);

    const single = selectTileBoxes(1, [{ x: 0, y: 0, w: 1, h: 0.95 }]);
    assert.deepEqual(single[0].flags, ["full_page"]);
  });

  test("iou", () => {
    assert.equal(iou({ x: 0, y: 0, w: 1, h: 1 }, { x: 0, y: 0, w: 1, h: 1 }), 1);
    assert.equal(iou({ x: 0, y: 0, w: 1, h: 1 }, { x: 2, y: 2, w: 1, h: 1 }), 0);
  });
});

describe("text hints", () => {
  test("codes skip sizes, years and units", () => {
    assert.equal(findCode("600x1200 mm GT-2001 Statuario"), "GT-2001");
    assert.equal(findCode("Design No. 5521 HL"), "5521");
    assert.equal(findCode("Size 600 x 600 mm 8 mm"), null);
    assert.equal(findCode("2008"), "2008"); // real Gupta design numbers look like years
    assert.equal(findCode("DR/1516/A Glossy"), "DR/1516/A");
  });

  test("sizes assume millimetres for bare four-digit catalogue sizes", () => {
    assert.equal(findSize("Size: 600 X 1200"), "600x1200mm");
    assert.equal(findSize("60 x 120 cm"), "60x120cm");
    assert.equal(findSize("2x4 ft"), "2x4ft");
    assert.equal(findSize("no size here"), null);
  });

  test("finish keywords prefer the most specific phrase", () => {
    assert.equal(findFinish("HIGH GLOSS series"), "Glossy");
    assert.equal(findFinish("satin matt surface"), "Satin Matt");
    assert.equal(findFinish("anti skid floor"), "Anti-skid");
    assert.equal(findFinish("nothing"), null);
  });

  const items: TextItem[] = [
    { str: "Kitchen Series", x: 0.1, y: 0.03, w: 0.3, h: 0.03 },
    { str: "Size 300 x 600 mm | Glossy | Wall", x: 0.1, y: 0.07, w: 0.6, h: 0.02 },
    { str: "Statuario", x: 0.1, y: 0.47, w: 0.15, h: 0.02 },
    { str: "GT-2001", x: 0.27, y: 0.47, w: 0.1, h: 0.02 },
    { str: "Onyx Blue 2002", x: 0.55, y: 0.47, w: 0.2, h: 0.02 },
  ];
  const lines = groupLines(items);

  test("captions belong to the tile they sit under", () => {
    const left = captionLines({ x: 0.1, y: 0.1, w: 0.35, h: 0.35 }, lines);
    assert.equal(left[0].text, "Statuario GT-2001");
    const right = captionLines({ x: 0.55, y: 0.1, w: 0.35, h: 0.35 }, lines);
    assert.equal(right[0].text, "Onyx Blue 2002");
  });

  test("suggestion uses caption first and warns when falling back to the page", () => {
    const { suggested, warnings } = suggestForBox({ x: 0.1, y: 0.1, w: 0.35, h: 0.35 }, lines);
    assert.equal(suggested.product_code, "GT-2001");
    assert.equal(suggested.name, "Statuario");
    assert.equal(suggested.size, "300x600mm");
    assert.equal(suggested.finish, "Glossy");
    assert.equal(suggested.series, "Kitchen Series");
    assert.equal(suggested.application, "Wall");
    assert.ok(warnings.includes("size_from_page"));
    assert.ok(warnings.includes("finish_from_page"));
    assert.ok(!warnings.includes("no_code"));
  });

  test("scanned pages give nulls and a clear warning, never guesses", () => {
    const { suggested, warnings } = suggestForBox({ x: 0, y: 0, w: 1, h: 1 }, [], ["full_page"]);
    assert.equal(suggested.product_code, null);
    assert.deepEqual(warnings, ["full_page", "no_text"]);
  });
});
