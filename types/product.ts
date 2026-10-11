/**
 * Category/finish stopped being fixed enums when the catalogue schema was
 * rebuilt (Part 1) for the fresh, manually-curated product set — the real
 * taxonomy comes from whatever's actually in the `products` table (see
 * getFilterFacets in lib/products/queries.ts), not a hardcoded list here.
 * Kept as named aliases rather than inlining `string` purely for readability
 * at call sites; a few homepage mock entries (lib/products/mockProducts.ts)
 * still use the old showcase category names as plain strings, which is
 * still valid now that these are just `string`.
 */
export type ProductCategory = string;
export type ProductFinish = string;

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  alt: string;
  sortOrder: number;
}

/** The original brand PDF a product was curated from. `fileUrl` is absent
 *  until the PDF has been uploaded — the UI shows an "unavailable" state. */
export interface SourcePdf {
  id: string;
  title: string;
  originalFilename: string;
  fileUrl?: string;
  fileSizeBytes?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  productCode: string;
  category: ProductCategory;
  finish: ProductFinish;
  size: string; // e.g. "600x1200mm" or "12x18" — free text, see queries.ts
  color?: string;
  wallOrFloor?: string;
  collection?: string;
  application?: string;
  rooms?: string[];
  pattern?: string;
  thickness?: string;
  series?: string;
  finishDetail?: string;
  sourcePage?: number;
  sourcePdf?: SourcePdf;
  origin?: string;
  material?: string;
  availableFinishes?: string;
  /** Optional — absent/null means no price is shown publicly. */
  price?: number;
  priceUnit?: string;
  priceNote?: string;
  description: string;
  imageUrl: string; // primary/thumbnail image — derived from images[0], see rowToProduct
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

/** Every filter group, in sidebar order. Each is OR'd within the group and
 *  AND'd across groups. Keys are also the URL search-param names. */
export const FILTER_KEYS = [
  "application",
  "rooms",
  "size",
  "pattern",
  "color",
  "thickness",
  "category",
  "series",
  "finish",
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const FILTER_LABELS: Record<FilterKey, string> = {
  application: "Application",
  rooms: "Rooms",
  size: "Size",
  pattern: "Pattern",
  color: "Colour",
  thickness: "Thickness",
  category: "Product Category",
  series: "Series / Collection",
  finish: "Finish",
};

export type ProductFilters = Partial<Record<FilterKey, string[]>> & { search?: string };

export interface FacetOption {
  value: string;
  /** Products matching every OTHER active filter that have this value. */
  count: number;
}

/** Option list (with live counts) per filter group — what drives each
 *  FilterSidebar section. See getFilterFacets. */
export type ProductFilterFacets = Record<FilterKey, FacetOption[]>;

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface EnquiryInput {
  name: string;
  email: string;
  phone?: string;
  productId?: string;
  productName?: string;
  message: string;
}
