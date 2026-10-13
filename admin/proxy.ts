import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/confirm"];

/**
 * Runs before every page: refreshes the Supabase session cookie (so a
 * long-open tab doesn't silently expire mid-edit) and sends anyone without
 * a valid session to /login. This is the first gate only — every page and
 * server action re-checks the user's admin role on the server
 * (lib/auth.ts), and the database enforces it again with RLS.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  // Local demo mode (never in production builds): no real sign-in.
  if (process.env.NODE_ENV !== "production" && (process.env.ADMIN_DEMO === "1" || process.env.NEXT_PUBLIC_ADMIN_DEMO === "1")) {
    return NextResponse.next();
  }

  if (!url || !key) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL(request.nextUrl.basePath + "/login", request.url));
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
    const login = new URL(request.nextUrl.basePath + "/login", request.url);
    if (path !== "/") login.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (signedIn && path === "/login") {
    return NextResponse.redirect(new URL(request.nextUrl.basePath + "/", request.url));
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  // "/" is listed explicitly, not just covered by the catch-all below —
  // under a configured basePath the bare zone root has been observed to
  // not match the negative-lookahead pattern on its own (see
  // docs/admin-integration-next-steps.md's routing section), so this
  // request shape must never rely on that pattern alone.
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|icon.svg|pdf.worker.min.mjs|.*\\.(?:png|jpg|svg|webp|mjs)$).*)"],
};
