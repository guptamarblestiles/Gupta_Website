import { notFound } from "next/navigation";
import { getCategoryForEdit } from "@/lib/admin/categories";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let category;
  try {
    category = await getCategoryForEdit(id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-medium">Edit category</h1>
      <CategoryForm category={category} />
    </div>
  );
}
