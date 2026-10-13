import type { NextConfig } from "next";
import path from "node:path";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "gvwaqvdhranchtzfgfiu.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  // Mounts this app at guptainterior.in/admin once the public site's
  // rewrite (next.config.ts's ADMIN_ZONE_ORIGIN) points here. Fixed and
  // regression-tested this session (admin/proxy.ts, admin/tests/unit/proxy.test.ts)
  // after basePath was found to let an unauthenticated request through
  // on the bare zone root — see docs/admin-integration-next-steps.md.
  basePath: "/admin",
  experimental: {
    serverActions: {
      // Required for Server Actions under Multi-Zones (the browser's
      // origin is the public site's domain, not this app's own) — see
      // node_modules/next/dist/docs/01-app/02-guides/multi-zones.md,
      // read before adding this. The public production domain plus every
      // origin this app is actually reachable at for local testing.
      allowedOrigins: ["www.guptainterior.in", "guptainterior.in", "localhost:3000", "localhost:3001"],
    },
  },
  // This app lives inside the public site's repo; pin the root so Next
  // doesn't pick up the parent folder's lockfile and package.json.
  turbopack: { root: path.resolve(process.cwd()) },
  outputFileTracingRoot: path.resolve(process.cwd()),
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Internal tool: never indexed, never framed, no referrer leaks.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
