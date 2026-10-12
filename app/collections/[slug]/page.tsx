import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { TileCard } from "@/components/catalogue/TileCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { COLLECTIONS, getCollectionBySlug } from "@/lib/collections";
import { getProducts } from "@/lib/products/queries";
import { SITE_URL } from "@/lib/site";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) return { title: "Collection Not Found", robots: { index: false, follow: false } };

  const canonical = `${SITE_URL}/collections/${collection.slug}`;
  return {
    title: collection.metaTitle,
    description: collection.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: collection.metaTitle,
      description: collection.metaDescription,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: collection.metaTitle,
      description: collection.metaDescription,
    },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) notFound();

  const { products, total } = await getProducts(collection.filters, 1, 12);
  const related = COLLECTIONS.filter((c) => c.slug !== collection.slug).slice(0, 3);
  const collectionUrl = `${SITE_URL}/collections/${collection.slug}`;

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.name,
    description: collection.metaDescription,
    url: collectionUrl,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE_URL}/collections` },
      { "@type": "ListItem", position: 3, name: collection.name, item: collectionUrl },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: collection.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20 pb-20">
        <section className="py-section-gap">
          <Container>
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 font-body text-sm text-on-surface-variant">
                <li>
                  <Link href="/" className="hover:text-secondary transition-colors">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/collections" className="hover:text-secondary transition-colors">
                    Collections
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-on-surface">{collection.name}</li>
              </ol>
            </nav>

            <div className="max-w-3xl mb-12">
              <p className="mb-4 font-body text-label uppercase text-secondary-strong">
                Collection
              </p>
              <h1 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-6">
                {collection.h1}
              </h1>
              <div className="font-body text-body-lg text-on-surface-variant leading-relaxed space-y-4 whitespace-pre-line">
                {collection.intro}
              </div>
              <p className="mt-6 font-body text-sm text-on-surface-variant">
                {total} products in this collection
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Button href="/#contact">Enquire About This Collection</Button>
                <Button href="/products" variant="secondary">
                  View All in Catalogue
                </Button>
              </div>
            </div>

            {products.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-outline-variant mb-16">
                {products.map((product, i) => (
                  <TileCard key={product.id} product={product} preload={i < 4} />
                ))}
              </div>
            )}

            <div className="max-w-3xl mb-16">
              <h2 className="font-display text-headline-mobile text-on-surface mb-6">
                Frequently Asked Questions
              </h2>
              <dl className="space-y-6">
                {collection.faqs.map((faq) => (
                  <div key={faq.question}>
                    <dt className="font-body font-semibold text-on-surface mb-1">{faq.question}</dt>
                    <dd className="font-body text-body text-on-surface-variant leading-relaxed">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {related.length > 0 && (
              <div className="max-w-3xl">
                <h2 className="font-display text-headline-mobile text-on-surface mb-6">
                  Related Collections
                </h2>
                <ul className="flex flex-wrap gap-4">
                  {related.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/collections/${c.slug}`}
                        className="font-body text-body text-secondary-strong hover:underline"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
