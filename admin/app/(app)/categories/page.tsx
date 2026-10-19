import type { Metadata } from "next";
import { requireRole, roleAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFilterValues } from "@/lib/data/products";
import { PageHeader } from "@/components/ui/Display";
import { CategoryManager, type CategoryItem } from "@/components/catalogue/CategoryManager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const session = await requireRole("viewer");
  const db = await createClient();
  const [{ data, error }, values] = await Promise.all([db.from("categories").select("*").order("sort_order").order("name"), getFilterValues()]);
  if (error) throw error;
  const usage = new Map(values.filter((v) => v.filter === "category").map((v) => [v.value, v]));
  const managed = new Set((data ?? []).map((c) => c.name as string));
  const categories: CategoryItem[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image_url: c.image_url,
    is_visible: c.is_visible,
    sort_order: c.sort_order,
    total: usage.get(c.name)?.total ?? 0,
    published: usage.get(c.name)?.published ?? 0,
  }));
  const unmanaged = [...usage.values()].filter((v) => !managed.has(v.value)).sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="The groups customers browse by. A category only shows on the website when it is visible and has published products."
      />
      <CategoryManager
        categories={categories}
        unmanaged={unmanaged.map((u) => ({ name: u.value, total: u.total, published: u.published }))}
        allNames={[...usage.keys(), ...managed]}
        canEdit={roleAtLeast(session.role, "editor")}
        canDelete={roleAtLeast(session.role, "owner")}
      />
    </>
  );
}
