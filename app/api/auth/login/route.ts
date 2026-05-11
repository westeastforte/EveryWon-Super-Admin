import { NextResponse } from "next/server";

export const runtime = "nodejs";

// TODO: move credentials to env vars before production
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, password } = body as { username?: unknown; password?: unknown };

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", "ok", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
