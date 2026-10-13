/**
 * Site footer — dark palette (matches CtaBand directly above it so the
 * homepage closes on one continuous dark block). The "/#contact" anchor
 * now points at the dedicated ContactSection on the homepage rather than
 * the footer itself (see components/sections/ContactSection.tsx) — a real
 * contact form/info block is a more useful anchor target than the footer.
 */
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { InstagramIcon, LinkedinIcon } from "@/components/ui/SocialIcons";
import { CONTACT_INFO } from "@/lib/contact";
import { BUSINESS_INFO, socialLinks } from "@/lib/site";
import { COLLECTIONS } from "@/lib/collections";
import { BrandWordmark } from "@/components/ui/BrandWordmark";

const SOCIAL_ICONS: Record<string, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
};

function iconForLink(url: string) {
  const host = new URL(url).hostname;
  const key = Object.keys(SOCIAL_ICONS).find((k) => host.includes(k));
  return key ? SOCIAL_ICONS[key] : null;
}

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Tiles", href: "/tiles" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="bg-hero-bg border-t border-hero-border">
      <Container className="py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-16">
          <div className="md:col-span-1">
            <Link href="/" className="text-xl text-hero-foreground">
              <BrandWordmark />
            </Link>
            <p className="mt-2 font-body text-sm text-secondary-fixed">By Mayank Gupta</p>
            <p className="mt-4 font-body text-body text-hero-muted leading-relaxed max-w-xs">
              Architectural surfaces designed to transform spaces — curated marble, granite and
              tile for visionary projects.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <p className="font-body text-label uppercase text-hero-foreground mb-5">
              Quick Links
            </p>
            <ul className="flex flex-col gap-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-body text-hero-muted transition-colors duration-500 ease-luxury hover:text-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer collections">
            <p className="font-body text-label uppercase text-hero-foreground mb-5">
              Collections
            </p>
            <ul className="flex flex-col gap-3">
              {COLLECTIONS.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/collections/${c.slug}`}
                    className="font-body text-body text-hero-muted transition-colors duration-500 ease-luxury hover:text-secondary"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="font-body text-label uppercase text-hero-foreground mb-5">
              Contact
            </p>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-body text-body text-hero-muted">{CONTACT_INFO.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-secondary shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${CONTACT_INFO.phoneHref}`}
                  className="font-body text-body text-hero-muted transition-colors duration-500 ease-luxury hover:text-secondary"
                >
                  {CONTACT_INFO.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-secondary shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="font-body text-body text-hero-muted transition-colors duration-500 ease-luxury hover:text-secondary"
                >
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Clock size={18} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-body text-body text-hero-muted">
                  {BUSINESS_INFO.openingHours.display}
                </span>
              </li>
            </ul>
          </div>

          {socialLinks.length > 0 && (
            <div>
              <p className="font-body text-label uppercase text-hero-foreground mb-5">
                Follow
              </p>
              <div className="flex items-center gap-4">
                {socialLinks.map((url) => {
                  const Icon = iconForLink(url);
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Gupta Interior on ${new URL(url).hostname}`}
                      className="text-hero-muted transition-colors duration-500 ease-luxury hover:text-secondary"
                    >
                      {Icon ? <Icon size={18} /> : <span className="text-body">{new URL(url).hostname}</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-hero-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-sm text-hero-muted">
            &copy; {new Date().getFullYear()} Gupta Interior. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <p className="font-body text-sm text-hero-muted">Premium Marble &amp; Tile Curation</p>
            <Link
              href="/admin/login"
              className="font-body text-sm text-hero-muted/60 transition-colors duration-500 ease-luxury hover:text-secondary"
            >
              Admin
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
