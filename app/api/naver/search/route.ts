import { NextResponse } from "next/server";

// Server-side proxy for Naver Local Search. The endpoint requires
// X-Naver-Client-Id / Secret headers and rejects browser CORS, so we
// forward from a Next route handler using server-only env vars.
// Client credentials are issued from https://developers.naver.com/apps.

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ error: "missing query" }, { status: 400 });
  }

  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    return NextResponse.json(
      { error: "Naver API credentials missing on server" },
      { status: 503 },
    );
  }

  const display = Math.min(
    Math.max(Number(searchParams.get("display") ?? 5) || 5, 1),
    5,
  );
  const start = Math.min(
    Math.max(Number(searchParams.get("start") ?? 1) || 1, 1),
    1000,
  );
  const sort = searchParams.get("sort") === "comment" ? "comment" : "random";

  const apiUrl =
    "https://openapi.naver.com/v1/search/local.json" +
    `?query=${encodeURIComponent(query)}` +
    `&display=${display}` +
    `&start=${start}` +
    `&sort=${sort}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "X-Naver-Client-Id": id,
        "X-Naver-Client-Secret": secret,
      },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `Naver API ${res.status}: ${text}` },
        { status: res.status },
      );
    }
    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
