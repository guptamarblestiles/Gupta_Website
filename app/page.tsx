import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/hero/HeroSection";
import { ScrollTransition } from "@/components/home/ScrollTransition";
import { CategoryRow } from "@/components/home/CategoryRow";
import { FeaturedCollection } from "@/components/home/FeaturedCollection";
import { TrustStats } from "@/components/home/TrustStats";
import { CtaBand } from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <>
      <Navbar variant="auto" />
      <main>
        <HeroSection />
        <ScrollTransition />
        <CategoryRow />
        <FeaturedCollection />
        <TrustStats />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
