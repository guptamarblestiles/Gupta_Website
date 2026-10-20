import { z } from "zod";
import { cleanText, normalizeSize, normalizeThickness } from "@admin/lib/catalogue/normalize";

export const PRODUCT_STATUSES = ["draft", "review", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  review: "Needs review",
  published: "Published",
  archived: "Archived",
};

export const STATUS_HELP: Record<ProductStatus, string> = {
  draft: "Not on the website. Keep working on it.",
  review: "Not on the website. Flagged for someone to check before publishing.",
  published: "Visible to customers on the website.",
  archived: "Hidden and set aside. Can be restored any time.",
};

/** The set the public site's Application filter already uses (wall_or_floor). */
export const APPLICATIONS = ["Wall", "Floor", "Both"] as const;

/** Columns the admin form edits — a subset of public.products. */
export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  product_code: string;
  category: string;
  status: ProductStatus;
  series: string | null;
  collection: string | null;
  finish: string | null;
  finish_detail: string | null;
  size: string | null;
  application: string | null;
  wall_or_floor: string | null;
  rooms: string[];
  pattern: string | null;
  color: string | null;
  thickness: string | null;
  material: string | null;
  faces: number | null;
  tiles_per_box: number | null;
  coverage_per_box: string | null;
  price: number | null;
  price_unit: string | null;
  price_note: string | null;
  description: string;
  source_pdf_id: string | null;
  source_page: number | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

const optionalText = z
  .string()
  .max(200, "Keep this under 200 characters.")
  .nullish()
  .transform((v) => cleanText(v));

const optionalInt = (label: string, max: number) =>
  z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0 || n > max) {
        ctx.addIssue({ code: "custom", message: `${label} must be a whole number between 1 and ${max}.` });
        return z.NEVER;
      }
      return n;
    });

export const productInputSchema = z
  .object({
    name: z.string().transform((v) => cleanText(v) ?? "").pipe(z.string().min(2, "Enter a product name.").max(160)),
    product_code: z
      .string()
      .transform((v) => cleanText(v) ?? "")
      .pipe(z.string().min(1, "Enter the manufacturer's product code.").max(80)),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only.")
      .max(120),
    category: z.string().transform((v) => cleanText(v) ?? "").pipe(z.string().min(1, "Choose or type a category.").max(80)),
    status: z.enum(PRODUCT_STATUSES),
    series: optionalText,
    finish: optionalText,
    finish_detail: optionalText,
    size: optionalText.transform((v) => normalizeSize(v)),
    application: optionalText,
    rooms: z
      .array(z.string())
      .default([])
      .transform((list) => [...new Set(list.map((r) => cleanText(r)).filter((r): r is string => Boolean(r)))].sort()),
    pattern: optionalText,
    color: optionalText,
    thickness: optionalText.transform((v) => normalizeThickness(v)),
    material: optionalText,
    faces: optionalInt("Number of faces", 500),
    tiles_per_box: optionalInt("Tiles per box", 1000),
    coverage_per_box: optionalText,
    price: z
      .union([z.string(), z.number()])
      .nullish()
      .transform((v, ctx) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          ctx.addIssue({ code: "custom", message: "Price must be a positive number, or leave it empty." });
          return z.NEVER;
        }
        return Math.round(n * 100) / 100;
      }),
    price_unit: optionalText,
    price_note: optionalText,
    description: z.string().max(4000).nullish().transform((v) => (v ?? "").trim()),
    source_pdf_id: z.string().uuid().nullish().or(z.literal("").transform(() => null)),
    source_page: optionalInt("Source page", 5000),
    review_note: optionalText,
    images: z.array(z.string().url()).max(12, "A product can have at most 12 images.").default([]),
  })
  .superRefine((p, ctx) => {
    if (p.source_page && !p.source_pdf_id) {
      ctx.addIssue({ code: "custom", path: ["source_page"], message: "Choose the source PDF this page number belongs to." });
    }
    if (p.status === "published" && p.images.length === 0) {
      ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one image before publishing." });
    }
  });

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductValues = z.output<typeof productInputSchema>;

/** The DB columns written for a product save (status/images handled separately). */
export function toProductColumns(v: ProductValues) {
  const application = v.application;
  return {
    name: v.name,
    product_code: v.product_code,
    slug: v.slug,
    category: v.category,
    series: v.series,
    finish: v.finish,
    finish_detail: v.finish_detail,
    size: v.size,
    application,
    // The public Application filter falls back to wall_or_floor for legacy
    // rows; keep it aligned so the two never disagree.
    wall_or_floor: application && (APPLICATIONS as readonly string[]).includes(application) ? application : null,
    rooms: v.rooms,
    pattern: v.pattern,
    color: v.color,
    thickness: v.thickness,
    material: v.material,
    faces: v.faces,
    tiles_per_box: v.tiles_per_box,
    coverage_per_box: v.coverage_per_box,
    price: v.price,
    price_unit: v.price_unit,
    price_note: v.price_note,
    description: v.description,
    source_pdf_id: v.source_pdf_id ?? null,
    source_page: v.source_page,
    review_note: v.review_note,
  };
}

/** What must be true for customers to see a product. Optional specs being
 *  empty is NOT a problem and is never reported here. */
export function publishBlockers(p: { name?: string | null; product_code?: string | null; category?: string | null; imageCount: number }): string[] {
  const blockers: string[] = [];
  if (!p.name?.trim()) blockers.push("a name");
  if (!p.product_code?.trim()) blockers.push("a product code");
  if (!p.category?.trim()) blockers.push("a category");
  if (p.imageCount === 0) blockers.push("at least one image");
  return blockers;
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
