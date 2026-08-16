import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-medium">New product</h1>
      <ProductForm />
    </div>
  );
}
