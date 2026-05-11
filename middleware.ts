import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("admin_session")?.value;

  // Already authenticated — let through
  if (session === "ok") return NextResponse.next();

  // Auth routes are always public
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();

  // Everything else requires the session cookie
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
