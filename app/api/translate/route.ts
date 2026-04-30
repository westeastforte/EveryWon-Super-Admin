import { NextResponse } from "next/server";
import {
  translateClinicNamesBatch,
  type TranslateItem,
} from "../../../lib/translate";

// Server-side Gemini proxy. Keeps GEMINI_API_KEY server-only.
// POST { items: [{ nameKr, address? }] } → { translations: string[] }

export const runtime = "nodejs";

// Cap to keep one Gemini call cheap and bounded. Bulk imports chunk
// client-side; this is the per-request limit.
const MAX_ITEMS = 50;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY missing on server" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `max ${MAX_ITEMS} items per request` },
      { status: 400 },
    );
  }

  const cleaned: TranslateItem[] = [];
  for (const it of items) {
    const nameKr = (it as { nameKr?: unknown })?.nameKr;
    if (typeof nameKr !== "string" || !nameKr.trim()) {
      return NextResponse.json(
        { error: "each item needs a non-empty nameKr" },
        { status: 400 },
      );
    }
    const address = (it as { address?: unknown })?.address;
    cleaned.push({
      nameKr: nameKr.trim(),
      address: typeof address === "string" ? address.trim() : undefined,
    });
  }

  try {
    const translations = await translateClinicNamesBatch(cleaned);
    return NextResponse.json({ translations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
