import { NextResponse } from "next/server";

/**
 * Guards an API route with a shared secret.
 * The caller must send  `x-admin-key: <ADMIN_API_KEY>` in the request.
 * Returns a 401 NextResponse if the check fails, or null if it passes.
 *
 * Set ADMIN_API_KEY in .env.local (server-only, not NEXT_PUBLIC_).
 * The Super-Admin frontend reads NEXT_PUBLIC_ADMIN_API_KEY (same value)
 * and injects it into every fetch call via the apiHeaders() helper below.
 */
export function requireAdminKey(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    // Key not configured — fail open in dev, fail closed in production.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "API not configured" }, { status: 503 });
    }
    return null;
  }
  const provided = req.headers.get("x-admin-key");
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Call from fetch() in Super-Admin React components. */
export function adminHeaders(): Record<string, string> {
  const key =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? "")
      : "";
  return key ? { "x-admin-key": key } : {};
}
