/**
 * bcrypt helpers for the DB-backed admin password (admin_auth.password_hash).
 * Pure-JS bcryptjs is used instead of native `bcrypt` so it works
 * unmodified in any serverless/edge-adjacent Node runtime without a
 * platform-specific build step.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPasswordHash(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Minimal strength check — long enough to resist casual guessing, no
 *  composition rules that just push users toward "Password1!" patterns. */
export function validatePasswordStrength(password: string): string | undefined {
  if (password.length < 8) return "New password must be at least 8 characters.";
  return undefined;
}
