import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { NewsletterForm } from "./NewsletterForm";

/**
 * "Begin Your Vision" CTA band — approved Stitch copy. Deliberately
 * returns to the dark hero palette so the homepage bookends itself (dark
 * hero to open, dark CTA + footer to close), reinforcing the cinematic
 * dark identity rather than ending on a flat white note.
 */
export function CtaBand() {
  return (
    <RevealOnScroll>
      <section className="bg-hero-bg py-section-gap">
        <Container className="flex flex-col items-center text-center">
          <p className="font-body text-label uppercase tracking-widest text-secondary mb-4">
            Get Started
          </p>
          <h2 className="font-display text-headline md:text-display-mobile text-hero-foreground mb-6 max-w-2xl">
            Begin Your Vision
          </h2>
          <p className="font-body text-body-lg text-hero-muted max-w-xl mb-10 leading-relaxed">
            Speak with our design consultants, request samples, or browse the full catalogue —
            whichever suits where your project stands today.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
            <Button href="/products" variant="hero-primary" size="lg">
              Browse the Catalogue
            </Button>
            <Button href="/#contact" variant="hero-secondary" size="lg">
              Talk to Us
            </Button>
          </div>

          <div className="w-full flex flex-col items-center gap-3 pt-10 border-t border-hero-border">
            <p className="font-body text-label uppercase tracking-widest text-hero-muted">
              Stay in the know
            </p>
            <NewsletterForm />
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
