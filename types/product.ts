export type ProductCategory = "Marble Slabs" | "Granite Slabs" | "GVT Tiles" | "Bathroom Tiles";

export type ProductFinish = "Polished" | "Honed" | "Matte" | "Leathered";

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
  size: string; // e.g. "1200 x 2400 mm"
  origin?: string;
  material?: string;
  availableFinishes?: string;
  description: string;
  imageUrl: string; // primary/thumbnail image
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: ProductCategory[];
  finish?: ProductFinish[];
  size?: string[];
  search?: string;
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
