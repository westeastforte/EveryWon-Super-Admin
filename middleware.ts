import { NextRequest, NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  // AUTH TEMPORARILY DISABLED — open access while testing the app +
  // super-admin together. Re-enable the gate below before any real
  // deployment (and remove this early return).
  return NextResponse.next();

  /* eslint-disable no-unreachable */
  // --- Original cookie-session gate (restore by deleting the return above) ---
  // const { pathname } = _req.nextUrl;
  // const session = _req.cookies.get("admin_session")?.value;
  // if (session === "ok") return NextResponse.next();
  // if (pathname.startsWith("/api/auth/")) return NextResponse.next();
  // if (pathname === "/login") return NextResponse.next();
  // const loginUrl = _req.nextUrl.clone();
  // loginUrl.pathname = "/login";
  // return NextResponse.redirect(loginUrl);
  /* eslint-enable no-unreachable */
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
