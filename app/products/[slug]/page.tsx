import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { ImageGallery } from "@/components/product/ImageGallery";
import { TileCard } from "@/components/catalogue/TileCard";
import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { StickyEnquireBar } from "@/components/product/StickyEnquireBar";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { DownloadResources } from "@/components/product/DownloadResources";
import { VerticalLabel } from "@/components/ui/VerticalLabel";
import { getProductBySlug, getRelatedProducts } from "@/lib/products/queries";
import { getStoneForProduct } from "@/lib/products/stone";
import type { Product } from "@/types/product";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found",
      robots: { index: false, follow: false },
    };
  }

  const specs = [product.size, product.finish].filter(Boolean).join(", ");
  const title = `${product.name}${specs ? ` – ${specs}` : ""} | Delhi`;
  const description = specs
    ? `${product.name} — ${specs} ${product.category.toLowerCase()} available in Delhi. ${product.description}`.slice(
        0,
        155,
      )
    : product.description.slice(0, 155);
  const canonical = `${SITE_URL}/products/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
  };
}

const SPEC_ROWS: { label: string; value: (product: Product) => string | undefined }[] = [
  { label: "Product Code", value: (p) => p.productCode },
  { label: "Category", value: (p) => p.category },
  { label: "Series", value: (p) => p.series },
  { label: "Size", value: (p) => p.size || undefined },
  { label: "Thickness", value: (p) => p.thickness },
  { label: "Finish", value: (p) => p.finish || undefined },
  { label: "Material", value: (p) => p.material },
  { label: "Application", value: (p) => p.application },
  { label: "Rooms", value: (p) => p.rooms?.join(", ") },
  { label: "Pattern", value: (p) => p.pattern },
  { label: "Colour", value: (p) => p.color },
];

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const stone = getStoneForProduct(product);
  const related = await getRelatedProducts(product, 4);

  const productUrl = `${SITE_URL}/products/${product.slug}`;
  const additionalProperty = [
    product.size && { "@type": "PropertyValue", name: "Size", value: product.size },
    product.finish && { "@type": "PropertyValue", name: "Finish", value: product.finish },
  ].filter(Boolean);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images?.length
      ? product.images.map((image) => image.imageUrl)
      : [product.imageUrl],
    sku: product.productCode,
    category: product.category,
    url: productUrl,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(additionalProperty.length ? { additionalProperty } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Catalogue", item: `${SITE_URL}/products` },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category,
        item: `${SITE_URL}/products?category=${encodeURIComponent(product.category)}`,
      },
      { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
    ],
  };

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20 pb-20 md:pb-0">
        <section className="py-section-gap">
          <Container>
            <nav aria-label="Breadcrumb" className="mb-8 md:mb-12">
              <ol className="flex flex-wrap items-center gap-2 font-body text-sm text-on-surface-variant">
                <li>
                  <Link href="/products" className="hover:text-secondary transition-colors">
                    Catalogue
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href={`/products?category=${encodeURIComponent(product.category)}`}
                    className="hover:text-secondary transition-colors"
                  >
                    {product.category}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-on-surface">
                  {product.name}
                </li>
              </ol>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter lg:gap-16">
              <div className="relative">
                <VerticalLabel className="absolute -left-8 top-0 bottom-0">
                  {product.category} / {product.productCode}
                </VerticalLabel>
                <ImageGallery
                  stone={stone}
                  productName={product.name}
                  images={product.images?.map((image) => ({ url: image.imageUrl, alt: image.alt }))}
                />
              </div>

              <div className="flex flex-col">
                <p className="font-body text-label uppercase text-secondary-strong mb-4">
                  {product.category}
                </p>
                <h1 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-4">
                  {product.name}
                </h1>
                <p className="drop-cap font-body text-body-lg text-on-surface-variant mb-8">
                  {product.description}
                </p>

                <dl className="divide-y divide-outline-variant/50 border-y border-outline-variant/50 mb-10">
                  {SPEC_ROWS.map(({ label, value }) => {
                    const resolved = value(product);
                    if (!resolved) return null;
                    return (
                      <div key={label} className="flex items-center justify-between py-4 gap-4">
                        <dt className="font-body text-label uppercase text-on-surface-variant">
                          {label}
                        </dt>
                        <dd className="font-body text-body text-on-surface text-right">{resolved}</dd>
                      </div>
                    );
                  })}
                </dl>

                <DownloadResources product={product} />

                <PriceDisplay
                  price={product.price}
                  priceUnit={product.priceUnit}
                  priceNote={product.priceNote}
                  className="mb-6 font-body text-body-lg text-on-surface"
                />

                <Button href="#enquire" variant="primary" size="lg" className="w-full sm:w-auto">
                  Enquire About This Tile
                </Button>
              </div>
            </div>
          </Container>
        </section>

        <section id="enquire" className="scroll-mt-20 py-section-gap">
          <Container>
            <div className="mx-auto max-w-xl">
              <div className="mb-10 md:mb-12 text-center">
                <p className="mb-4 font-body text-label uppercase text-secondary-strong">
                  Enquire
                </p>
                <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
                  Interested in {product.name}?
                </h2>
                <p className="mt-4 font-body text-body-lg text-on-surface-variant">
                  Share a few details and our team will follow up with pricing, availability, and
                  sample options.
                </p>
              </div>

              <EnquiryForm product={{ id: product.id, name: product.name }} />
            </div>
          </Container>
        </section>

        {related.length > 0 && (
          <RevealOnScroll>
            <section className="bg-surface-variant py-section-gap">
              <Container>
                <div className="mb-12 md:mb-16 max-w-2xl">
                  <p className="font-body text-label uppercase text-secondary-strong mb-4">
                    Related Selections
                  </p>
                  <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
                    You May Also Consider
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
                  {related.map((item) => (
                    <TileCard key={item.id} product={item} />
                  ))}
                </div>
              </Container>
            </section>
          </RevealOnScroll>
        )}
      </main>
      <StickyEnquireBar />
      <Footer />
    </>
  );
}
