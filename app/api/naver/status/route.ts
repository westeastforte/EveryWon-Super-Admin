import { NextResponse } from "next/server";

// Lets the client know whether the server has Naver credentials wired
// up, without exposing the values themselves. Used by the Settings card
// to render a ready / missing badge.

export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(
    process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET,
  );
  return NextResponse.json(
    { configured },
    { headers: { "cache-control": "no-store" } },
  );
}
