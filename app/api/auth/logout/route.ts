import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}
