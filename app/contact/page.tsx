import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { CONTACT_INFO } from "@/lib/contact";
import { BUSINESS_INFO, SITE_URL } from "@/lib/site";

const canonical = `${SITE_URL}/contact`;
const title = "Contact Us – Showroom in Mangolpur Kalan, Delhi";
const description =
  "Visit Gupta Interior's showroom in Mangolpur Kalan, Rohini, Delhi. Call, email, or get directions for marble, granite, and tile enquiries.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, type: "website", url: canonical },
  twitter: { card: "summary_large_image", title, description },
};

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  BUSINESS_INFO.addressDisplay,
)}`;

export default function ContactPage() {
  return (
    <>
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20 pb-20">
        <section className="py-section-gap">
          <Container>
            <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
              <p className="font-body text-label uppercase text-secondary-strong mb-4">
                Contact
              </p>
              <h1 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
                Visit Gupta Interior in Delhi
              </h1>
              <p className="mt-4 font-body text-body-lg text-on-surface-variant">
                Our showroom in Mangolpur Kalan, Rohini is open Monday to Saturday. Stop by to see
                marble, granite, and tile samples in person, or reach out below.
              </p>
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
                <li className="flex items-start gap-4">
                  <Clock size={20} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="font-body text-body text-on-surface-variant leading-relaxed">
                    {BUSINESS_INFO.openingHours.display}
                  </span>
                </li>
                <li>
                  <Button href={mapsUrl} variant="secondary" target="_blank" rel="noreferrer noopener">
                    Get Directions
                  </Button>
                </li>
              </ul>

              <EnquiryForm />
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
