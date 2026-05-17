import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "../../../../lib/session";

export const runtime = "nodejs";

// Credentials come from server-only env vars (ADMIN_USERNAME / ADMIN_PASSWORD).
// No hardcoded fallback — if they are unset the route fails closed.
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: Request) {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass || !process.env.SESSION_SECRET) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, password } = body as {
    username?: unknown;
    password?: unknown;
  };

  if (username === adminUser && password === adminPass) {
    const token = await createSessionToken(SESSION_TTL);
    if (!token) {
      return NextResponse.json(
        { error: "Auth not configured" },
        { status: 503 },
      );
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL,
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
