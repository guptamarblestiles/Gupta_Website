/**
 * FILTER CONTRACT (Part 3) — read this before touching filter behavior.
 *
 * Every option list rendered here (category/finish/size/color/wallOrFloor/
 * collection) comes from the `facets` prop — distinct values actually
 * present in the catalogue right now (lib/products/queries.ts's
 * getFilterFacets) — never a hardcoded list. The real taxonomy comes from
 * whatever folder names were fed through the Part 2 import and changes as
 * products are added, so a fixed enum here would silently stop matching
 * real data (this is exactly what broke when the old hardcoded
 * "Marble Slabs" / "Polished" etc. lists stopped matching the rebuilt
 * schema's free-text categories).
 *
 * Each facet is a checkbox multi-select; toggling a value adds/removes it
 * from that key's query param (?category=&finish=&size=&color=&
 * wallOrFloor=&collection=), which app/products/page.tsx (a Server
 * Component) reads and passes straight to getProducts — filtering always
 * happens server-side, never by slicing an already-fetched list. `search`
 * drives `?q=`, debounced 400ms.
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import type { ProductFilterFacets, ProductFilters } from "@/types/product";

type FilterKey = "category" | "finish" | "size" | "color" | "wallOrFloor" | "collection";

type FilterSidebarProps = {
  filters: ProductFilters;
  resultCount: number;
  /** Distinct facet values actually present in the catalogue right now —
   *  see getFilterFacets in lib/products/queries.ts. */
  facets: ProductFilterFacets;
};

/**
 * Category/Finish/Size/Color/Wall-Floor/Collection checkboxes + search,
 * driving the URL search params that app/products/page.tsx (a Server
 * Component) reads to filter the grid server-side. This is the one part of
 * the catalogue that genuinely needs "use client" — router access, a
 * debounced input, and the mobile drawer's open/close state.
 *
 * Renders the same filter controls twice: a static desktop sidebar, and a
 * mobile "FILTERS" button that opens a bottom-sheet drawer (brief's explicit
 * mobile decision — not a horizontal scroll row).
 */
export function FilterSidebar({ filters, resultCount, facets }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(filters.search ?? "");

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      params.delete("page");
      pushParams(params);
    }, 400);
    return () => clearTimeout(timeout);
    // Only re-run when the user edits the field; pushParams/searchParams are
    // read fresh from the closure each time the timeout actually fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function pushParams(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function toggleValue(key: FilterKey, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);
    params.delete(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    next.forEach((v) => params.append(key, v));
    params.delete("page");
    pushParams(params);
  }

  function clearAll() {
    setSearch("");
    router.push(pathname, { scroll: false });
  }

  const activeCount =
    (filters.category?.length ?? 0) +
    (filters.finish?.length ?? 0) +
    (filters.size?.length ?? 0) +
    (filters.color?.length ?? 0) +
    (filters.wallOrFloor?.length ?? 0) +
    (filters.collection?.length ?? 0) +
    (filters.search ? 1 : 0);

  const controls = (
    <div className="flex flex-col gap-10">
      <div>
        <label
          htmlFor="catalogue-search"
          className="mb-3 block font-body text-label uppercase tracking-widest text-on-surface-variant"
        >
          Search
        </label>
        <input
          id="catalogue-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          className="w-full border border-outline-variant bg-surface px-4 py-3 font-body text-body text-on-surface placeholder:text-on-surface-variant transition-colors focus:border-secondary focus:outline-none"
        />
      </div>

      <FilterGroup
        label="Category"
        options={facets.categories}
        active={filters.category ?? []}
        onToggle={(value) => toggleValue("category", value)}
      />
      <FilterGroup
        label="Finish"
        options={facets.finishes}
        active={filters.finish ?? []}
        onToggle={(value) => toggleValue("finish", value)}
      />
      <FilterGroup
        label="Size"
        options={facets.sizes}
        active={filters.size ?? []}
        onToggle={(value) => toggleValue("size", value)}
      />
      <FilterGroup
        label="Color"
        options={facets.colors}
        active={filters.color ?? []}
        onToggle={(value) => toggleValue("color", value)}
      />
      <FilterGroup
        label="Wall / Floor"
        options={facets.wallOrFloors}
        active={filters.wallOrFloor ?? []}
        onToggle={(value) => toggleValue("wallOrFloor", value)}
      />
      <FilterGroup
        label="Collection"
        options={facets.collections}
        active={filters.collection ?? []}
        onToggle={(value) => toggleValue("collection", value)}
      />

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start font-body text-label uppercase tracking-widest text-secondary-strong transition-colors hover:text-on-surface"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-64 shrink-0">{controls}</aside>

      <div className="lg:hidden mb-8 sticky top-16 z-30 -mx-margin px-margin py-3 bg-background/95 backdrop-blur-xl border-b border-outline-variant/50">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 border border-outline-variant px-6 py-3 font-body text-label uppercase tracking-widest text-on-surface transition-colors hover:border-secondary"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
          {activeCount > 0 && <span className="text-secondary-strong">({activeCount})</span>}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="filter-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="filter-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface px-margin pt-6 pb-8 lg:hidden"
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="font-display text-headline-sm text-on-surface">Filters</h2>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setMobileOpen(false)}
                  className="-mr-2 p-2 text-on-surface-variant hover:text-on-surface"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {controls}

              <div className="sticky bottom-0 mt-10 bg-surface pt-4">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Show {resultCount} {resultCount === 1 ? "Result" : "Results"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

type FilterGroupProps = {
  label: string;
  options: string[];
  active: string[];
  onToggle: (value: string) => void;
};

function FilterGroup({ label, options, active, onToggle }: FilterGroupProps) {
  if (options.length === 0) return null;

  return (
    <div>
      <p className="mb-3 font-body text-label uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const checked = active.includes(option);
          return (
            <label key={option} className="group flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2",
                  checked
                    ? "border-secondary bg-secondary"
                    : "border-outline-variant group-hover:border-secondary",
                )}
              >
                {checked && <Check size={12} className="text-white" strokeWidth={3} aria-hidden="true" />}
              </span>
              <span
                className={cn(
                  "font-body text-body transition-colors",
                  checked ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface",
                )}
              >
                {option}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
