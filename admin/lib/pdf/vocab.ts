/**
 * Keyword vocab for reading tile specs out of catalogue text. Copied from
 * the public site's lib/import/vocab.ts (the folder-import classifier) so
 * both importers guess finishes/sizes the same way; the admin app is
 * deployed from admin/ on its own and can't import across the boundary.
 * Keep the two in step if you tune either.
 */
export const FINISH_KEYWORDS: Record<string, string> = {
  "high gloss": "Glossy",
  glossy: "Glossy",
  gloss: "Glossy",
  "satin matt": "Satin Matt",
  matt: "Matte",
  matte: "Matte",
  satin: "Satin",
  polished: "Polished",
  "nano polish": "Polished",
  polish: "Polished",
  lappato: "Lappato",
  "sugar finish": "Sugar",
  carving: "Carving",
  rustic: "Rustic",
  textured: "Textured",
  structured: "Textured",
  "anti skid": "Anti-skid",
  "anti-skid": "Anti-skid",
};

export const SIZE_PATTERNS: RegExp[] = [
  /\b\d{3,4}\s*[xX×*]\s*\d{3,4}\s*mm\b/,
  /\b\d{2,3}\s*[xX×*]\s*\d{2,3}\s*cm\b/,
  /\b\d{1,2}\s*[xX×*]\s*\d{1,2}\s*(?:ft|feet|')/i,
  /\b\d{3,4}\s*[xX×*]\s*\d{3,4}\b/,
];
