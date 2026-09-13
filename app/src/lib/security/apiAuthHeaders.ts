/**
 * Client-safe helpers for same-origin /api fetchers.
 * Keep this module free of next/server imports.
 *
 * Browser clients authenticate via an httpOnly session cookie issued by
 * `/api/auth/session` (server-only CODIA_API_SECRET). Never embed the API
 * bearer in NEXT_PUBLIC_* — that would publish it to every visitor.
 */

let sessionReady: Promise<void> | null = null;

/** Ensure a server-issued session cookie is present before calling /api. */
export async function ensureApiSession(): Promise<void> {
  if (!sessionReady) {
    sessionReady = (async () => {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        sessionReady = null;
        throw new Error(`API session unavailable: ${response.status}`);
      }
    })();
  }
  return sessionReady;
}

/** Reset cached session bootstrap (tests). */
export function resetApiSessionCache(): void {
  sessionReady = null;
}

/**
 * JSON headers for same-origin /api calls.
 * Auth is the httpOnly session cookie (credentials: "include"), not a
 * public bearer secret.
 */
export function getApiAuthHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Same-origin authenticated fetch for browser/demo clients. */
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  await ensureApiSession();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}
