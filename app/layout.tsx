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

export const metadata: Metadata = {
  title: {
    default: "D R Traders | Architectural Surfaces",
    template: "%s | D R Traders",
  },
  description:
    "Premium marble, granite, and tile surfaces curated for visionary architectural spaces.",
  openGraph: {
    title: "D R Traders | Architectural Surfaces",
    description:
      "Premium marble, granite, and tile surfaces curated for visionary architectural spaces.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "D R Traders | Architectural Surfaces",
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
        {children}
      </body>
    </html>
  );
}
