/** Single source of truth for business facts (name, NAP, hours, domain,
 *  social links) used across metadata, JSON-LD, the footer, and the
 *  contact page, so they never drift out of sync. */

export const SITE_NAME = "Gupta Interior";

const PRODUCTION_SITE_URL = "https://www.guptainterior.in";

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const url = raw ? raw.replace(/\/+$/, "") : PRODUCTION_SITE_URL;

  // The sitemap, robots.txt, canonicals, and JSON-LD all derive from this
  // value — if it silently resolves to localhost in a production build,
  // every one of those gets submitted to Google wrong. Fail loudly instead.
  if (process.env.NODE_ENV === "production" && url.includes("localhost")) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must not be localhost in production — set it in Vercel's environment variables (expected https://www.guptainterior.in).",
    );
  }

  return url;
}

export const SITE_URL = resolveSiteUrl();

export const BUSINESS_INFO = {
  name: SITE_NAME,
  legalName: SITE_NAME,
  address: {
    streetAddress: "Shop No. B-114, Mangolpur Kalan, Pathar Market",
    addressLocality: "Delhi",
    addressRegion: "Delhi",
    postalCode: "110085",
    addressCountry: "IN",
  },
  addressDisplay: "Shop No. B-114, Mangolpur Kalan, Pathar Market, Delhi - 110085",
  phoneDisplay: "97119 44187",
  phoneHref: "+919711944187",
  email: "guptamarblestiles@gmail.com",
  areaServed: "Delhi NCR",
  /** Monday(1) .. Sunday(7), ISO 8601 day numbers — Schema.org expects
   *  dayOfWeek as full day names, kept separately below for that use. */
  openingHours: {
    days: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ] as const,
    opens: "10:00",
    closes: "18:00",
    display: "Mon–Sat, 10:00 AM – 6:00 PM (Closed Sundays)",
  },
} as const;

/** Populate when real profile URLs exist (Instagram, Facebook, etc).
 *  Read by the footer and the LocalBusiness JSON-LD `sameAs` field —
 *  both omit the field entirely while this stays empty. */
export const socialLinks: string[] = [];
