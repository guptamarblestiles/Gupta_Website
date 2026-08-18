/**
 * One-time setup: inserts the initial admin_auth row with a bcrypt hash of
 * the default password, if no row exists yet. Safe to re-run — it's a
 * no-op once a row is present, so it will never clobber a password the
 * admin has since changed via the UI.
 *
 * Usage: npx tsx scripts/admin/seedAdminAuth.ts
 * Requires .env.local to hold NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "../../lib/admin/passwordUtils";

const INITIAL_PASSWORD = "@Gupta123";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  let text: string;
  try {
    text = readFileSync(path, "utf-8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadEnvLocal();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");
    process.exit(1);
  }

  const client = createClient(url, secretKey, { auth: { persistSession: false } });

  const { data: existing, error: selectError } = await client
    .from("admin_auth")
    .select("id")
    .eq("username", "admin")
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    console.log("admin_auth row already exists — leaving password untouched.");
    return;
  }

  const password_hash = await hashPassword(INITIAL_PASSWORD);
  const { error: insertError } = await client
    .from("admin_auth")
    .insert({ username: "admin", password_hash });
  if (insertError) throw insertError;

  console.log("Seeded admin_auth with the initial password. Change it from /admin/settings.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
