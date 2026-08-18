"use server";

import { redirect } from "next/navigation";
import {
  createCatalogue,
  updateCatalogue,
  deleteCatalogue as deleteCatalogueRow,
  type CatalogueInput,
} from "@/lib/admin/catalogues";

export type CatalogueFormResult = { status: "error"; message: string } | void;

function readCatalogueInput(formData: FormData): CatalogueInput {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  return {
    title,
    description: description || null,
    category_id: categoryId || null,
    is_visible: formData.get("is_visible") === "on",
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  };
}

export async function createCatalogueAction(
  _prev: CatalogueFormResult,
  formData: FormData,
): Promise<CatalogueFormResult> {
  const input = readCatalogueInput(formData);
  if (!input.title) return { status: "error", message: "Title is required." };

  const pdf = formData.get("pdf");
  if (!(pdf instanceof File) || pdf.size === 0) {
    return { status: "error", message: "Select a PDF file to upload." };
  }

  try {
    await createCatalogue(input, pdf);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Failed to create catalogue." };
  }
  redirect("/admin/catalogues");
}

export async function updateCatalogueAction(
  id: string,
  _prev: CatalogueFormResult,
  formData: FormData,
): Promise<CatalogueFormResult> {
  const input = readCatalogueInput(formData);
  if (!input.title) return { status: "error", message: "Title is required." };

  const pdf = formData.get("pdf");
  const pdfFile = pdf instanceof File && pdf.size > 0 ? pdf : null;

  try {
    await updateCatalogue(id, input, pdfFile);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Failed to update catalogue." };
  }
  redirect("/admin/catalogues");
}

export async function deleteCatalogueAction(id: string) {
  await deleteCatalogueRow(id);
}
