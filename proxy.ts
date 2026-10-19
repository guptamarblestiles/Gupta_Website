import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/admin/session";

/**
 * Gates every /admin/* route (Next 16 renamed middleware.ts -> proxy.ts;
 * same runtime/semantics). /admin/login is excluded from the matcher so
 * the login page itself isn't redirect-looped. This is the actual
 * enforcement point — the admin UI has no client-side-only gating.
 *
 * ADMIN_ZONE_ORIGIN (unset in production today — see next.config.ts's
 * matching rewrite) hands /admin/* off to the separate admin/ app's own
 * zone instead of this legacy gate, once that app is ready to take over.
 * Until that env var is set, this proxy's behavior — and the legacy
 * panel it protects — is completely unchanged.
 */
export function proxy(request: NextRequest) {
  if (process.env.ADMIN_ZONE_ORIGIN) return NextResponse.next();

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (isValidSessionToken(token)) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
