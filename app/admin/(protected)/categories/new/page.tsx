import { CategoryForm } from "@/components/admin/CategoryForm";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-medium">New category</h1>
      <CategoryForm />
    </div>
  );
}
