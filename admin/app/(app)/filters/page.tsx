import type { Metadata } from "next";
import { requireRole, roleAtLeast } from "@/lib/auth";
import { getFilterValues } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Display";
import { FilterManager } from "@/components/catalogue/FilterManager";

export const metadata: Metadata = { title: "Filters & collections" };

const GROUPS = [
  { key: "series", label: "Collections / series", missingParam: "series" },
  { key: "size", label: "Sizes", missingParam: "size" },
  { key: "finish", label: "Finishes", missingParam: "finish" },
  { key: "application", label: "Application (wall / floor)", missingParam: "application" },
  { key: "thickness", label: "Thickness", missingParam: "thickness" },
  { key: "material", label: "Material", missingParam: "material" },
  { key: "pattern", label: "Pattern", missingParam: "pattern" },
  { key: "color", label: "Colour", missingParam: "color" },
  { key: "rooms", label: "Rooms", missingParam: null },
] as const;

export default async function FiltersPage() {
  const session = await requireRole("viewer");
  const values = await getFilterValues();
  const db = await createClient();
  const { count: published } = await db.from("products").select("id", { count: "exact", head: true }).eq("status", "published");
  const groups = await Promise.all(
    GROUPS.map(async (g) => {
      const list = values.filter((v) => v.filter === g.key).sort((a, b) => b.total - a.total || a.value.localeCompare(b.value));
      const covered = list.reduce((n, v) => n + v.published, 0);
      return { ...g, values: list, missingPublished: g.key === "rooms" ? null : Math.max(0, (published ?? 0) - covered) };
    }),
  );

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Filters & collections"
        description="The website's filter options come straight from these product values — no code changes needed. Tidy them here: rename, merge near-duplicates, and spot products with gaps."
      />
      <FilterManager groups={groups} canEdit={roleAtLeast(session.role, "editor")} />
    </>
  );
}
