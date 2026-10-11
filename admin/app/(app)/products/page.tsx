import type { Metadata } from "next";
import Link from "next/link";
import { FileWarning, ImageOff, Package, Plus } from "lucide-react";
import { requireRole, roleAtLeast } from "@/lib/auth";
import { getFilterValues, listPdfOptions, listProducts, type ProductListParams } from "@/lib/data/products";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/Display";
import { LinkButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductTable } from "@/components/products/ProductTable";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<ProductListParams> }) {
  const session = await requireRole("viewer");
  const params = await searchParams;
  const [{ rows, total, page, pageSize }, values, pdfs] = await Promise.all([listProducts(params), getFilterValues(), listPdfOptions()]);
  const options = (f: string) => values.filter((v) => v.filter === f).sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  const filtered = Object.entries(params).some(([k, v]) => v && !["page", "sort"].includes(k));
  const canEdit = roleAtLeast(session.role, "editor");

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Every tile in the catalogue. Only published products appear on the website."
        actions={
          canEdit && (
            <LinkButton href="/products/new" variant="primary" icon={<Plus className="size-4" />}>
              Add product
            </LinkButton>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <QuickFilter href="/products?images=none" active={params.images === "none"} icon={<ImageOff className="size-3.5" />}>
          Without images
        </QuickFilter>
        <QuickFilter href="/products?pdf=none" active={params.pdf === "none"} icon={<FileWarning className="size-3.5" />}>
          Without source PDF
        </QuickFilter>
        <QuickFilter href="/products?status=review" active={params.status === "review"}>
          Needs review
        </QuickFilter>
        <QuickFilter href="/products?status=draft" active={params.status === "draft"}>
          Drafts
        </QuickFilter>
        <QuickFilter href="/products?status=archived" active={params.status === "archived"}>
          Archived
        </QuickFilter>
      </div>

      <Card>
        <ProductFilters
          params={params}
          categories={options("category").map((o) => o.value)}
          sizes={options("size").map((o) => o.value)}
          finishes={options("finish").map((o) => o.value)}
          series={options("series").map((o) => o.value)}
          pdfs={pdfs.map((p) => ({ id: p.id, title: p.title }))}
        />
        <div className="border-t border-line px-4 py-2.5 text-sm text-ink-muted" aria-live="polite">
          {plural(total, "product")}
          {filtered ? " match these filters" : params.status === "all" ? "" : " (archived hidden)"}
        </div>
        {rows.length ? (
          <ProductTable
            rows={rows}
            canEdit={canEdit}
            categories={[...new Set([...options("category").map((o) => o.value)])]}
          />
        ) : (
          <EmptyState
            icon={<Package className="size-5" />}
            title={filtered ? "No products match" : "No products yet"}
            action={
              filtered ? (
                <LinkButton href="/products">Clear filters</LinkButton>
              ) : (
                canEdit && (
                  <LinkButton href="/products/new" variant="primary">
                    Add your first product
                  </LinkButton>
                )
              )
            }
          >
            {filtered ? "Try a different search or remove a filter." : "Add products by hand, or import them from a brand PDF."}
          </EmptyState>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/products" params={params as Record<string, string | undefined>} />
      </Card>
    </>
  );
}

function QuickFilter({ href, active, icon, children }: { href: string; active: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={active ? "/products" : href} aria-pressed={active}>
      <Badge tone={active ? "copper" : "neutral"} className="px-3 py-1 text-[13px]">
        {icon}
        {children}
      </Badge>
    </Link>
  );
}
