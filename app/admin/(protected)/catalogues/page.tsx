import Link from "next/link";
import { listCatalogues } from "@/lib/admin/catalogues";
import { DeleteCatalogueButton } from "@/components/admin/DeleteCatalogueButton";

export const metadata = { title: "Catalogues" };
export const dynamic = "force-dynamic";

export default async function AdminCataloguesPage() {
  const catalogues = await listCatalogues();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Catalogues ({catalogues.length})</h1>
        <Link href="/admin/catalogues/new" className="rounded bg-white px-4 py-2 text-sm text-neutral-950">
          + New catalogue
        </Link>
      </div>

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Visible</th>
              <th className="px-4 py-2">Sort</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {catalogues.map((c) => (
              <tr key={c.id} className="border-t border-neutral-800">
                <td className="px-4 py-2">{c.title}</td>
                <td className="px-4 py-2 text-neutral-400">
                  {c.pdf_size_bytes ? `${Math.round(c.pdf_size_bytes / 1024 / 1024)}MB` : "—"}
                </td>
                <td className="px-4 py-2">{c.is_visible ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{c.sort_order}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/catalogues/${c.id}`} className="mr-3 text-neutral-300 hover:text-white">
                    Edit
                  </Link>
                  <DeleteCatalogueButton id={c.id} title={c.title} />
                </td>
              </tr>
            ))}
            {catalogues.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No catalogues uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
