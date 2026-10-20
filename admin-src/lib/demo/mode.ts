/**
 * Local demo mode: `ADMIN_DEMO=1 npm run dev` (see README). Replaces
 * Supabase with an in-memory copy of sample data so every screen can be
 * tried without a database. Hard-disabled in production builds, so it can
 * never be switched on for a deployed admin.
 */
export const DEMO =
  process.env.NODE_ENV !== "production" && (process.env.NEXT_PUBLIC_ADMIN_DEMO === "1" || process.env.ADMIN_DEMO === "1");

export const DEMO_ROLE_COOKIE = "admin_demo_role";
