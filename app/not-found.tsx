import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20 pb-20">
        <section className="py-section-gap">
          <Container className="max-w-xl text-center mx-auto">
            <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
              404
            </p>
            <h1 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-6">
              Page Not Found
            </h1>
            <p className="font-body text-body-lg text-on-surface-variant leading-relaxed mb-10">
              The page you&apos;re looking for doesn&apos;t exist or may have moved. Browse our
              tile and marble collections below, or head back to the full catalogue.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button href="/collections" variant="primary" size="lg">
                Browse Collections
              </Button>
              <Button href="/products" variant="secondary" size="lg">
                Full Catalogue
              </Button>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
