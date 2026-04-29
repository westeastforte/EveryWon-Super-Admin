"use client";

// Naver Local Search wrapper. Unlike Kakao's JS SDK, Naver's open API
// only accepts server-side requests (X-Naver-Client-Id / Secret headers
// and no CORS), so we proxy through /api/naver/search. Get a free key
// pair from https://developers.naver.com/apps and put them in .env.local
// as NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (server-only — they must NOT
// be NEXT_PUBLIC_*).

export interface NaverPlaceRaw {
  title: string;          // wrapped in <b>...</b> highlights
  link: string;
  category: string;       // e.g. "의료,건강>병원>이비인후과"
  description: string;
  telephone: string;
  address: string;        // jibun
  roadAddress: string;
  mapx: string;           // WGS84 longitude * 1e7
  mapy: string;           // WGS84 latitude * 1e7
}

export interface NaverPlace {
  id: string;             // synthetic — Naver gives no stable id
  title: string;          // <b> tags stripped, entities decoded
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  link: string;
  geo: { lat: number; lng: number } | undefined;
}

const decode = (html: string): string =>
  html
    .replace(/<\/?b>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const toGeo = (
  mapx: string,
  mapy: string,
): { lat: number; lng: number } | undefined => {
  const lng = Number(mapx) / 1e7;
  const lat = Number(mapy) / 1e7;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return undefined;
  }
  return { lat, lng };
};

export const searchNaverPlaces = async (
  keyword: string,
  opts?: { display?: number; start?: number },
): Promise<{ results: NaverPlace[]; total: number }> => {
  const params = new URLSearchParams({
    query: keyword,
    // Naver caps display at 5 for local.json — passing more is rejected.
    display: String(Math.min(opts?.display ?? 5, 5)),
    start: String(opts?.start ?? 1),
  });
  const res = await fetch(`/api/naver/search?${params.toString()}`);
  if (!res.ok) {
    let detail = `Naver search failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      /* ignore body parse errors */
    }
    throw new Error(detail);
  }
  const data = (await res.json()) as {
    items?: NaverPlaceRaw[];
    total?: number;
  };
  const items = data.items ?? [];
  return {
    results: items.map((it, idx) => ({
      id: `naver:${it.link || it.roadAddress || it.address || idx}:${decode(it.title)}`,
      title: decode(it.title),
      category: it.category,
      telephone: it.telephone,
      address: it.address,
      roadAddress: it.roadAddress,
      link: it.link,
      geo: toGeo(it.mapx, it.mapy),
    })),
    total: data.total ?? items.length,
  };
};

// Best-effort geocoder built on Naver Local Search. Naver indexes
// businesses, not addresses, so a raw road-address query almost always
// returns 0 results. Daum Postcode supplies a building name for most
// modern Korean addresses; we query that first (it usually has the
// building's main tenant indexed with coords), then fall back to a
// combined query, then the address alone. Returns null if all attempts
// miss — the form saves the clinic without geo and the patient app
// falls back to a default Seoul pin.
export const geocodeAddressViaNaver = async (
  address: string,
  buildingHint?: string,
): Promise<{ lat: number; lng: number } | null> => {
  const addr = address.trim();
  const hint = buildingHint?.trim();
  if (!addr && !hint) return null;
  const queries = [
    hint,
    hint && addr ? `${hint} ${addr}` : undefined,
    addr,
  ].filter((q): q is string => Boolean(q));
  for (const q of queries) {
    try {
      const { results } = await searchNaverPlaces(q, { display: 1 });
      if (results[0]?.geo) return results[0].geo;
    } catch {
      // try the next query — a single bad lookup shouldn't fail the chain
    }
  }
  return null;
};

export const getNaverStatus = async (): Promise<{ configured: boolean }> => {
  try {
    const res = await fetch("/api/naver/status", { cache: "no-store" });
    if (!res.ok) return { configured: false };
    return (await res.json()) as { configured: boolean };
  } catch {
    return { configured: false };
  }
};
