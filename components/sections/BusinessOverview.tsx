/**
 * "Who We Are" — company overview. Content/copy is unchanged from the
 * previous version (see the integration report for which specific claims
 * — "15+ years", "thousands of projects", the showroom location — remain
 * unverified, carried over as-is, not newly added here). The section is
 * edge-to-edge (no Container) so AboutScrollImage's image can expand to a
 * true full-bleed background; the text itself still gets the site's
 * normal horizontal margin via its own inner wrapper.
 */
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { AboutScrollImage } from "./AboutScrollImage";

const IMAGE_SRC = "/images/about/about-hallway-2400.webp";
const IMAGE_ALT = "Grey marble tile floor in a modern hallway";

export function BusinessOverview() {
  return (
    <RevealOnScroll>
      <section className="bg-background">
        <AboutScrollImage
          imageSrc={IMAGE_SRC}
          imageAlt={IMAGE_ALT}
          kicker="Who We Are"
          headingLead="Architectural Surfaces for"
          headingAccent="Visionary"
          headingTail="Spaces"
          paragraph="At Gupta Interior, we source and curate the world's most exceptional marble and stone. With 15+ years of expertise, we've transformed thousands of projects across residential, commercial, and hospitality sectors. Visit our showroom in Mangolpur Kalan, Rohini, serving homeowners and architects across Delhi NCR."
          buttonHref="/tiles"
          buttonLabel="Explore Our Range"
        />
      </section>
    </RevealOnScroll>
  );
}
