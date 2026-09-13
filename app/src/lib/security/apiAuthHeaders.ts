/**
 * Client-safe helpers for same-origin /api fetchers.
 * Keep this module free of next/server imports.
 *
 * Browser clients authenticate via an httpOnly session cookie minted by
 * `POST /api/auth/session` after proving CODIA_API_SECRET (unlock). Never
 * embed the API bearer in NEXT_PUBLIC_* — that would publish it to every visitor.
 * Never persist the unlock secret in sessionStorage/localStorage; keep it only
 * in memory for the current page so XSS cannot exfiltrate it after reload and
 * renewal requires a fresh unlock when the cookie expires without an in-memory
 * secret.
 *
 * Lock/unlock is broadcast across same-origin tabs via BroadcastChannel so a
 * Lock in one tab clears in-memory secrets elsewhere and cannot be undone by
 * apiFetch's 401 remint path.
 */

const SESSION_LOCK_CHANNEL = "codia-api-session";

type SessionLockMessage = { type: "lock" } | { type: "unlock" };

let sessionReady: Promise<void> | null = null;
/** In-memory only — never written to Web Storage. */
let unlockSecret: string | null = null;
let sessionLockChannel: BroadcastChannel | null | undefined;
let sessionLockListenerAttached = false;

function getSessionLockChannel(): BroadcastChannel | null {
  if (sessionLockChannel !== undefined) {
    return sessionLockChannel;
  }
  if (typeof BroadcastChannel === "undefined") {
    sessionLockChannel = null;
    return null;
  }
  try {
    sessionLockChannel = new BroadcastChannel(SESSION_LOCK_CHANNEL);
  } catch {
    sessionLockChannel = null;
  }
  return sessionLockChannel;
}

function clearLocalSessionState(): void {
  unlockSecret = null;
  sessionReady = null;
}

function broadcastSessionLock(type: SessionLockMessage["type"]): void {
  ensureSessionLockListener();
  const channel = getSessionLockChannel();
  if (!channel) {
    return;
  }
  try {
    channel.postMessage({ type } satisfies SessionLockMessage);
  } catch (error) {
    // Channel may be closed; local lock/unlock state is already applied.
    if (typeof console !== "undefined") {
      console.warn("codia: failed to broadcast API session lock state", error);
    }
  }
}

/** Listen for Lock from other tabs so retained secrets cannot remint the cookie. */
export function ensureSessionLockListener(): void {
  if (sessionLockListenerAttached) {
    return;
  }
  const channel = getSessionLockChannel();
  if (!channel) {
    return;
  }
  channel.addEventListener("message", (event: MessageEvent<SessionLockMessage>) => {
    if (event.data?.type === "lock") {
      clearLocalSessionState();
    }
  });
  sessionLockListenerAttached = true;
}

ensureSessionLockListener();

/** Provide CODIA_API_SECRET once so the client can mint an httpOnly session. */
export function setApiUnlockSecret(secret: string | null): void {
  ensureSessionLockListener();
  unlockSecret = secret?.trim() || null;
  sessionReady = null;
}

export function getApiUnlockSecret(): string | null {
  return unlockSecret;
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
  ensureSessionLockListener();
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
 * Keeps the secret in memory only (never sessionStorage) after the server
 * accepts it, so the httpOnly cookie remains the durable client credential.
 */
export async function unlockApiSession(secret: string): Promise<void> {
  ensureSessionLockListener();
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
  sessionReady = Promise.resolve();
  broadcastSessionLock("unlock");
}

/**
 * Clear the httpOnly API session cookie and in-memory unlock secret.
 * Broadcasts Lock to other same-origin tabs so they drop retained secrets and
 * cannot remint the cookie after shared-machine handoff.
 */
export async function lockApiSession(): Promise<void> {
  ensureSessionLockListener();
  clearLocalSessionState();
  // Notify sibling tabs before deleting the cookie so their 401 retry cannot remint.
  broadcastSessionLock("lock");
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`API session lock failed: ${response.status}`);
  }
}

/** Reset cached session bootstrap (tests). */
export function resetApiSessionCache(): void {
  clearLocalSessionState();
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
  // After a Lock broadcast from another tab, unlockSecret is null so this will not remint.
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
