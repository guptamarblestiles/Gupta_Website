/** Human wording for audit_log rows (written by the audit_row_change trigger). */
const ENTITY: Record<string, string> = {
  products: "product",
  product_images: "product image",
  source_pdfs: "PDF",
  categories: "category",
  catalogues: "homepage catalogue",
  admin_users: "team member",
  enquiries: "enquiry",
};

export function describeActivity(row: { action: string; entity_type: string; entity_label: string | null }): string {
  const what = ENTITY[row.entity_type] ?? row.entity_type;
  const label = row.entity_label ? ` “${row.entity_label.length > 60 ? `${row.entity_label.slice(0, 57)}…` : row.entity_label}”` : "";
  if (row.entity_type === "product_images") {
    return row.action === "created" ? "added a product image" : row.action === "deleted" ? "removed a product image" : "reordered product images";
  }
  return `${row.action} ${what}${label}`;
}

export function activityHref(row: { entity_type: string; entity_id: string | null; action: string }): string | null {
  if (!row.entity_id || row.action === "deleted") return null;
  switch (row.entity_type) {
    case "products":
      return `/products/${row.entity_id}`;
    case "source_pdfs":
      return `/pdfs/${row.entity_id}`;
    case "categories":
      return `/categories`;
    case "enquiries":
      return `/enquiries`;
    default:
      return null;
  }
}

export const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  product_code: "Code",
  category: "Category",
  status: "Status",
  is_visible: "On website",
  finish: "Finish",
  size: "Size",
  series: "Collection",
  application: "Application",
  wall_or_floor: "Wall/floor",
  thickness: "Thickness",
  material: "Material",
  rooms: "Rooms",
  source_pdf_id: "Source PDF",
  source_page: "Source page",
  title: "Title",
  role: "Role",
  is_active: "Active",
  staff_notes: "Notes",
  description: "Description",
  price: "Price",
  slug: "Web address",
  sort_order: "Order",
  archived_at: "Archived",
  file_url: "File",
};
