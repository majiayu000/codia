/**
 * Signed httpOnly session cookies for same-origin browser clients.
 * Uses Web Crypto so it works in Edge middleware and route handlers.
 */

export const API_SESSION_COOKIE = "codia_api_session";
export const API_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Create a signed session token: v1.<expiryMs>.<nonce>.<hmacHex> */
export async function createSessionToken(
  secret: string,
  now: number = Date.now()
): Promise<string> {
  const expiry = now + API_SESSION_TTL_MS;
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const payload = `v1.${expiry}.${nonce}`;
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

/** Verify a signed session token against the server secret. */
export async function verifySessionToken(
  secret: string,
  token: string,
  now: number = Date.now()
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    return false;
  }
  const [, expiryStr, nonce, sig] = parts;
  if (!expiryStr || !nonce || !sig) {
    return false;
  }
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < now) {
    return false;
  }
  if (!/^[a-f0-9]+$/i.test(sig) || !/^[a-f0-9]+$/i.test(nonce)) {
    return false;
  }
  const payload = `v1.${expiryStr}.${nonce}`;
  const expected = await hmacHex(secret, payload);
  return timingSafeEqualHex(sig, expected);
}

export function sessionCookieOptions(maxAgeSec: number = API_SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true as const,
    sameSite: "strict" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(maxAgeSec),
  };
}
