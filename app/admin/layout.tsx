import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "./globals.css";
import { ToastProvider } from "@admin/components/ui/Toast";

export const metadata: Metadata = {
  title: { default: "Gupta Interior Admin", template: "%s · Gupta Interior Admin" },
  description: "Catalogue management for Gupta Interior.",
  robots: { index: false, follow: false },
  icons: { icon: "/admin-icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f5f2",
};

/**
 * Nested layout — the root layout (app/layout.tsx) already owns <html>/
 * <body> for the whole app, including the public site, and Next.js only
 * allows one of each. This wraps /admin/* in its own styled shell instead
 * (admin's globals.css is scoped to this subtree by Next's own
 * per-route CSS loading) rather than redeclaring page structure.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell min-h-dvh bg-canvas font-sans text-ink antialiased">
      <Suspense>
        <ToastProvider>{children}</ToastProvider>
      </Suspense>
    </div>
  );
}
