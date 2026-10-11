import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { COLLECTIONS } from "@/lib/collections";
import { SITE_URL } from "@/lib/site";

const TITLE = "Tile Collections in Delhi";
const DESCRIPTION =
  "Browse Gupta Interior's tile collections by application and finish — wall, floor, porcelain, glossy, and matt tiles in Delhi.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/collections` },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: `${SITE_URL}/collections` },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function CollectionsIndexPage() {
  return (
    <>
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20">
        <section className="py-section-gap">
          <Container>
            <div className="mb-12 max-w-2xl">
              <p className="mb-4 font-body text-label uppercase tracking-widest text-secondary-strong">
                Collections
              </p>
              <h1 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
                Tile Collections in Delhi
              </h1>
              <p className="mt-4 font-body text-body-lg text-on-surface-variant">
                Browse by application and finish, curated from our full Delhi catalogue.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {COLLECTIONS.map((c) => (
                <Link
                  key={c.slug}
                  href={`/collections/${c.slug}`}
                  className="block border border-outline-variant p-6 transition-colors hover:border-secondary"
                >
                  <h2 className="font-display text-xl text-on-surface mb-2">{c.name}</h2>
                  <p className="font-body text-sm text-on-surface-variant">{c.metaDescription}</p>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
