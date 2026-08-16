/**
 * Streams a local disk image so the /admin/import review grid can show
 * thumbnails before anything is uploaded to Supabase. Not covered by
 * proxy.ts's matcher (/admin/* only, not /api/*), so this route checks the
 * admin session cookie itself — never remove that check, this is a raw
 * filesystem read otherwise gated only by knowing a path.
 */
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/admin/session";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path") ?? "";
  const ext = extname(path).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!path.startsWith("/") || path.includes("..") || !contentType) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    if (!statSync(/*turbopackIgnore: true*/ path).isFile()) throw new Error("not a file");
    const buffer = readFileSync(/*turbopackIgnore: true*/ path);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
