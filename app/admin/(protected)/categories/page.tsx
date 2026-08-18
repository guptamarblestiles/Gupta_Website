import Link from "next/link";
import { listCategoriesWithCounts } from "@/lib/admin/categories";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesWithCounts();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Categories ({categories.length})</h1>
        <Link href="/admin/categories/new" className="rounded bg-white px-4 py-2 text-sm text-neutral-950">
          + New category
        </Link>
      </div>

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Products</th>
              <th className="px-4 py-2">Visible</th>
              <th className="px-4 py-2">Sort</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-neutral-800">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 text-neutral-400">
                  {c.product_count}
                  {c.product_count === 0 && (
                    <span className="ml-2 text-xs text-neutral-600">(hidden publicly — no products yet)</span>
                  )}
                </td>
                <td className="px-4 py-2">{c.is_visible ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{c.sort_order}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/categories/${c.id}`} className="mr-3 text-neutral-300 hover:text-white">
                    Edit
                  </Link>
                  <DeleteCategoryButton id={c.id} name={c.name} />
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
