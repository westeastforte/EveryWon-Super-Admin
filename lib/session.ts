// Signed, expiring admin-session token.
//
// Replaces the old static `admin_session="ok"` cookie (trivially forgeable)
// with an HMAC-SHA256-signed token carrying an expiry. Uses the Web Crypto
// API (globalThis.crypto.subtle) so the SAME code runs in both the Edge
// middleware and the Node route handlers.
//
// Requires env `SESSION_SECRET` (server-only, NOT NEXT_PUBLIC_). If it is
// unset, verification ALWAYS fails — a misconfigured deploy stays locked
// down rather than falling open.

export const SESSION_COOKIE = "admin_session";

const enc = new TextEncoder();

// crypto.subtle wants ArrayBuffer-backed views; under TS's typed-array
// generics a plain Uint8Array widens to ArrayBufferLike. Copy into a
// fresh ArrayBuffer to satisfy BufferSource.
function ab(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ab(enc.encode(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Mint a signed session token valid for `ttlSeconds` (default 7 days).
 * Returns null if SESSION_SECRET is not configured.
 */
export async function createSessionToken(
  ttlSeconds = 60 * 60 * 24 * 7,
): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const payload = { exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const msg = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, ab(enc.encode(msg))),
  );
  return `${msg}.${b64urlEncode(sig)}`;
}

/**
 * Verify a session token: signature must match and it must not be expired.
 * Constant-time via crypto.subtle.verify. Fails closed on any error or if
 * SESSION_SECRET is unset.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const msg = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      ab(b64urlDecode(sig)),
      ab(enc.encode(msg)),
    );
    if (!ok) return false;
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(msg)),
    ) as { exp?: number };
    return (
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

/** Pull the session cookie value out of a raw Cookie header. */
export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) return v.join("=");
  }
  return null;
}

/**
 * Route-handler guard. Verifies the signed session cookie on the request.
 * Returns true if the caller holds a valid admin session.
 */
export async function hasValidAdminSession(req: Request): Promise<boolean> {
  const token = readSessionCookie(req.headers.get("cookie"));
  return verifySessionToken(token);
}
