/** Debounced ?q= search box for /tiles (all-products, no-filter page) —
 *  same debounce pattern as FilterSidebar's search field, without the
 *  filter facets that page doesn't have. */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function TilesSearchBar({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialValue);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <input
      type="search"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search by name or code..."
      className="w-full max-w-md border border-outline-variant bg-surface px-4 py-3 font-body text-body text-on-surface placeholder:text-on-surface-variant transition-colors focus:border-secondary focus:outline-none"
    />
  );
}
