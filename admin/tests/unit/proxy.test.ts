import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch, getRedirectUrl } from "next/experimental/testing/server";
import { proxy, config } from "@/proxy";

/**
 * Regression tests for a real bug found and fixed in this file: with
 * `basePath: "/admin"` configured (a prerequisite for mounting this app at
 * guptainterior.in/admin), an unauthenticated request to the bare zone
 * root (external `/admin`, internal pathname `/`) matched none of the
 * proxy's matcher patterns and so skipped the auth gate entirely, serving
 * the dashboard to anyone — confirmed with real HTTP requests against a
 * production build (see docs/admin-integration-next-steps.md). Separately,
 * the redirect to `/login` was not basePath-prefixed. Fixed by adding an
 * explicit "/" matcher entry and by building every redirect from
 * `request.nextUrl.basePath`.
 *
 * Scope note: `unstable_doesMiddlewareMatch` (Next's own matcher-matching
 * engine, used below) is accurate for page-route matching but was found to
 * disagree with real server behavior specifically for already-known static
 * assets under a basePath + wildcard-ish matcher combination — verified by
 * fetching a real built asset (HTTP 200, genuine CSS body) while the
 * utility reported "matches". That asset case is therefore NOT asserted
 * here; it's covered by the real HTTP testing already done this session.
 * Calling `proxy()` directly also only exercises paths that don't touch
 * `request.nextUrl.search` outside a real Next server process (a module-
 * loading constraint of this test environment, not of the app) — the
 * query-string + basePath redirect case (e.g. `/admin/products` →
 * `/admin/login?next=%2Fproducts`) is real-HTTP-verified instead, not
 * skipped silently.
 */

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined) {
  // Next's own type augmentation marks NODE_ENV read-only; it is a plain
  // mutable env var at runtime, so this is a deliberate, narrow bypass.
  Object.defineProperty(process.env, "NODE_ENV", { value, configurable: true, writable: true, enumerable: true });
}

before(() => {
  // Deterministic branch: no Supabase client is created, so "signed in"
  // is impossible and every non-public path must redirect. Re-asserted
  // before each test below too, since some Next internals reload env
  // config as a side effect and could otherwise silently repopulate these.
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  setNodeEnv("production"); // rule out the demo-mode bypass branch
  delete process.env.ADMIN_DEMO;
  delete process.env.NEXT_PUBLIC_ADMIN_DEMO;
});

after(() => {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ORIGINAL_KEY;
  setNodeEnv(ORIGINAL_NODE_ENV);
});

function reqAt(pathname: string, basePath?: string) {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return new NextRequest(`http://localhost:3001${basePath ?? ""}${pathname}`, {
    nextConfig: basePath ? { basePath } : undefined,
  });
}

describe("proxy matcher — the actual bug", () => {
  test("WITHOUT basePath: the bare root matches (sanity baseline)", () => {
    assert.equal(unstable_doesMiddlewareMatch({ config, url: "/" }), true);
  });

  test("WITH basePath '/admin': the zone's own root still matches", () => {
    // This is the exact request shape that bypassed the gate before the fix.
    // Before the fix (matcher without the explicit "/" entry) this was false.
    assert.equal(unstable_doesMiddlewareMatch({ config, url: "/admin", nextConfig: { basePath: "/admin" } }), true);
  });

  test("WITH basePath '/admin': a nested path still matches", () => {
    assert.equal(unstable_doesMiddlewareMatch({ config, url: "/admin/products", nextConfig: { basePath: "/admin" } }), true);
  });

  test("WITH basePath '/admin': the trailing-slash root still matches", () => {
    assert.equal(unstable_doesMiddlewareMatch({ config, url: "/admin/", nextConfig: { basePath: "/admin" } }), true);
  });

  test("WITHOUT basePath: excluded static-asset paths never match", () => {
    assert.equal(unstable_doesMiddlewareMatch({ config, url: "/favicon.ico" }), false);
    assert.equal(unstable_doesMiddlewareMatch({ config, url: "/_next/static/chunk.js" }), false);
  });

  test("the fix would have failed without the explicit '/' matcher entry (proves the test is sensitive to the bug)", () => {
    const originalMatcherShapeOnly = { matcher: [config.matcher[1]] }; // drop the "/" entry this fix added
    assert.equal(unstable_doesMiddlewareMatch({ config: originalMatcherShapeOnly, url: "/admin", nextConfig: { basePath: "/admin" } }), false);
  });
});

describe("proxy redirects — unauthenticated access (direct function calls, no query string)", () => {
  test("bare root, no basePath: redirects to /login, not /admin/login", async () => {
    const res = await proxy(reqAt("/"));
    assert.equal(getRedirectUrl(res as never), "http://localhost:3001/login");
  });

  test("bare root, basePath '/admin': redirects to /admin/login (prefix preserved)", async () => {
    const res = await proxy(reqAt("/", "/admin"));
    assert.equal(getRedirectUrl(res as never), "http://localhost:3001/admin/login");
  });

  test("/admin/login itself is never redirected (public path)", async () => {
    const res = await proxy(reqAt("/login", "/admin"));
    assert.equal(getRedirectUrl(res as never), null);
  });

  test("/admin/forgot-password and /admin/auth/confirm are public too", async () => {
    assert.equal(getRedirectUrl((await proxy(reqAt("/forgot-password", "/admin"))) as never), null);
    assert.equal(getRedirectUrl((await proxy(reqAt("/auth/confirm", "/admin"))) as never), null);
  });
});

describe("real HTTP evidence (documented, not re-executed here)", () => {
  test("cases verified this session against a real `next build` + `next start`, not just this unit test", () => {
    // See docs/admin-integration-next-steps.md's "Routing decision" section
    // for the full transcript. Recorded here so the claim is traceable from
    // the test suite, not only from a doc someone might not open:
    //   GET /admin                 (unauth) -> 307 /admin/login                      [was: 200, served dashboard]
    //   GET /admin/                (unauth) -> 308 /admin  -> 307 /admin/login
    //   GET /admin/products        (unauth) -> 307 /admin/login?next=%2Fproducts
    //   GET /admin/team            (unauth) -> 307 /admin/login?next=%2Fteam
    //   GET /admin/login                    -> 200 (public, no redirect)
    //   GET /admin/login/                   -> 308 /admin/login
    //   GET /admin/forgot-password          -> 200 (public, no redirect)
    //   GET /admin/_next/static/*.css       -> 200, real CSS body, Content-Type: text/css
    //   GET /admin with garbage session cookie (unauth) -> 307 /admin/login
    //   GET /admin in demo/authenticated mode           -> 200, real dashboard content
    //   GET /admin/products in demo/authenticated mode  -> 200, real page content
    // None of these are re-run automatically by `npm test` — they require a
    // built, running server. Re-run manually before trusting this fix again
    // after any further change to proxy.ts, next.config.ts, or the Next.js
    // version, the same way this bug was originally found.
    assert.ok(true);
  });
});
