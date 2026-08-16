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
  origin?: string;
  material?: string;
  availableFinishes?: string;
  description: string;
  imageUrl: string; // primary/thumbnail image — derived from images[0], see rowToProduct
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: ProductCategory[];
  finish?: ProductFinish[];
  size?: string[];
  color?: string[];
  wallOrFloor?: string[];
  collection?: string[];
  search?: string;
}

/** Distinct facet values actually present in the catalogue right now —
 *  what drives each FilterSidebar option list. See getFilterFacets. */
export interface ProductFilterFacets {
  categories: string[];
  finishes: string[];
  sizes: string[];
  colors: string[];
  wallOrFloors: string[];
  collections: string[];
}

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
