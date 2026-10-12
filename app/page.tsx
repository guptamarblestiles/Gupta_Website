import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/hero/HeroSection";
import { BusinessOverview } from "@/components/sections/BusinessOverview";
import { CategoriesSection } from "@/components/sections/CategoriesSection";
import { ApplicationsTiles } from "@/components/sections/ApplicationsTiles";
import { Highlights } from "@/components/sections/Highlights";
import { MaterialStoriesSection } from "@/components/sections/MaterialStoriesSection";
import { CatalogueSection } from "@/components/sections/CatalogueSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { TrustStats } from "@/components/home/TrustStats";
import { CtaBand } from "@/components/home/CtaBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { BUSINESS_INFO, SITE_NAME, SITE_URL, socialLinks } from "@/lib/site";

function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: BUSINESS_INFO.name,
    url: SITE_URL,
    telephone: BUSINESS_INFO.phoneHref,
    email: BUSINESS_INFO.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_INFO.address.streetAddress,
      addressLocality: BUSINESS_INFO.address.addressLocality,
      addressRegion: BUSINESS_INFO.address.addressRegion,
      postalCode: BUSINESS_INFO.address.postalCode,
      addressCountry: BUSINESS_INFO.address.addressCountry,
    },
    areaServed: BUSINESS_INFO.areaServed,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...BUSINESS_INFO.openingHours.days],
      opens: BUSINESS_INFO.openingHours.opens,
      closes: BUSINESS_INFO.openingHours.closes,
    },
    ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
  };
}

function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={localBusinessJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <Navbar variant="auto" />
      <main id="main-content">
        <HeroSection />
        <BusinessOverview />
        <CategoriesSection />
        <ApplicationsTiles />
        <Highlights />
        <MaterialStoriesSection />
        <CatalogueSection />
        <ContactSection />
        <TrustStats />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
