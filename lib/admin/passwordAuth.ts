"use server";

/**
 * DB-backed admin credential store (admin_auth table, single "admin" row
 * in practice). Uses the service-role client like the rest of lib/admin/*
 * — every caller here runs behind proxy.ts's session check, except
 * checkAdminPassword's call path (login, pre-session) which is safe
 * because it only ever compares a bcrypt hash, never returns it.
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashPassword, verifyPasswordHash } from "@/lib/admin/passwordUtils";

const ADMIN_USERNAME = "admin";

export async function hasAdminAuthRow(): Promise<boolean> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_auth")
    .select("id")
    .eq("username", ADMIN_USERNAME)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function verifyAdminPassword(candidate: string): Promise<boolean> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_auth")
    .select("password_hash")
    .eq("username", ADMIN_USERNAME)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return verifyPasswordHash(candidate, data.password_hash);
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  const ok = await verifyAdminPassword(currentPassword);
  if (!ok) throw new Error("Current password is incorrect.");

  const client = getSupabaseAdminClient();
  const password_hash = await hashPassword(newPassword);
  const { error } = await client
    .from("admin_auth")
    .update({ password_hash })
    .eq("username", ADMIN_USERNAME);
  if (error) throw error;
}
