import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { NewsletterForm } from "./NewsletterForm";

/**
 * Closing CTA band — solid charcoal panel, matching the hero, so the
 * homepage bookends itself. Copy sticks to what the business actually
 * does (sell tiles/marble, visit the showroom, get a quote) — no "design
 * consultants" claim, since no design/consultation service is verified.
 */
export function CtaBand() {
  return (
    <RevealOnScroll>
      <section className="bg-hero-bg py-section-gap">
        <Container className="flex flex-col items-center text-center">
          <p className="font-body text-label text-secondary-fixed mb-4 uppercase">Get Started</p>
          <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-hero-foreground mb-6 max-w-2xl">
            Find the right material for your project
          </h2>
          <p className="font-body text-body-lg text-hero-muted max-w-xl mb-10 leading-relaxed">
            Browse the full catalogue online, or visit our Delhi showroom to see finishes and
            sizes in person before you order.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
            <Button href="/products" variant="hero-primary" size="lg">
              Browse the Catalogue
            </Button>
            <Button href="/contact" variant="hero-secondary" size="lg">
              Enquire Now
            </Button>
          </div>

          <div className="w-full flex flex-col items-center gap-3 pt-10 border-t border-hero-border">
            <p className="font-body text-label text-hero-muted uppercase">Stay in the know</p>
            <NewsletterForm />
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
