import { NextResponse } from "next/server";
import { pingGemini } from "../../../../lib/translate";

// Live-tests the Gemini API: round-trips a known Korean clinic name and
// returns the English translation. Used by the Settings "Test" button
// to confirm the key works end-to-end (not just present in env).

export const runtime = "nodejs";

export async function GET() {
  const result = await pingGemini();
  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
    headers: { "cache-control": "no-store" },
  });
}
