import type { NextConfig } from "next";

/** Supabase Storage host, derived from the env so the allow-list follows the
 *  project. Falls back to the current project's host so a missing/invalid env
 *  can never break a build. */
const FALLBACK_SUPABASE_HOST = "gvwaqvdhranchtzfgfiu.supabase.co";
function resolveSupabaseHost(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return FALLBACK_SUPABASE_HOST;
  try {
    return new URL(raw).hostname || FALLBACK_SUPABASE_HOST;
  } catch {
    return FALLBACK_SUPABASE_HOST;
  }
}
const SUPABASE_HOST = resolveSupabaseHost();

/** Content-Security-Policy in REPORT-ONLY mode: violations are logged in the
 *  browser console but nothing is blocked, so this cannot break the site.
 *  Tighten and switch to an enforcing header only after reviewing reports.
 *  ('unsafe-inline' is needed for Next's inline bootstrap scripts without a
 *  nonce; no 'unsafe-eval' — nothing in production code requires it.) */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://api.emailjs.com`,
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  `frame-src 'self' https://${SUPABASE_HOST} https://www.google.com`,
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Cache optimized variants for 31 days so Vercel's optimizer rarely
    // re-fetches originals from Supabase (egress). Only WebP variants and two
    // qualities are ever generated, which also caps the number of variants.
    minimumCacheTTL: 2678400,
    formats: ["image/webp"],
    qualities: [60, 75],
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        // Admin is an internal tool: never indexed, never framed, no
        // referrer leaks. Scoped to /admin/* only — must never apply to
        // the public site's routes.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Public-site security headers. The negative lookahead excludes
        // /admin so the stricter admin block above is the only one setting
        // X-Frame-Options / Referrer-Policy there (no duplicate/conflicting
        // values depending on header merge order).
        source: "/((?!admin(?:/|$)).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
