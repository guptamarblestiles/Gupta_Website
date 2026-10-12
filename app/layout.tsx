import type { Metadata } from "next";
// Fonts are self-hosted via @fontsource rather than next/font/google — this
// avoids a build-time dependency on fonts.googleapis.com (which isn't
// reachable from every deployment/build environment) and ships zero
// third-party font requests at runtime.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/500-italic.css";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { GridLines } from "@/components/ui/GridLines";
import { NoiseOverlay } from "@/components/ui/NoiseOverlay";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Gupta Interior | Architectural Surfaces",
    template: "%s | Gupta Interior",
  },
  description:
    "Premium marble, granite, and tile surfaces curated for visionary architectural spaces.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Gupta Interior | Architectural Surfaces",
    description:
      "Premium marble, granite, and tile surfaces curated for visionary architectural spaces.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gupta Interior | Architectural Surfaces",
    description:
      "Premium marble, granite, and tile surfaces curated for visionary architectural spaces.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-body bg-background text-on-surface">
        {/* Visually hidden until focused — lets keyboard/screen-reader
            users skip the (floating, always-present) navbar and jump
            straight to page content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-on-surface focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <GridLines />
        <NoiseOverlay />
        {children}
      </body>
    </html>
  );
}
