import { getProductForEdit } from "@/lib/admin/products";
import { ProductForm } from "@/components/admin/ProductForm";
import { ImageManager } from "@/components/admin/ImageManager";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { product, images } = await getProductForEdit(id);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="mb-6 text-xl font-medium">Edit {product.name}</h1>
        <ProductForm product={product} />
      </div>
      <div>
        <h2 className="mb-4 text-lg font-medium">Images ({images.length}/5)</h2>
        <ImageManager productId={product.id} slug={product.slug} images={images} />
      </div>
    </div>
  );
}
