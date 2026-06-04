import type { SpotifyUser } from "@/types";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

let meBlockedUntil = 0;

export function markMeRateLimited(retryAfterMs: number): void {
  const until = Date.now() + retryAfterMs;
  if (until > meBlockedUntil) {
    meBlockedUntil = until;
  }
}

export function getMeBlockedRemainingMs(): number {
  return Math.max(0, meBlockedUntil - Date.now());
}

export function isMeBlocked(): boolean {
  return getMeBlockedRemainingMs() > 0;
}

export function getMeBlockedRemainingSeconds(): number {
  return Math.ceil(getMeBlockedRemainingMs() / 1000);
}

function retryAfterMs(response: Response, attempt: number): number {
  const header = response.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 120_000);
    }
  }
  return Math.min(30_000, 8000 * (attempt + 1));
}

/**
 * Fetch GET /v1/me with conservative 429 handling (honors Retry-After, avoids retry storms).
 */
export async function fetchSpotifyMe(
  accessToken: string,
  options?: { max429Retries?: number }
): Promise<SpotifyUser> {
  if (isMeBlocked()) {
    throw new Error(
      `Spotify API error (429): rate limited — retry in ${getMeBlockedRemainingSeconds()}s`
    );
  }

  const max429Retries = options?.max429Retries ?? 0;
  let attempt = 0;

  while (true) {
    const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 429 && attempt < max429Retries) {
      const waitMs = retryAfterMs(response, attempt);
      markMeRateLimited(waitMs);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempt++;
      continue;
    }

    if (response.status === 429) {
      const waitMs = retryAfterMs(response, attempt);
      markMeRateLimited(waitMs);
      const error = await response.text();
      throw new Error(`Spotify API error (429): ${error}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Spotify API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<SpotifyUser>;
  }
}
