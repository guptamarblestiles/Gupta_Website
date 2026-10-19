import type { ProductStatus } from "@/lib/catalogue/product";

/** The product editor's field values (all strings, as typed). Lives outside
 *  the "use client" form component so server pages can import the defaults. */
export type ProductFormValues = {
  name: string;
  product_code: string;
  slug: string;
  category: string;
  status: ProductStatus;
  series: string;
  finish: string;
  finish_detail: string;
  size: string;
  application: string;
  rooms: string[];
  pattern: string;
  color: string;
  thickness: string;
  material: string;
  faces: string;
  tiles_per_box: string;
  coverage_per_box: string;
  price: string;
  price_unit: string;
  price_note: string;
  description: string;
  source_pdf_id: string;
  source_page: string;
  review_note: string;
  images: string[];
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  product_code: "",
  slug: "",
  category: "",
  status: "draft",
  series: "",
  finish: "",
  finish_detail: "",
  size: "",
  application: "",
  rooms: [],
  pattern: "",
  color: "",
  thickness: "",
  material: "",
  faces: "",
  tiles_per_box: "",
  coverage_per_box: "",
  price: "",
  price_unit: "",
  price_note: "",
  description: "",
  source_pdf_id: "",
  source_page: "",
  review_note: "",
  images: [],
};
