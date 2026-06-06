import { primaryArtistFromArtists } from "@/lib/artist-utils";
import { decryptRefreshToken } from "@/lib/listening-crypto";
import {
  getListeningSyncProfile,
  insertTrackPlays,
  touchListeningLastSynced,
  updateListeningRefreshToken,
  type ListeningSyncProfile,
} from "@/lib/listening-db";
import { refreshAccessToken, spotifyFetch } from "@/lib/spotify";
import type { SpotifyTrack } from "@/types";

interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

interface RecentlyPlayedResponse {
  items: RecentlyPlayedItem[];
  cursors?: { after?: string; before?: string };
}

export class ListeningSyncError extends Error {
  constructor(
    message: string,
    public readonly code: "missing_scope" | "token_invalid" | "unknown"
  ) {
    super(message);
    this.name = "ListeningSyncError";
  }
}

function trackToPlayRow(userId: string, item: RecentlyPlayedItem) {
  const track = item.track;
  return {
    user_id: userId,
    spotify_track_id: track.id,
    played_at: item.played_at,
    track_name: track.name,
    artist_name: primaryArtistFromArtists(track.artists),
    album_art_url: track.album?.images?.[0]?.url ?? null,
  };
}

async function fetchRecentlyPlayedPage(
  accessToken: string,
  before?: string
): Promise<RecentlyPlayedResponse> {
  const params = new URLSearchParams({ limit: "50" });
  if (before) params.set("before", before);

  try {
    return await spotifyFetch<RecentlyPlayedResponse>(
      `/me/player/recently-played?${params.toString()}`,
      accessToken,
      undefined,
      0,
      0
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("(403)")) {
      throw new ListeningSyncError(
        "Missing user-read-recently-played scope — sign out and log in again.",
        "missing_scope"
      );
    }
    if (message.includes("(401)")) {
      throw new ListeningSyncError("Spotify refresh token is invalid.", "token_invalid");
    }
    throw new ListeningSyncError(message, "unknown");
  }
}

export async function syncListeningForProfile(
  profile: ListeningSyncProfile,
  options?: { deep?: boolean }
): Promise<{ inserted: number; pages: number }> {
  if (!profile.listening_sync_enabled || !profile.listening_refresh_token_enc) {
    return { inserted: 0, pages: 0 };
  }

  let refreshToken = decryptRefreshToken(profile.listening_refresh_token_enc);
  const tokens = await refreshAccessToken(refreshToken);
  if (tokens.refresh_token) {
    refreshToken = tokens.refresh_token;
    await updateListeningRefreshToken(profile.user_id, refreshToken);
  }

  const maxPages = options?.deep ? 3 : 1;
  let inserted = 0;
  let pagesFetched = 0;
  let before: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const response = await fetchRecentlyPlayedPage(tokens.access_token, before);
    const items = response.items ?? [];
    if (items.length === 0) break;

    pagesFetched += 1;
    inserted += await insertTrackPlays(items.map((item) => trackToPlayRow(profile.user_id, item)));

    const oldest = items[items.length - 1]?.played_at;
    if (!oldest || page >= maxPages - 1) break;
    before = String(new Date(oldest).getTime());
  }

  await touchListeningLastSynced(profile.user_id);
  return { inserted, pages: pagesFetched };
}

export async function syncListeningForUser(
  userId: string,
  options?: { deep?: boolean }
): Promise<{ inserted: number; pages: number }> {
  const profile = await getListeningSyncProfile(userId);
  if (!profile?.listening_sync_enabled || !profile.listening_refresh_token_enc) {
    return { inserted: 0, pages: 0 };
  }
  return syncListeningForProfile(profile, options);
}

export async function persistListeningRefreshTokenIfEnabled(
  userId: string,
  refreshToken: string
): Promise<void> {
  const profile = await getListeningSyncProfile(userId);
  if (profile?.listening_sync_enabled) {
    await updateListeningRefreshToken(userId, refreshToken);
  }
}

export async function syncAllEnabledListeningUsers(): Promise<{
  users: number;
  inserted: number;
  errors: { userId: string; message: string }[];
}> {
  const { listEnabledListeningProfiles } = await import("@/lib/listening-db");
  const profiles = await listEnabledListeningProfiles();
  let inserted = 0;
  const errors: { userId: string; message: string }[] = [];

  for (const profile of profiles) {
    try {
      const result = await syncListeningForProfile(profile);
      inserted += result.inserted;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      errors.push({ userId: profile.user_id, message });
      console.error("[listening-sync] user failed:", profile.user_id, message);
    }
  }

  return { users: profiles.length, inserted, errors };
}
