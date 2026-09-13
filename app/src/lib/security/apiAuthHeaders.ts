/**
 * Client-safe helpers for same-origin /api fetchers.
 * Keep this module free of next/server imports.
 *
 * Browser clients authenticate via an httpOnly session cookie minted by
 * `POST /api/auth/session` after proving CODIA_API_SECRET (unlock). Never
 * embed the API bearer in NEXT_PUBLIC_* — that would publish it to every visitor.
 */

const UNLOCK_STORAGE_KEY = "codia_api_unlock_secret";

let sessionReady: Promise<void> | null = null;
let unlockSecret: string | null = null;

function readStoredUnlockSecret(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const value = sessionStorage.getItem(UNLOCK_STORAGE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function writeStoredUnlockSecret(secret: string | null): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  try {
    if (!secret) {
      sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
    } else {
      sessionStorage.setItem(UNLOCK_STORAGE_KEY, secret);
    }
  } catch {
    // ignore quota / private-mode failures
  }
}

/** Provide CODIA_API_SECRET once so the client can mint an httpOnly session. */
export function setApiUnlockSecret(secret: string | null): void {
  unlockSecret = secret?.trim() || null;
  writeStoredUnlockSecret(unlockSecret);
  sessionReady = null;
}

export function getApiUnlockSecret(): string | null {
  return unlockSecret || readStoredUnlockSecret();
}

async function bootstrapSession(): Promise<void> {
  const status = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
  });
  if (status.ok) {
    return;
  }

  const secret = getApiUnlockSecret();
  if (!secret) {
    throw new Error(
      "API session unavailable: unlock with CODIA_API_SECRET (Settings → AI Model) or send Authorization: Bearer"
    );
  }

  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(`API session unlock failed: ${response.status}`);
  }
}

/** Ensure a server-issued session cookie is present before calling /api. */
export async function ensureApiSession(): Promise<void> {
  if (!sessionReady) {
    sessionReady = bootstrapSession().catch((error) => {
      sessionReady = null;
      throw error;
    });
  }
  return sessionReady;
}

/**
 * Mint a session immediately with the shared secret (operator unlock).
 * Always POSTs so a typo cannot succeed via an existing cookie GET.
 * Persists the secret in sessionStorage only after the server accepts it.
 */
export async function unlockApiSession(secret: string): Promise<void> {
  const trimmed = secret.trim();
  if (!trimmed) {
    throw new Error("API unlock secret required");
  }

  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${trimmed}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(`API session unlock failed: ${response.status}`);
  }

  unlockSecret = trimmed;
  writeStoredUnlockSecret(trimmed);
  sessionReady = Promise.resolve();
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
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });

  // Cookie may have expired (12h TTL) or been cleared — clear cache and retry once.
  if (response.status === 401) {
    sessionReady = null;
    await ensureApiSession();
    return fetch(input, {
      ...init,
      credentials: "include",
      headers,
    });
  }

  return response;
}
