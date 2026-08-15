import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type PaginationProps = {
  page: number;
  totalPages: number;
  prevHref?: string;
  nextHref?: string;
};

/**
 * Prev/Next pagination for the catalogue grid — chosen over "Load More"
 * since results are server-filtered per page already (task 8) and
 * Prev/Next keeps every page a plain, linkable, server-rendered URL with
 * no client JS required.
 */
export function Pagination({ page, totalPages, prevHref, nextHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Catalogue pagination"
      className="mt-16 md:mt-20 flex items-center justify-center gap-6"
    >
      <PageLink href={prevHref} label="Previous" icon="prev" />
      <p className="font-body text-label uppercase tracking-widest text-on-surface-variant">
        Page {page} of {totalPages}
      </p>
      <PageLink href={nextHref} label="Next" icon="next" />
    </nav>
  );
}

type PageLinkProps = {
  href?: string;
  label: string;
  icon: "prev" | "next";
};

function PageLink({ href, label, icon }: PageLinkProps) {
  const classes = cn(
    "inline-flex items-center gap-2 border px-6 py-3 font-body text-label uppercase tracking-widest transition-colors",
    href
      ? "border-outline-variant text-on-surface hover:border-secondary hover:text-secondary"
      : "border-outline-variant/50 text-on-surface-variant/40",
  );

  const content = (
    <>
      {icon === "prev" && <ChevronLeft size={16} aria-hidden="true" />}
      {label}
      {icon === "next" && <ChevronRight size={16} aria-hidden="true" />}
    </>
  );

  if (!href) {
    return (
      <span className={classes} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
