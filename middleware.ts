import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the auth endpoints and the login page through, otherwise
  // there is no way to obtain a session.
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  // Unauthenticated. API calls get a 401 JSON; page navigations are
  // redirected to the login screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
