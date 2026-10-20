import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 renamed middleware.ts -> proxy.ts; same runtime/semantics.
 *
 * Public routes (everything not under /admin) pass straight through —
 * zero behavior change, zero overhead, matching the site before the admin
 * was attached.
 *
 * /admin/* is gated by a real Supabase Auth session (refreshed on every
 * request so a long-open tab doesn't silently expire mid-edit). This is
 * the first gate only — every admin page and server action re-checks the
 * signed-in user's role on the server (admin-src/lib/auth.ts), and the
 * database enforces it again with RLS. Replaces the legacy
 * ADMIN_SESSION_COOKIE/password gate entirely.
 */
const ADMIN_PUBLIC_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/auth/confirm"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/admin")) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const isPublic = ADMIN_PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  // Local demo mode (never in production builds): no real sign-in.
  if (process.env.NODE_ENV !== "production" && (process.env.ADMIN_DEMO === "1" || process.env.NEXT_PUBLIC_ADMIN_DEMO === "1")) {
    return NextResponse.next();
  }

  if (!url || !key) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublic) {
    const login = new URL("/admin/login", request.url);
    if (path !== "/admin") login.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (signedIn && path === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/((?!_next/static|_next/image|favicon.ico|icon.svg|pdf.worker.min.mjs|.*\\.(?:png|jpg|svg|webp|mjs)$).*)"],
};
