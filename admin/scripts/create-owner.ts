/**
 * One-time, secure setup of the first admin owner. Run on your own computer
 * — there is deliberately no sign-up page that could grant admin rights.
 *
 *   npm run create-owner -- owner@example.com "Owner Name"
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from admin/.env.local
 * (or the environment). Creates the Supabase login if it doesn't exist
 * (email pre-confirmed, random unknown password) and makes it an owner.
 * Then open the admin, press "Forgot password", and choose your password.
 *
 * Optional: set OWNER_PASSWORD in the environment for this one command to
 * set the password directly (useful if email sending isn't set up yet).
 * It is never printed or stored anywhere except Supabase Auth.
 *
 * Safe to re-run: an existing owner is left as is; an existing editor or
 * read-only member with this email is promoted to owner.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf-8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch {
    /* fall back to the real environment */
  }
}

async function main() {
  loadEnvLocal();
  const [emailArg, ...nameParts] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run create-owner -- owner@example.com "Owner Name"');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in admin/.env.local first.");
    process.exit(1);
  }
  const password = process.env.OWNER_PASSWORD;
  if (password !== undefined && password.length < 10) {
    console.error("OWNER_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { error: tableError } = await supabase.from("admin_users").select("user_id", { head: true, count: "exact" });
  if (tableError) {
    console.error("The admin_users table isn't there. Apply supabase/migrations/20261012090000_admin_app_roles_status_audit.sql first.");
    console.error(tableError.message);
    process.exit(1);
  }

  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 1000) break;
  }

  if (userId) {
    console.log(`Found existing login for ${email}.`);
    if (password) {
      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      console.log("Password updated from OWNER_PASSWORD.");
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: password ?? randomBytes(32).toString("base64url"),
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created login for ${email}.`);
  }

  const { data: existing } = await supabase.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
  if (existing?.role === "owner") {
    console.log("Already an owner. Nothing to change.");
  } else {
    const { error } = await supabase
      .from("admin_users")
      .upsert({ user_id: userId, email, display_name: nameParts.join(" ").trim() || null, role: "owner", is_active: true }, { onConflict: "user_id" });
    if (error) throw error;
    console.log(existing ? `Promoted to owner (was ${existing.role}).` : "Granted owner access.");
  }

  console.log(
    password
      ? "\nDone. Sign in to the admin with this email and the password you set."
      : '\nDone. Open the admin, press "Forgot password", enter this email, and choose your password from the emailed link.',
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
