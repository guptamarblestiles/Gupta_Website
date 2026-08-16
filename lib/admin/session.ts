import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin session cookie: `<expiryMs>.<hmac>`, signed with ADMIN_SESSION_SECRET.
 * Not a JWT on purpose — there's no user identity to encode, just "was the
 * password check passed before this expiry." Verified in proxy.ts (edge/
 * node runtime, can't touch Supabase) and re-verified in server actions
 * that need to be sure proxy actually ran (see the Data Security guide
 * note in Next 16's proxy docs: a matcher change can silently skip proxy).
 */
export const ADMIN_SESSION_COOKIE = "dr_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = String(expiry);
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiry = Number(payload);
  return Number.isFinite(expiry) && Date.now() < expiry;
}

export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
