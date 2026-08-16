/**
 * Keyword vocab for auto-classifying products from local folder names during
 * import (see lib/import/classify.ts). Deliberately kept as plain data, not
 * baked into classify.ts, because the real taxonomy will need tuning once
 * someone who knows the catalogue reviews the first import batch — edit the
 * arrays/maps below and rerun, no logic changes needed.
 */

/** Matched case-insensitively against product/category folder names and any
 *  extracted description text; first match wins. */
export const FINISH_KEYWORDS: Record<string, string> = {
  glossy: "Glossy",
  gloss: "Glossy",
  matt: "Matte",
  matte: "Matte",
  satin: "Satin",
  polished: "Polished",
  polish: "Polished",
  carving: "Carving",
  textured: "Textured",
  rustic: "Rustic",
};

export const COLOR_KEYWORDS = [
  "white",
  "grey",
  "gray",
  "black",
  "beige",
  "brown",
  "gold",
  "golden",
  "silver",
  "cream",
  "crema",
  "bianco",
  "ivory",
  "green",
  "blue",
  "pink",
  "purple",
  "red",
  "amber",
];

/** Folder-name substrings that imply wall vs. floor use. Most catalogues
 *  here don't distinguish, so this stays sparse on purpose — anything not
 *  matched is left blank for the admin to set. */
export const WALL_OR_FLOOR_KEYWORDS: Record<string, "Wall" | "Floor"> = {
  parking: "Floor",
};

/** Size patterns tried in order against description text and folder names.
 *  mm patterns (from parsed catalogue descriptions) are preferred over the
 *  coarser ft/in patterns implied by a folder name like "2x4" or "12x18". */
export const SIZE_PATTERNS: RegExp[] = [
  /\d{3,4}\s*[xX]\s*\d{3,4}\s*mm/,
  /\d{1,2}\s*[xX]\s*\d{1,2}\s*(?:ft|feet|')/i,
  /\b\d{1,2}[xX]\d{1,2}\b/,
];
