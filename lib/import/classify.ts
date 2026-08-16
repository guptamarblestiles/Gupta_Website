/**
 * Turns one (category folder, product folder[, description text]) triple
 * from the local image folder into a best-guess product record, using the
 * keyword vocab in lib/import/vocab.ts. Shared by the one-time bulk import
 * script (scripts/import/bulkImport.ts) and the /admin/import review UI —
 * both need identical guesses so the review grid matches what the script
 * would have produced.
 *
 * Every field here is a guess the admin can overwrite before upload; this
 * module never talks to Supabase or touches the filesystem.
 */
import { COLOR_KEYWORDS, FINISH_KEYWORDS, SIZE_PATTERNS, WALL_OR_FLOOR_KEYWORDS } from "./vocab";

export type ClassifiedProduct = {
  productCode: string;
  name: string;
  slug: string;
  category: string;
  finish: string;
  size: string;
  color: string;
  wallOrFloor: string;
  collection: string;
  description: string;
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanize(folderName: string): string {
  return folderName
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstMatch(haystack: string, keywords: Record<string, string>): string {
  const lower = haystack.toLowerCase();
  for (const [key, value] of Object.entries(keywords)) {
    if (lower.includes(key)) return value;
  }
  return "";
}

function firstColor(haystack: string): string {
  const lower = haystack.toLowerCase();
  const hit = COLOR_KEYWORDS.find((c) => lower.includes(c));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : "";
}

function firstSize(haystack: string): string {
  for (const pattern of SIZE_PATTERNS) {
    const match = haystack.match(pattern);
    if (match) return match[0].replace(/\s+/g, "");
  }
  return "";
}

function firstCollection(description: string): string {
  const match = description.match(/([A-Za-z][A-Za-z ]*?)\s+collection/i);
  return match ? humanize(match[1].trim()) : "";
}

export function classifyProduct(
  categoryFolder: string,
  productFolder: string,
  description = "",
): ClassifiedProduct {
  const combined = `${description} ${productFolder} ${categoryFolder}`;

  return {
    productCode: productFolder,
    name: humanize(productFolder),
    slug: slugify(`${categoryFolder}-${productFolder}`),
    category: humanize(categoryFolder),
    finish: firstMatch(combined, FINISH_KEYWORDS),
    size: firstSize(description) || firstSize(categoryFolder) || firstSize(productFolder),
    color: firstColor(combined),
    wallOrFloor: firstMatch(combined, WALL_OR_FLOOR_KEYWORDS as unknown as Record<string, string>),
    collection: firstCollection(description),
    description,
  };
}
