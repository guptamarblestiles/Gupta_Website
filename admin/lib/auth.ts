import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type AdminRole = "owner" | "editor" | "viewer";

export type AdminSession = {
  userId: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
};

const RANK: Record<AdminRole, number> = { viewer: 0, editor: 1, owner: 2 };

export function roleAtLeast(role: AdminRole, min: AdminRole): boolean {
  return RANK[role] >= RANK[min];
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Read-only",
};

/**
 * The verified admin for this request, or null. getClaims() validates the
 * session JWT (it is never trusted just because a cookie exists), and the
 * role comes from admin_users via RLS — a login without an active
 * admin_users row is not an admin. Cached per request.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  // Never prerender an admin page at build time: who is looking decides
  // what is shown, so every request is rendered fresh.
  await connection();
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: row } = await supabase
    .from("admin_users")
    .select("email, display_name, role, is_active")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row || !row.is_active) return null;

  return {
    userId,
    email: row.email as string,
    displayName: (row.display_name as string | null) ?? null,
    role: row.role as AdminRole,
  };
});

/** For pages and layouts: redirect away unless the user has at least `min`. */
export async function requireRole(min: AdminRole = "viewer"): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  if (!roleAtLeast(session.role, min)) redirect("/?denied=1");
  return session;
}

export class PermissionError extends Error {
  name = "PermissionError";
}

/** For server actions: throw (caught by runAction) instead of redirecting. */
export async function assertRole(min: AdminRole): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new PermissionError("Your session has ended. Please sign in again.");
  if (!roleAtLeast(session.role, min)) {
    throw new PermissionError(
      min === "owner" ? "Only an owner can do this." : "Your account is read-only, so it can't make changes.",
    );
  }
  return session;
}
