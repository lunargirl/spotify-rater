import { cookies } from "next/headers";
import {
  forceRefreshAccessToken,
  getSpotifyUser,
  getSpotifyUserWithRetries,
  getValidAccessToken,
} from "@/lib/spotify";
import {
  lookupUserByRefreshToken,
  saveRefreshTokenLink,
} from "@/lib/spotify-session-link";
import { buildSessionCookieOptions } from "@/lib/session-cookies";
import { tryCreateSupabaseAdmin } from "@/lib/supabase";
import type { SpotifyUser } from "@/types";

const USER_ID_COOKIE = "spotify_user_id";
const DISPLAY_NAME_COOKIE = "spotify_display_name";
const MEMORY_CACHE_TTL_MS = 10 * 60 * 1000;
const ME_COOLDOWN_MS = 20 * 1000;
const PROFILE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

let inflightMeLookup: Promise<SpotifyUser | null> | null = null;
let memoryCachedUser: { user: SpotifyUser; at: number } | null = null;
let meCooldownUntil = 0;

export async function persistSpotifyUserCookies(user: SpotifyUser): Promise<void> {
  memoryCachedUser = { user, at: Date.now() };
  const opts = buildSessionCookieOptions(PROFILE_COOKIE_MAX_AGE);

  const cookieStore = await cookies();
  cookieStore.set(USER_ID_COOKIE, user.id, opts);
  if (user.display_name) {
    cookieStore.set(DISPLAY_NAME_COOKIE, user.display_name, opts);
  }

  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
  if (refreshToken) {
    await saveRefreshTokenLink(refreshToken, user);
  }
}

function userFromCookies(userId: string, displayName?: string): SpotifyUser {
  return {
    id: userId,
    display_name: displayName || userId,
    email: undefined,
    images: undefined,
  };
}

async function readUserFromCookies(): Promise<SpotifyUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_ID_COOKIE)?.value;
  if (!userId) return null;
  return userFromCookies(userId, cookieStore.get(DISPLAY_NAME_COOKIE)?.value);
}

async function resolveFromRefreshTokenLink(
  persistCookies: boolean
): Promise<SpotifyUser | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
  if (!refreshToken) return null;

  const linked = await lookupUserByRefreshToken(refreshToken);
  if (!linked) return null;

  if (persistCookies) {
    await persistSpotifyUserCookies(linked);
  } else {
    memoryCachedUser = { user: linked, at: Date.now() };
  }
  return linked;
}

async function devFallbackUser(): Promise<SpotifyUser | null> {
  if (process.env.NODE_ENV !== "development") return null;

  const supabase = tryCreateSupabaseAdmin();
  if (!supabase) return null;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .limit(2);

  if (profiles?.length === 1) {
    const row = profiles[0];
    return {
      id: row.user_id,
      display_name: row.display_name ?? row.user_id,
    };
  }

  const { data: ratings } = await supabase.from("song_ratings").select("user_id").limit(500);
  const ids = [...new Set((ratings ?? []).map((r) => r.user_id as string).filter(Boolean))];
  if (ids.length === 1) {
    return { id: ids[0], display_name: ids[0] };
  }

  return null;
}

type FetchMeOptions = {
  max429Retries?: number;
  mayRefreshToken?: boolean;
};

async function fetchMeAndPersist(
  accessToken: string,
  persistCookies: boolean,
  options?: FetchMeOptions
): Promise<SpotifyUser | null> {
  const max429Retries = options?.max429Retries ?? 0;
  const fetchMe =
    max429Retries > 0
      ? () => getSpotifyUserWithRetries(accessToken)
      : () => getSpotifyUser(accessToken);

  try {
    const user = await fetchMe();
    if (persistCookies) {
      await persistSpotifyUserCookies(user);
    } else {
      memoryCachedUser = { user, at: Date.now() };
    }
    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (options?.mayRefreshToken && persistCookies && message.includes("401")) {
      const refreshed = await forceRefreshAccessToken();
      if (refreshed && refreshed !== accessToken) {
        return fetchMeAndPersist(refreshed, persistCookies, {
          ...options,
          mayRefreshToken: false,
        });
      }
    }

    if (message.includes("429")) {
      meCooldownUntil = Date.now() + ME_COOLDOWN_MS;
    } else if (message) {
      console.error("[fetchMeAndPersist]", message);
    }
    return null;
  }
}

export type ResolveSpotifyUserOptions = {
  /** Bypass /me cooldown (bootstrap / save flows). */
  force?: boolean;
  /** Route Handlers may refresh tokens and write cookies; Server Components may not. */
  allowSessionWrites?: boolean;
};

/**
 * Resolve Spotify user id for DB queries: cookies → refresh-token link → /me.
 */
export async function resolveSpotifyUser(
  options?: ResolveSpotifyUserOptions
): Promise<SpotifyUser | null> {
  const allowWrites = options?.allowSessionWrites ?? false;

  const fromCookies = await readUserFromCookies();
  if (fromCookies) {
    memoryCachedUser = { user: fromCookies, at: Date.now() };
    return fromCookies;
  }

  if (memoryCachedUser && Date.now() - memoryCachedUser.at < MEMORY_CACHE_TTL_MS) {
    return memoryCachedUser.user;
  }

  const fromLink = await resolveFromRefreshTokenLink(allowWrites);
  if (fromLink) return fromLink;

  const accessToken = await getValidAccessToken({ refresh: allowWrites });
  if (!accessToken) return null;

  const onCooldown = !options?.force && Date.now() < meCooldownUntil;
  if (onCooldown) {
    const dev = await devFallbackUser();
    if (dev && allowWrites) {
      await persistSpotifyUserCookies(dev);
      return dev;
    }
    return null;
  }

  if (!inflightMeLookup) {
    inflightMeLookup = fetchMeAndPersist(accessToken, allowWrites, {
      max429Retries: allowWrites ? 1 : 0,
      mayRefreshToken: allowWrites,
    }).finally(() => {
      inflightMeLookup = null;
    });
  }

  const fromMe = await inflightMeLookup;
  if (fromMe) return fromMe;

  const dev = await devFallbackUser();
  if (dev && allowWrites) {
    await persistSpotifyUserCookies(dev);
    return dev;
  }

  return null;
}

/** Force /me + persist profile cookies (login recovery, ratings, profile). */
export async function bootstrapSpotifyUser(): Promise<SpotifyUser | null> {
  meCooldownUntil = 0;
  memoryCachedUser = null;
  inflightMeLookup = null;

  const fromCookies = await readUserFromCookies();
  if (fromCookies) return fromCookies;

  const fromLink = await resolveFromRefreshTokenLink(true);
  if (fromLink) return fromLink;

  const accessToken = await getValidAccessToken({ refresh: true });
  if (!accessToken) return null;

  const fromMe = await fetchMeAndPersist(accessToken, true, {
    max429Retries: 2,
    mayRefreshToken: true,
  });
  if (fromMe) return fromMe;

  const dev = await devFallbackUser();
  if (dev) {
    await persistSpotifyUserCookies(dev);
    return dev;
  }

  return null;
}

export function clearSpotifyUserSessionCache(): void {
  memoryCachedUser = null;
  meCooldownUntil = 0;
  inflightMeLookup = null;
}

/** @deprecated Use resolveSpotifyUser */
export async function getSessionSpotifyUser(): Promise<SpotifyUser | null> {
  return resolveSpotifyUser();
}
