import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { InstagramIcon, LinkedinIcon } from "@/components/ui/SocialIcons";

const NAVIGATE_LINKS = [
  { label: "Home", href: "/" },
  { label: "Collection", href: "/products" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

const CATEGORY_LINKS = [
  { label: "Marble Slabs", href: "/products?category=Marble+Slabs" },
  { label: "Granite Slabs", href: "/products?category=Granite+Slabs" },
  { label: "GVT Tiles", href: "/products?category=GVT+Tiles" },
  { label: "Bathroom Tiles", href: "/products?category=Bathroom+Tiles" },
];

/**
 * Site footer — dark palette (matches CtaBand directly above it so the
 * homepage closes on one continuous dark block) and doubles as the
 * "/#contact" anchor target for the Navbar's Contact link, satisfying
 * brief section 2 objective #9 ("Contact Gupta's").
 */
export function Footer() {
  return (
    <footer id="contact" className="bg-hero-bg border-t border-hero-border scroll-mt-20">
      <Container className="py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-16">
          <div className="md:col-span-1">
            <Link href="/" className="font-display text-xl text-hero-foreground tracking-tight">
              GUPTA&apos;S
            </Link>
            <p className="mt-4 font-body text-body text-hero-muted leading-relaxed max-w-xs">
              Architectural surfaces designed to transform spaces — curated marble, granite and
              tile for visionary projects.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Gupta's on Instagram"
                className="text-hero-muted transition-colors duration-300 hover:text-secondary"
              >
                <InstagramIcon size={18} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Gupta's on LinkedIn"
                className="text-hero-muted transition-colors duration-300 hover:text-secondary"
              >
                <LinkedinIcon size={18} />
              </a>
            </div>
          </div>

          <nav aria-label="Footer navigation">
            <p className="font-body text-label uppercase tracking-widest text-hero-foreground mb-5">
              Navigate
            </p>
            <ul className="flex flex-col gap-3">
              {NAVIGATE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-body text-hero-muted transition-colors duration-300 hover:text-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer categories">
            <p className="font-body text-label uppercase tracking-widest text-hero-foreground mb-5">
              Collections
            </p>
            <ul className="flex flex-col gap-3">
              {CATEGORY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-body text-hero-muted transition-colors duration-300 hover:text-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="font-body text-label uppercase tracking-widest text-hero-foreground mb-5">
              Contact
            </p>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-body text-body text-hero-muted">
                  Gupta&apos;s Showroom,
                  <br />
                  Industrial Estate Road, India
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-secondary shrink-0" aria-hidden="true" />
                <a
                  href="tel:+910000000000"
                  className="font-body text-body text-hero-muted transition-colors duration-300 hover:text-secondary"
                >
                  +91 00000 00000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-secondary shrink-0" aria-hidden="true" />
                <a
                  href="mailto:enquiries@guptamarblesandtiles.com"
                  className="font-body text-body text-hero-muted transition-colors duration-300 hover:text-secondary"
                >
                  enquiries@guptamarblesandtiles.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-hero-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-sm text-hero-muted">
            &copy; {new Date().getFullYear()} Gupta&apos;s. All rights reserved.
          </p>
          <p className="font-body text-sm text-hero-muted">Premium Marble &amp; Tile Curation</p>
        </div>
      </Container>
    </footer>
  );
}
