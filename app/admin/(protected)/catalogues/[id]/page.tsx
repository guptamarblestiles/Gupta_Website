import { notFound } from "next/navigation";
import { getCatalogueForEdit } from "@/lib/admin/catalogues";
import { listCategoriesWithCounts } from "@/lib/admin/categories";
import { CatalogueForm } from "@/components/admin/CatalogueForm";

export default async function EditCataloguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let catalogue;
  try {
    catalogue = await getCatalogueForEdit(id);
  } catch {
    notFound();
  }
  const categories = await listCategoriesWithCounts();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-medium">Edit catalogue</h1>
      <CatalogueForm catalogue={catalogue} categories={categories} />
    </div>
  );
}
