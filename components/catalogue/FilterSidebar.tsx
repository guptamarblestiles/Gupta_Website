/**
 * FILTER CONTRACT — see lib/products/queries.ts.
 *
 * Every option (and its count) comes from the `facets` prop — live values
 * from the catalogue, never a hardcoded list. Each group is a checkbox
 * multi-select; toggling adds/removes the value on that group's URL param
 * (?application=&rooms=&size=&...). app/tiles and app/products are Server
 * Components that read those params and filter server-side. Search drives
 * `?q=`, debounced 400ms. Mobile gets a bottom-sheet drawer.
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import {
  FILTER_KEYS,
  FILTER_LABELS,
  type FacetOption,
  type FilterKey,
  type ProductFilterFacets,
  type ProductFilters,
} from "@/types/product";

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
    FILTER_KEYS.reduce((sum, key) => sum + (filters[key]?.length ?? 0), 0) + (filters.search ? 1 : 0);

  const controls = (
    <div className="flex flex-col gap-10">
      <div>
        <label
          htmlFor="catalogue-search"
          className="mb-3 block font-body text-label uppercase text-on-surface-variant"
        >
          Search
        </label>
        <input
          id="catalogue-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          className={inputClasses(false)}
        />
      </div>

      {FILTER_KEYS.map((key) => (
        <FilterGroup
          key={key}
          label={FILTER_LABELS[key]}
          options={facets[key]}
          active={filters[key] ?? []}
          onToggle={(value) => toggleValue(key, value)}
        />
      ))}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start font-body text-label uppercase text-secondary-strong transition-colors hover:text-on-surface"
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
          className="inline-flex items-center gap-2 border border-outline-variant px-6 py-3 font-body text-label uppercase text-on-surface transition-colors hover:border-secondary"
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
              className="fixed inset-0 z-[60] bg-on-surface/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="filter-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto bg-surface px-margin pt-6 pb-8 lg:hidden"
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
  options: FacetOption[];
  active: string[];
  onToggle: (value: string) => void;
};

const COLLAPSED_COUNT = 8;

function FilterGroup({ label, options, active, onToggle }: FilterGroupProps) {
  const [expanded, setExpanded] = useState(false);
  // Hide options that would return nothing, except ones already ticked.
  const visible = options.filter((o) => o.count > 0 || active.includes(o.value));
  if (visible.length === 0) return null;

  const shown = expanded ? visible : visible.slice(0, COLLAPSED_COUNT);

  return (
    <fieldset>
      <legend className="mb-3 font-body text-label uppercase text-on-surface-variant">
        {label}
      </legend>
      <div className="flex flex-col gap-3">
        {shown.map(({ value, count }) => {
          const checked = active.includes(value);
          return (
            <label key={value} className="group flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(value)}
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
                  "flex-1 font-body text-body transition-colors",
                  checked ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface",
                )}
              >
                {value}
              </span>
              <span className="font-body text-sm tabular-nums text-on-surface-variant">{count}</span>
            </label>
          );
        })}
      </div>
      {visible.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 font-body text-label uppercase text-secondary-strong transition-colors hover:text-on-surface"
        >
          {expanded ? "Show less" : `Show all ${visible.length}`}
        </button>
      )}
    </fieldset>
  );
}
