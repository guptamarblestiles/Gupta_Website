import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/hero/HeroSection";
import { ScrollTransition } from "@/components/home/ScrollTransition";
import { BusinessOverview } from "@/components/sections/BusinessOverview";
import { ApplicationsTiles } from "@/components/sections/ApplicationsTiles";
import { Highlights } from "@/components/sections/Highlights";
import { CatalogueSection } from "@/components/sections/CatalogueSection";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactSection } from "@/components/sections/ContactSection";
import { TrustStats } from "@/components/home/TrustStats";
import { CtaBand } from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <>
      <Navbar variant="auto" />
      <main id="main-content">
        <HeroSection />
        <ScrollTransition />
        <BusinessOverview />
        <ApplicationsTiles />
        <Highlights />
        <CatalogueSection />
        <Testimonials />
        <ContactSection />
        <TrustStats />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
