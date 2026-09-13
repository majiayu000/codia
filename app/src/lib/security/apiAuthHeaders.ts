/**
 * Client-safe helpers for same-origin /api fetchers.
 * Keep this module free of next/server imports.
 */

/**
 * Client-side secret for same-origin demo fetchers.
 * Must match CODIA_API_SECRET on the server.
 */
export function getClientApiSecret(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const secret = env.NEXT_PUBLIC_CODIA_API_SECRET?.trim();
  return secret || undefined;
}

/** Headers for browser/demo clients calling protected /api routes. */
export function getApiAuthHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  const secret = getClientApiSecret();
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}
