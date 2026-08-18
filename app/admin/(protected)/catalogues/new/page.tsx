import { CatalogueForm } from "@/components/admin/CatalogueForm";
import { listCategoriesWithCounts } from "@/lib/admin/categories";

export const dynamic = "force-dynamic";

export default async function NewCataloguePage() {
  const categories = await listCategoriesWithCounts();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-medium">New catalogue</h1>
      <CatalogueForm categories={categories} />
    </div>
  );
}
