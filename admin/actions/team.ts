"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/lib/run";
import { fail, type ActionResult } from "@/lib/actionResult";
import { createServiceClient } from "@/lib/supabase/service";
import type { AdminRole } from "@/lib/auth";

const ROLES = ["owner", "editor", "viewer"] as const;

const addSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  displayName: z.string().trim().max(80).optional(),
  role: z.enum(ROLES),
});

/**
 * Owner-only. Creates (or finds) the person's Supabase login with the
 * service-role key — the ONLY use of that key in this app — then grants the
 * role through the owner's own session, so RLS and the audit log apply.
 * No password is chosen or shown here: the new member sets their own via
 * "Forgot password" on the sign-in page.
 */
export async function addTeamMember(input: z.input<typeof addSchema>): Promise<ActionResult> {
  return runAction("owner", async ({ db }) => {
    const parsed = addSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
    const { email, displayName, role } = parsed.data;

    const { data: already } = await db.from("admin_users").select("user_id").eq("email", email).maybeSingle();
    if (already) return fail("This person is already on the team.");

    const admin = createServiceClient();
    let userId: string | null = null;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (data.users.length < 1000) break;
    }
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        // Unknown to everyone; replaced when they set their own password.
        password: randomBytes(32).toString("base64url"),
      });
      if (error) throw error;
      userId = data.user.id;
    }

    const { error } = await db.from("admin_users").insert({ user_id: userId, email, display_name: displayName || null, role });
    if (error) throw error;
    revalidatePath("/team");
    return { ok: true, message: `${email} added. Ask them to open the admin, press “Forgot password” and set their own password.` };
  });
}

export async function updateTeamMember(userId: string, patch: { role?: AdminRole; is_active?: boolean }): Promise<ActionResult> {
  return runAction("owner", async ({ db }) => {
    if (patch.role && !ROLES.includes(patch.role)) return fail("Unknown role.");
    const { error, count } = await db.from("admin_users").update(patch, { count: "exact" }).eq("user_id", userId);
    if (error) throw error;
    if (!count) return fail("Nothing changed.");
    revalidatePath("/team");
    return { ok: true, message: patch.is_active === false ? "Access paused." : patch.is_active ? "Access restored." : "Role updated." };
  });
}

/** Removes admin access. Their login still exists but can't open the admin. */
export async function removeTeamMember(userId: string): Promise<ActionResult> {
  return runAction("owner", async ({ db }) => {
    const { error, count } = await db.from("admin_users").delete({ count: "exact" }).eq("user_id", userId);
    if (error) throw error;
    if (!count) return fail("Nothing changed.");
    revalidatePath("/team");
    return { ok: true, message: "Removed from the team." };
  });
}

export async function updateMyName(displayName: string): Promise<ActionResult> {
  return runAction("viewer", async ({ db, session }) => {
    const name = displayName.trim().slice(0, 80);
    const { error } = await db.from("admin_users").update({ display_name: name || null }).eq("user_id", session.userId);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Name updated." };
  });
}
