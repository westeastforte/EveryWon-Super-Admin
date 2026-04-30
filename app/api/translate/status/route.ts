import { NextResponse } from "next/server";

// Tells the client whether GEMINI_API_KEY is present on the server,
// without exposing the value. The Settings card uses this to render a
// ready / missing badge for the AI-translation feature. Mirrors the
// /api/naver/status pattern.

export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(process.env.GEMINI_API_KEY);
  return NextResponse.json(
    { configured },
    { headers: { "cache-control": "no-store" } },
  );
}
