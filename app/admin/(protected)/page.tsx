/** Product list: search + table + edit/delete. Search is a server-rendered
 *  ?q= param (no client-side filtering of a full list). */
import Link from "next/link";
import { listProducts } from "@/lib/admin/products";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await listProducts(q);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Products ({products.length})</h1>
        <Link href="/admin/products/new" className="rounded bg-white px-4 py-2 text-sm text-neutral-950">
          + New product
        </Link>
      </div>

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, code, category..."
          className="w-full max-w-sm rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </form>

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Finish</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-neutral-800">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 text-neutral-400">{p.product_code}</td>
                <td className="px-4 py-2">{p.category}</td>
                <td className="px-4 py-2">{p.finish ?? "—"}</td>
                <td className="px-4 py-2">{p.size ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/products/${p.id}`} className="mr-3 text-neutral-300 hover:text-white">
                    Edit
                  </Link>
                  <DeleteProductButton id={p.id} name={p.name} />
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
