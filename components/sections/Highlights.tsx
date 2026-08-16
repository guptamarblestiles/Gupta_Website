/** Quality/benefit grid — plain credibility content, no product data. */
import { Award, BadgeCheck, HeartHandshake, Wrench } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const HIGHLIGHTS = [
  {
    icon: Award,
    title: "Premium Materials",
    description: "Sourced from trusted quarries and suppliers, selected slab by slab.",
  },
  {
    icon: BadgeCheck,
    title: "Certified Quality",
    description: "Durability-tested surfaces that hold up to daily commercial and residential use.",
  },
  {
    icon: Wrench,
    title: "Custom Solutions",
    description: "Finishes and sizing tailored to your project's exact requirements.",
  },
  {
    icon: HeartHandshake,
    title: "Expert Support",
    description: "25+ years of industry experience guiding every selection.",
  },
];

export function Highlights() {
  return (
    <RevealOnScroll>
      <section className="bg-background py-section-gap">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
            <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
              Why Gupta&apos;s
            </p>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
              Highlights
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-start text-left">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="font-display text-headline-sm-mobile md:text-headline-sm text-on-surface mb-2">
                  {title}
                </h3>
                <p className="font-body text-body text-on-surface-variant leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
