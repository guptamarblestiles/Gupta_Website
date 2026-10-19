import type { NextConfig } from "next";

// Unset in production today: the public site behaves exactly as it does
// now, and the legacy /admin panel stays the one in control (see proxy.ts).
// Set this to the separate admin/ app's own deployment URL (its Next.js
// "zone", basePath "/admin" — see admin/next.config.ts and
// docs/admin-integration-next-steps.md's routing section) to hand
// /admin/* off to it instead. Verified locally against
// http://localhost:3001 before this was written; re-verify the same way
// against the real deployment URL before setting this in production.
const ADMIN_ZONE_ORIGIN = process.env.ADMIN_ZONE_ORIGIN;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gvwaqvdhranchtzfgfiu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async rewrites() {
    if (!ADMIN_ZONE_ORIGIN) return [];
    return {
      // beforeFiles: must run ahead of this app's own filesystem routes
      // (including app/admin/*) for the handoff to actually take effect —
      // see node_modules/next/dist/docs/.../rewrites.md's execution order,
      // read before adding this.
      beforeFiles: [
        { source: "/admin", destination: `${ADMIN_ZONE_ORIGIN}/admin` },
        { source: "/admin/:path+", destination: `${ADMIN_ZONE_ORIGIN}/admin/:path+` },
      ],
    };
  },
};

export default nextConfig;
