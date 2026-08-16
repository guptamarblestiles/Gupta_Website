/**
 * Editorial testimonial section: fetches real room photos server-side
 * (lib/media/tileImages) as backgrounds, one per testimonial, and hands
 * off to TestimonialsCarousel (client) for the crossfade/stagger
 * animation. Falls back to a plain white card (no image) per testimonial
 * that has none, rather than breaking.
 *
 * PLACEHOLDER CONTENT: quotes/attributions are generic, unattributed-to-
 * any-real-person — no invented customer names or companies. Presenting
 * fabricated testimonials as real reviews from named people would be
 * misleading to site visitors; replace every entry here with a real
 * review (and real attribution) before this section goes live.
 */
import { getTestimonialImages } from "@/lib/media/tileImages";
import { TestimonialsCarousel } from "./TestimonialsCarousel";

const TESTIMONIALS = [
  {
    quote:
      "The marble selection elevated the entire space. Every slab was matched and installed exactly as promised.",
    attribution: "Residential Client",
  },
  {
    quote:
      "Reliable sourcing and consistent quality across a large commercial order — exactly what a tight project timeline needs.",
    attribution: "Commercial Project Lead",
  },
  {
    quote:
      "Our lobby renovation needed a finish that photographed as well as it wore. This delivered on both.",
    attribution: "Hospitality Designer",
  },
  {
    quote: "Straightforward to work with, from sample selection through final installation.",
    attribution: "Interior Designer",
  },
];

export async function Testimonials() {
  const images = await getTestimonialImages();

  return (
    <TestimonialsCarousel
      items={TESTIMONIALS.map((t, i) => ({ ...t, imageUrl: images[i]?.imageUrl }))}
    />
  );
}
