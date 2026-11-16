/** Single source of truth for business facts (name, NAP, hours, domain,
 *  social links) used across metadata, JSON-LD, the footer, and the
 *  contact page, so they never drift out of sync. */

export const SITE_NAME = "Gupta Interior";

const PRODUCTION_FALLBACK_URL = "https://www.guptainterior.in";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

  if (isProduction) {
    // Don't throw at import time (that would break the build for every
    // route); fall back to the live host and make the misconfiguration loud.
    console.warn(
      `NEXT_PUBLIC_SITE_URL is not set in production; falling back to ${PRODUCTION_FALLBACK_URL}.`,
    );
    return PRODUCTION_FALLBACK_URL;
  }
  return "http://localhost:3000";
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
