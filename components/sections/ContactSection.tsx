/**
 * Homepage contact block — info + form side by side. Reuses the existing
 * EnquiryForm (Name/Email/Phone/Message, already wired to the Supabase
 * `enquiries` table via lib/enquiry/actions.ts) rather than building a
 * second contact form with duplicate validation/submission logic; called
 * without a `product` so it renders as a plain general enquiry form.
 * Now the "/#contact" anchor target (previously the footer).
 */
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { CONTACT_INFO } from "@/lib/contact";

export function ContactSection() {
  return (
    <RevealOnScroll>
      <section id="contact" className="bg-background py-section-gap scroll-mt-20">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
            <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
              Contact
            </p>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
              Get in Touch
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter lg:gap-16 max-w-4xl mx-auto">
            <ul className="flex flex-col gap-6">
              <li className="flex items-start gap-4">
                <MapPin size={20} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-body text-body text-on-surface-variant leading-relaxed">
                  {CONTACT_INFO.address}
                </span>
              </li>
              <li className="flex items-center gap-4">
                <Phone size={20} className="text-secondary shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${CONTACT_INFO.phoneHref}`}
                  className="font-body text-body text-on-surface-variant transition-colors hover:text-secondary"
                >
                  {CONTACT_INFO.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-4">
                <Mail size={20} className="text-secondary shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="font-body text-body text-on-surface-variant transition-colors hover:text-secondary"
                >
                  {CONTACT_INFO.email}
                </a>
              </li>
            </ul>

            <EnquiryForm />
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
