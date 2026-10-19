import { z } from "zod";
import type { Rect } from "@/lib/pdf/geometry";

/** Editable fields on a PDF import candidate (stored in `suggested` jsonb). */
export const CANDIDATE_FIELDS = [
  "name",
  "product_code",
  "category",
  "size",
  "finish",
  "application",
  "thickness",
  "material",
  "series",
  "faces",
] as const;
export type CandidateField = (typeof CANDIDATE_FIELDS)[number];
export type CandidateValues = Partial<Record<CandidateField, string | null>>;

export type CandidateStatus = "pending" | "approved" | "rejected" | "skipped" | "created";

export type Candidate = {
  id: string;
  source_pdf_id: string;
  page: number;
  crop: Rect;
  crop_key: string | null;
  image_path: string | null;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  detection: "embedded_image" | "manual";
  suggested: CandidateValues;
  warnings: string[];
  status: CandidateStatus;
  product_id: string | null;
  updated_at: string;
};

export const newCandidateSchema = z.object({
  page: z.number().int().positive(),
  crop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().gt(0).max(1), h: z.number().gt(0).max(1) }),
  crop_key: z.string().max(120).nullable(),
  image_path: z.string().max(400),
  image_url: z.string().url(),
  image_width: z.number().int().positive(),
  image_height: z.number().int().positive(),
  detection: z.enum(["embedded_image", "manual"]),
  suggested: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  warnings: z.array(z.string().max(40)).max(20),
});
export type NewCandidate = z.infer<typeof newCandidateSchema>;

/**
 * Values to create a product from: what the reviewer typed for this tile,
 * falling back to the PDF-wide defaults they set. Never invents anything:
 * a field empty in both stays empty.
 */
export function mergeWithDefaults(values: CandidateValues, defaults: CandidateValues & { namePrefix?: string | null }): CandidateValues {
  const out: CandidateValues = {};
  for (const key of CANDIDATE_FIELDS) {
    const own = values[key];
    out[key] = own != null && String(own).trim() !== "" ? String(own).trim() : (defaults[key]?.toString().trim() || null);
  }
  if (!out.name && out.product_code && defaults.namePrefix?.trim()) {
    out.name = `${defaults.namePrefix.trim()} ${out.product_code}`;
  }
  return out;
}

/** For "add to existing product": only fill columns that are empty now. */
export function fillOnlyEmpty<T extends Record<string, unknown>>(existing: Record<string, unknown>, incoming: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const [k, v] of Object.entries(incoming) as [keyof T & string, T[keyof T & string]][]) {
    const cur = existing[k];
    const empty = cur === null || cur === undefined || cur === "" || (Array.isArray(cur) && cur.length === 0);
    if (empty && v !== null && v !== undefined && v !== "") patch[k] = v;
  }
  return patch;
}
