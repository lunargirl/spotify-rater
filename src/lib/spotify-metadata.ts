import { getAppAccessToken, spotifyFetch } from "@/lib/spotify";

interface SpotifyTrackDetail {
  album: { release_date: string; id: string };
  artists: { id: string; name: string }[];
}

interface SpotifyArtistDetail {
  id: string;
  genres: string[];
}

interface SpotifyArtistsBatchResponse {
  artists: (SpotifyArtistDetail | null)[];
}

export interface TrackCatalogInfo {
  release_date: string | null;
  artist_ids: string[];
  primary_artist_id: string | null;
  primary_artist_name: string | null;
  album_id: string | null;
}

export interface TrackMetadata {
  release_date: string | null;
  genres: string[];
  spotify_album_id: string | null;
  spotify_artist_ids: string[];
}

const TRACK_URL = (trackId: string) => `/tracks/${trackId}`;
const ARTISTS_BATCH_URL = (ids: string[]) =>
  `/artists?ids=${encodeURIComponent(ids.join(","))}`;

function isRateLimited(message: string): boolean {
  return message.includes("429");
}

function isForbidden(message: string): boolean {
  return message.includes("403");
}

async function fetchArtistGenresBatch(
  ids: string[],
  accessToken: string
): Promise<string[]> {
  const batch = await spotifyFetch<SpotifyArtistsBatchResponse>(
    ARTISTS_BATCH_URL(ids),
    accessToken
  );

  const genreSet = new Set<string>();
  for (const artist of batch.artists ?? []) {
    if (!artist) continue;
    for (const genre of artist.genres ?? []) {
      if (genre) genreSet.add(genre);
    }
  }
  return [...genreSet];
}

/** GET https://api.spotify.com/v1/tracks/{id} — release date + artist IDs only. */
export async function fetchTrackCatalogInfo(
  trackId: string,
  userAccessToken?: string | null
): Promise<TrackCatalogInfo> {
  const token = userAccessToken ?? (await getAppAccessToken());
  const track = await spotifyFetch<SpotifyTrackDetail>(TRACK_URL(trackId), token);

  const primary = track.artists[0];

  return {
    release_date: track.album?.release_date ?? null,
    artist_ids: track.artists.map((artist) => artist.id).filter(Boolean).slice(0, 5),
    primary_artist_id: primary?.id ?? null,
    primary_artist_name: primary?.name?.trim() ?? null,
    album_id: track.album?.id ?? null,
  };
}

/**
 * Artist genres require a user access token on many Spotify apps (app-only token returns 403).
 */
export async function fetchArtistGenres(
  artistIds: string[],
  userAccessToken?: string | null
): Promise<string[]> {
  const ids = [...new Set(artistIds.filter(Boolean))].slice(0, 5);
  if (ids.length === 0) return [];

  if (userAccessToken) {
    try {
      return await fetchArtistGenresBatch(ids, userAccessToken);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (isRateLimited(msg)) {
        return [];
      }
    }
  }

  try {
    return await fetchArtistGenresBatch(ids, await getAppAccessToken());
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (isForbidden(msg) && !userAccessToken) {
      throw new Error(
        "Spotify requires you to be logged in to load artist genres. Sign out and back in, then try again."
      );
    }
    console.warn("[Spotify metadata] Artist genre fetch failed:", msg);
    if (!isRateLimited(msg)) {
      throw error;
    }
  }

  return [];
}

/** Full metadata for a track (catalog + genres). */
export async function fetchTrackMetadata(
  trackId: string,
  userAccessToken?: string | null
): Promise<TrackMetadata> {
  const catalog = await fetchTrackCatalogInfo(trackId, userAccessToken);
  let genres: string[] = [];

  try {
    genres = await fetchArtistGenres(catalog.artist_ids, userAccessToken);
  } catch (error) {
    console.warn("[Spotify metadata] Genre lookup failed:", error);
  }

  return {
    release_date: catalog.release_date,
    genres,
    spotify_album_id: catalog.album_id,
    spotify_artist_ids: catalog.artist_ids,
  };
}
